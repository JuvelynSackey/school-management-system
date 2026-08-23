const {
  mongoose, TerminalReport, Student, Class, Subject, Result, AcademicTerm,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getSchemeForSchool } = require('../services/grading.service');
const aiService = require('../services/ai.service');
const auditLog = require('../services/auditLog.service');

// Same boundary as terminalReports.controller.js's own assertClassAccess
// (each controller keeps its own copy rather than sharing one — the existing
// convention in this codebase, e.g. results.controller.js does the same) —
// a teacher can only request a remark for a report belonging to a class
// they're actually assigned to.
const assertClassAccess = async (req, classId) => {
  if (req.user.role === 'admin') return;
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    if (!classIds.includes(String(classId))) {
      throw new AppError('You are not assigned to this class', 403);
    }
    return;
  }
  throw new AppError('You do not have permission to perform this action', 403);
};

// POST /ai/remarks/suggest { reportId }
//
// Deliberately takes only a reportId, not scores/attendance — every fact fed
// to the model is re-read here from the database under the requester's own
// tenant/role authorization, never trusted from the client. This is the
// "AI -> authorized service -> MongoDB" boundary: the AI call sits behind
// the exact same authorization check as editing the report itself, and never
// gets broader data access than the teacher making the request already has.
const suggestRemark = asyncHandler(async (req, res, next) => {
  const { reportId } = req.body;
  const report = await TerminalReport.findById(reportId);
  if (!report) return next(new AppError('Terminal report not found', 404));

  await assertClassAccess(req, report.classId);

  if (!['Draft', 'Rejected'].includes(report.status)) {
    return next(new AppError('This report is not open for editing', 400));
  }

  const student = await Student.findById(report.studentId);
  if (!student) return next(new AppError('Student not found', 404));

  const classSize = await Student.countDocuments({ classId: report.classId, status: 'active' });
  const attendancePercent = report.outOfAttendance
    ? Math.round((report.totalAttendance / report.outOfAttendance) * 100)
    : null;

  const context = {
    studentFirstName: student.firstName,
    averageScore: report.averageScore,
    classPosition: report.classPosition,
    classSize,
    attendancePercent,
  };

  // "Suggest Remark" should never just dead-end the teacher — if AI isn't
  // configured, or the live AI request itself fails (rate limit,
  // timeout, bad response), fall back to the deterministic score-banded
  // templates instead of surfacing an error.
  let suggestions;
  let fallbackMode = false;
  if (aiService.isAIConfigured()) {
    try {
      suggestions = await aiService.generateRemarkSuggestions(context);
    } catch {
      suggestions = aiService.generateFallbackRemarkSuggestions(context);
      fallbackMode = true;
    }
  } else {
    suggestions = aiService.generateFallbackRemarkSuggestions(context);
    fallbackMode = true;
  }

  await auditLog.record({
    req,
    action: 'ai.remarkSuggested',
    entityType: 'TerminalReport',
    entityId: report.id,
    description: `${fallbackMode ? 'Fallback' : 'AI'} remark suggestions generated for ${student.firstName} ${student.lastName}`,
  });

  res.json({ success: true, data: { suggestions, fallbackMode } });
});

// POST /ai/compose-announcement { objective, tone, targetType, targetClassId }  (admin only)
// targetLabel is resolved server-side from targetType/targetClassId (never
// trusted free text from the client) purely for phrasing context — the AI
// never sees a specific student's name, only "Whole School" / a class name
// / a generic "A Specific Student".
const composeAnnouncement = asyncHandler(async (req, res, next) => {
  const {
    objective, tone, targetType, targetClassId,
  } = req.body;

  let targetLabel = 'Whole School';
  if (targetType === 'class' && targetClassId) {
    const classRow = await Class.findById(targetClassId);
    if (!classRow) return next(new AppError('Class not found', 404));
    targetLabel = `${classRow.name} ${classRow.section || ''}`.trim();
  } else if (targetType === 'student') {
    targetLabel = 'A Specific Student';
  }

  let suggestions;
  let fallbackMode = false;
  if (aiService.isAIConfigured()) {
    try {
      suggestions = await aiService.generateAnnouncementSuggestions({ objective, tone, targetLabel });
    } catch {
      suggestions = aiService.generateFallbackAnnouncementSuggestions({ objective, tone });
      fallbackMode = true;
    }
  } else {
    suggestions = aiService.generateFallbackAnnouncementSuggestions({ objective, tone });
    fallbackMode = true;
  }

  await auditLog.record({
    req, action: 'ai.announcementComposed', entityType: 'Announcement', description: `${fallbackMode ? 'Fallback' : 'AI'} announcement draft generated`,
  });

  res.json({ success: true, data: { suggestions, fallbackMode } });
});

// Result.aggregate() bypasses tenantScopePlugin — schoolId must be matched
// explicitly here, same reasoning as analytics.controller.js's own
// aggregates. "Pass" is defined as scoring at or above the second-lowest
// grade band's minimum — the lowest band is the scheme's fail grade by
// definition (e.g. F9 in the NaCCA default).
const computeSubjectPerformance = async (schoolId, academicTermId) => {
  const scheme = await getSchemeForSchool(schoolId);
  const sortedBands = [...scheme.bands].sort((a, b) => a.min - b.min);
  const passCutoff = sortedBands[1]?.min ?? 0;

  const rows = await Result.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
    {
      $group: {
        _id: '$subjectId',
        average: { $avg: '$totalScore' },
        count: { $sum: 1 },
        passCount: { $sum: { $cond: [{ $gte: ['$totalScore', passCutoff] }, 1, 0] } },
      },
    },
  ]);

  const subjects = await Subject.find({ _id: { $in: rows.map((r) => r._id) } }, { name: 1 });
  const nameById = new Map(subjects.map((s) => [s.id, s.name]));

  return rows.map((r) => ({
    subjectName: nameById.get(r._id.toString()) || 'Unknown subject',
    average: Math.round(r.average * 10) / 10,
    passRate: Math.round((r.passCount / r.count) * 100),
    resultCount: r.count,
  }));
};

// GET /ai/performance-summary?academicTermId=  (admin only)
const performanceSummary = asyncHandler(async (req, res, next) => {
  const { academicTermId } = req.query;
  if (!academicTermId) return next(new AppError('academicTermId is required', 400));
  if (!(await AcademicTerm.findById(academicTermId))) return next(new AppError('Academic term not found', 404));

  const subjectPerf = await computeSubjectPerformance(req.user.schoolId, academicTermId);
  if (subjectPerf.length === 0) {
    return res.json({
      success: true, data: {
        keyStrengths: [], areasForAttention: [], recommendations: [], fallbackMode: false,
      },
    });
  }

  let summary;
  let fallbackMode = false;
  if (aiService.isAIConfigured()) {
    try {
      summary = await aiService.generatePerformanceSummary(subjectPerf);
    } catch {
      summary = aiService.generateFallbackPerformanceSummary(subjectPerf);
      fallbackMode = true;
    }
  } else {
    summary = aiService.generateFallbackPerformanceSummary(subjectPerf);
    fallbackMode = true;
  }

  res.json({ success: true, data: { ...summary, fallbackMode } });
});

module.exports = {
  suggestRemark, composeAnnouncement, performanceSummary,
};
