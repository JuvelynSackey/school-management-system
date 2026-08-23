const { TerminalReport, Student } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
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
  // configured, or the live Gemini request itself fails (rate limit,
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

module.exports = { suggestRemark };
