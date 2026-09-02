const { Result, Student, Subject, AcademicTerm, Teacher, TerminalReport, Class, ResultSheet, User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { computeGradeWithScheme, getSchemeForSchool } = require('../services/grading.service');
const { computeClassScoreFromDetails } = require('../services/result.service');
const anomalyDetection = require('../services/anomalyDetection.service');
const performanceInsights = require('../services/performanceInsights.service');
const aiService = require('../services/ai.service');
const { getTeacherClassIds, isHomeroomTeacher, hasSubjectAssignment } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const { recalculateSubjectPositions, computeAggregatesForStudent, recalculateClassPositions } = require('../services/terminalReports.service');
const { getSchoolAdminEmails } = require('../services/guardianRecipients.service');
const auditLog = require('../services/auditLog.service');
const notifications = require('../services/notifications.service');

const safeDispatch = (args) => notifications.dispatch(args).catch((err) => console.error('[notifications] dispatch failed:', err.message));

// Score entry is subject-scoped, not just class-scoped: a plain subject
// teacher may only act on the exact (classId, subjectId) pairs they're
// assigned to. The class's homeroom teacher gets "Master Entry" instead —
// full access across every subject in their own class, matching how a
// Ghanaian Form Tutor actually operates day to day.
const assertSubjectAccess = async (req, classId, subjectId) => {
  if (req.user.role === 'admin') return;
  if (req.user.role !== 'teacher') {
    throw new AppError('You do not have permission to perform this action', 403);
  }
  if (await isHomeroomTeacher(req.user.id, classId)) return;
  if (await hasSubjectAssignment(req.user.id, classId, subjectId)) return;
  throw new AppError('You are not assigned to teach this subject in this class', 403);
};

// GET /results/roster?classId=&subjectId=&academicTermId=
const getRoster = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId } = req.query;
  if (!classId || !subjectId || !academicTermId) {
    return next(new AppError('classId, subjectId, and academicTermId are required', 400));
  }

  await assertSubjectAccess(req, classId, subjectId);

  const students = await Student.find({ classId, status: 'active' })
    .select('firstName lastName admissionNo')
    .sort({ firstName: 1 });

  const results = await Result.find({ classId, subjectId, academicTermId });
  const byStudent = new Map(results.map((r) => [r.studentId.toString(), r]));

  // Own-history σ stats, batched once for the whole roster — lets the
  // Score Entry screen flag statistical outliers live, per keystroke,
  // with zero further network calls (and so it keeps working offline).
  const statsByStudent = await anomalyDetection.getHistoricalStatsForRoster(
    req.user.schoolId, students.map((s) => s.id), subjectId, academicTermId,
  );

  const roster = students.map((s) => {
    const existing = byStudent.get(s.id);
    const stats = statsByStudent.get(s.id) ?? null;
    return {
      resultId: existing?.id ?? null,
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      admissionNo: s.admissionNo,
      classScore: existing?.classScore ?? '',
      examScore: existing?.examScore ?? '',
      totalScore: existing?.totalScore ?? null,
      grade: existing?.grade ?? null,
      subjectPosition: existing?.subjectPosition ?? null,
      historyMean: stats?.mean ?? null,
      historyStdDev: stats?.stdDev ?? null,
      historyCount: stats?.count ?? 0,
    };
  });

  res.json({ success: true, data: roster });
});

// GET /results/anomalies?classId=&subjectId=&academicTermId=
// Purely advisory (JesManage Intelligence, Stage 6 Phase 2): surfaces
// "worth a second look" flags for the admin's sheet-review screen. Deliberately
// separate from getRoster so a teacher's routine roster load never pays for
// this extra computation — it only runs when an admin actually opens Review.
// Never blocks recordBulk or approve; a flag is a badge, not a gate.
const getAnomalies = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId } = req.query;
  if (!classId || !subjectId || !academicTermId) {
    return next(new AppError('classId, subjectId, and academicTermId are required', 400));
  }
  await assertSubjectAccess(req, classId, subjectId);

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const flags = await anomalyDetection.detectAnomalies({
    schoolId: req.user.schoolId, classId, subjectId, academicTermId, scheme,
  });

  let aiSummary = null;
  if (flags.length > 0 && aiService.isAIConfigured()) {
    try {
      aiSummary = await aiService.generateAnomalySummary(flags);
    } catch {
      aiSummary = null; // enrichment only — the deterministic flags below still stand on their own
    }
  }

  res.json({ success: true, data: { flags, aiSummary } });
});

// POST /results/bulk { classId, subjectId, academicTermId, records: [{studentId, classScore, examScore, remarks}] }
const recordBulk = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId, records } = req.body;
  if (!classId || !subjectId || !academicTermId || !Array.isArray(records)) {
    return next(new AppError('classId, subjectId, academicTermId, and records are required', 400));
  }
  const classDoc = await Class.findById(classId);
  if (!classDoc) return next(new AppError('Class not found', 400));
  const subjectDoc = await Subject.findById(subjectId);
  if (!subjectDoc) return next(new AppError('Subject not found', 400));

  await assertSubjectAccess(req, classId, subjectId);

  const sheet = await ResultSheet.findOne({ classId, subjectId, academicTermId });
  if (sheet && (sheet.status === 'Submitted' || sheet.status === 'Approved')) {
    return next(new AppError('This subject\'s scores are submitted for review and can no longer be edited. Ask an admin to reject or reopen before editing.', 400, undefined, 'RESULT_LOCKED'));
  }

  const studentIds = records.map((r) => r.studentId);
  const lockedCount = await TerminalReport.countDocuments({
    studentId: { $in: studentIds }, academicTermId, status: { $in: ['Locked', 'Published'] },
  });
  if (lockedCount > 0) {
    return next(new AppError('One or more students\' terminal reports are locked for this term. Ask an admin to unlock before editing scores.', 400, undefined, 'RESULT_LOCKED'));
  }

  const teacher = req.user.role === 'teacher' ? await Teacher.findOne({ userId: req.user.id }) : null;
  const scheme = await getSchemeForSchool(req.user.schoolId);

  // When decomposition is on, a record's classScoreDetails (per-component
  // marks) is authoritative and classScore is derived from it -- a raw
  // classScore sent alongside is ignored rather than trusted, so a stale
  // client can never desync the two. A record with no classScoreDetails
  // (decomposition on, but this particular row wasn't broken out) falls
  // back to its own raw classScore untouched.
  let resolvedRecords;
  try {
    resolvedRecords = records.map((r) => {
      if (r.classScoreDetails && !scheme.classScoreConfig?.enabled) {
        throw new Error('classScoreDetails was provided, but this school does not have class score decomposition enabled');
      }
      const classScore = (scheme.classScoreConfig?.enabled && r.classScoreDetails)
        ? computeClassScoreFromDetails(r.classScoreDetails, scheme.classScoreConfig.components)
        : Number(r.classScore);
      return { ...r, classScore };
    });
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  const outOfRange = resolvedRecords.find((r) => r.classScore > scheme.classScoreMax || Number(r.examScore) > scheme.examScoreMax);
  if (outOfRange) {
    return next(new AppError(`Class score cannot exceed ${scheme.classScoreMax} and exam score cannot exceed ${scheme.examScoreMax}`, 400));
  }

  await Promise.all(resolvedRecords.map((r) => {
    const hasDetails = scheme.classScoreConfig?.enabled && r.classScoreDetails;
    const update = {
      $set: {
        studentId: r.studentId,
        subjectId,
        classId,
        academicTermId,
        classScore: r.classScore,
        examScore: r.examScore,
        totalScore: Number(r.classScore) + Number(r.examScore),
        grade: computeGradeWithScheme(r.classScore, r.examScore, scheme),
        remarks: r.remarks || null,
        recordedBy: teacher?.id || null,
      },
    };
    // classScoreDetails is $unset rather than $set-to-undefined when not
    // applicable -- Mongo silently ignores an undefined value inside $set,
    // which would leave a stale Map behind if decomposition gets toggled
    // off for a row that previously had one.
    if (hasDetails) update.$set.classScoreDetails = r.classScoreDetails;
    else update.$unset = { classScoreDetails: '' };
    return Result.findOneAndUpdate({ studentId: r.studentId, subjectId, academicTermId }, update, { upsert: true });
  }));

  await recalculateSubjectPositions(classId, subjectId, academicTermId);

  await auditLog.record({
    req,
    action: 'result.recordBulk',
    entityType: 'Result',
    description: `Recorded ${records.length} score(s) for ${classDoc.name} ${classDoc.section || ''} — ${subjectDoc.name}`.trim(),
    metadata: { classId, subjectId, academicTermId, count: records.length },
  });

  const results = await Result.find({ classId, subjectId, academicTermId });
  res.json({ success: true, data: results });
});

// POST /results/report-conflict { classId, subjectId, academicTermId, message }
// The teacher-side counterpart to admin's amendResult: a queued offline
// write that was rejected as RESULT_LOCKED (the sheet/report moved on while
// they were offline) can't be silently retried or discarded into nothing —
// this escalates it to the school's admins instead, same notification path
// already used for resultSheet.submit.
const reportConflict = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId, message } = req.body;
  if (!classId || !subjectId || !academicTermId) {
    return next(new AppError('classId, subjectId, and academicTermId are required', 400));
  }
  const [classDoc, subjectDoc] = await Promise.all([
    Class.findById(classId),
    Subject.findById(subjectId),
  ]);
  const description = `${classDoc ? `${classDoc.name} ${classDoc.section || ''}`.trim() : 'Unknown class'} — ${subjectDoc?.name || 'Unknown subject'}`;

  await auditLog.record({
    req,
    action: 'result.conflictReported',
    entityType: 'ResultSheet',
    description: `Offline sync conflict reported for ${description}: ${message || 'no details given'}`,
    metadata: { classId, subjectId, academicTermId, message },
  });

  const adminRecipients = await getSchoolAdminEmails(req.user.schoolId);
  if (adminRecipients.length) {
    const actor = await User.findById(req.user.id).select('fullName');
    safeDispatch({
      channel: 'email',
      message: `${actor?.fullName || 'A teacher'} hit an offline sync conflict for ${description}: ${message || 'their offline changes could not be applied because the result had already moved on.'}`,
      recipients: adminRecipients,
    });
  }

  res.json({ success: true, data: null });
});

// POST /results/:id/amend { classScore, examScore, reason }  (admin only)
// A single-row correction for after a ResultSheet is already Approved,
// without a full resultSheets.controller.js reopen() back to Draft. Does
// NOT force the ResultSheet/TerminalReport status backward — an amendment
// is a correction, not a re-review request, so if the report is already
// Published the fix still applies immediately (a silently-stale published
// PDF would be worse than a live correction outside the review flow).
const amendResult = asyncHandler(async (req, res, next) => {
  const result = await Result.findById(req.params.id);
  if (!result) return next(new AppError('Result not found', 404));

  const { classScore, examScore, reason } = req.body;
  if (!reason || !reason.trim()) return next(new AppError('A reason is required to amend a result', 400));

  const sheet = await ResultSheet.findOne({ classId: result.classId, subjectId: result.subjectId, academicTermId: result.academicTermId });
  if (!sheet || sheet.status !== 'Approved') {
    return next(new AppError('Only results belonging to an approved sheet can be amended. Use the normal edit flow otherwise.', 400));
  }

  const scheme = await getSchemeForSchool(req.user.schoolId);
  if (Number(classScore) > scheme.classScoreMax || Number(examScore) > scheme.examScoreMax) {
    return next(new AppError(`Class score cannot exceed ${scheme.classScoreMax} and exam score cannot exceed ${scheme.examScoreMax}`, 400));
  }

  const before = {
    classScore: result.classScore, examScore: result.examScore, totalScore: result.totalScore, grade: result.grade,
  };

  result.classScore = classScore;
  result.examScore = examScore;
  result.totalScore = Number(classScore) + Number(examScore);
  result.grade = computeGradeWithScheme(classScore, examScore, scheme);
  await result.save();

  const after = {
    classScore: result.classScore, examScore: result.examScore, totalScore: result.totalScore, grade: result.grade,
  };

  await recalculateSubjectPositions(result.classId, result.subjectId, result.academicTermId);
  const aggregates = await computeAggregatesForStudent(result.studentId, result.classId, result.academicTermId);
  await TerminalReport.findOneAndUpdate(
    { studentId: result.studentId, academicTermId: result.academicTermId },
    { $set: aggregates },
  );
  await recalculateClassPositions(result.classId, result.academicTermId);

  const [student, subject] = await Promise.all([
    Student.findById(result.studentId),
    Subject.findById(result.subjectId),
  ]);
  await auditLog.record({
    req,
    action: 'result.amend',
    entityType: 'Result',
    entityId: result.id,
    description: `Amended ${subject?.name || 'a subject'} score for ${student ? `${student.firstName} ${student.lastName}` : 'a student'}: ${reason}`,
    metadata: {
      before, after, reason, studentId: result.studentId, subjectId: result.subjectId, classId: result.classId, academicTermId: result.academicTermId,
    },
  });

  res.json({ success: true, data: result });
});

const populateForHistory = (query) => query
  .populate('subject', 'name')
  .populate('academicTerm', 'name startDate');

// A student's own history is visible to: themselves, a parent linked to
// them, a teacher whose currently-assigned classes include the student's
// CURRENT class (the same simplification getForStudent has always used —
// it doesn't re-derive which class the student was in for each historical
// term), or any admin. Shared by getForStudent and getInsights since
// insights are built from exactly the same underlying history.
const assertStudentAccess = async (req, student) => {
  if (req.user.role === 'student' && student.userId.toString() !== req.user.id) {
    throw new AppError('You do not have permission to view this record', 403);
  }
  if (req.user.role === 'teacher') {
    const { classIds } = await getTeacherClassIds(req.user.id);
    if (!classIds.includes(student.classId?.toString())) {
      throw new AppError('You do not have permission to view this record', 403);
    }
  }
  if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentIds.includes(student.id)) {
      throw new AppError('You do not have permission to view this record', 403);
    }
  }
};

// Students/parents only ever see a subject's scores once that subject's
// ResultSheet has been Approved — admin/teacher see everything, including
// in-progress drafts, since they need it for review and management.
const filterToApprovedOnly = async (results) => {
  if (results.length === 0) return results;
  const sheets = await ResultSheet.find({
    $or: results.map((r) => ({ classId: r.classId, subjectId: r.subjectId, academicTermId: r.academicTermId })),
  });
  const approvedKeys = new Set(
    sheets
      .filter((s) => s.status === 'Approved')
      .map((s) => `${s.classId}:${s.subjectId}:${s.academicTermId}`),
  );
  return results.filter((r) => approvedKeys.has(`${r.classId}:${r.subjectId}:${r.academicTermId}`));
};

// GET /results/student/:studentId
const getForStudent = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) return next(new AppError('Student not found', 404));

  try {
    await assertStudentAccess(req, student);
  } catch (err) {
    return next(err);
  }

  let results = await populateForHistory(Result.find({ studentId })).sort({ createdAt: -1 });
  if (req.user.role === 'student' || req.user.role === 'parent') {
    results = await filterToApprovedOnly(results);
  }

  res.json({ success: true, data: results });
});

// GET /results/me
const getMyResults = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) return next(new AppError('Student profile not found', 404));

  let results = await populateForHistory(Result.find({ studentId: student.id })).sort({ createdAt: -1 });
  results = await filterToApprovedOnly(results);

  res.json({ success: true, data: results });
});

// GET /results/insights/:studentId
// JesManage Intelligence, Stage 6 Phase 3: built from exactly the same
// approved-results history getForStudent already returns — a deterministic
// multi-term trend plus this term's strongest/needs-attention subjects,
// with an optional 2-3 sentence AI narrative layered on top when configured.
// Same ownership boundary as getForStudent, since it's the same data.
const getInsights = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) return next(new AppError('Student not found', 404));

  try {
    await assertStudentAccess(req, student);
  } catch (err) {
    return next(err);
  }

  let results = await populateForHistory(Result.find({ studentId }));
  if (req.user.role === 'student' || req.user.role === 'parent') {
    results = await filterToApprovedOnly(results);
  }

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const insights = performanceInsights.computeInsights({ results, scheme });

  let aiNarrative = null;
  const hasEnoughData = insights.trend.termsCompared > 0
    || insights.strongestSubjects.length > 0
    || insights.needsAttentionSubjects.length > 0;
  if (hasEnoughData && aiService.isAIConfigured()) {
    try {
      aiNarrative = await aiService.generatePerformanceNarrative({
        studentFirstName: student.firstName,
        trend: insights.trend,
        strongestSubjects: insights.strongestSubjects.map((s) => s.subjectName),
        needsAttentionSubjects: insights.needsAttentionSubjects.map((s) => s.subjectName),
      });
    } catch {
      aiNarrative = null; // enrichment only — the deterministic summary below still stands on its own
    }
  }

  res.json({ success: true, data: { ...insights, aiNarrative } });
});

// GET /results/academic-history/:studentId — term-over-term overall average
// plus a per-subject score progression, for the Academic Progress History
// card on StudentProfile. Same ownership boundary and approved-only
// filtering as getInsights, since it's built from the same history.
const getAcademicHistory = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) return next(new AppError('Student not found', 404));

  try {
    await assertStudentAccess(req, student);
  } catch (err) {
    return next(err);
  }

  let results = await populateForHistory(Result.find({ studentId }));
  if (req.user.role === 'student' || req.user.role === 'parent') {
    results = await filterToApprovedOnly(results);
  }

  // Class-position history follows the same publish boundary as the report
  // card itself — a position only appears here once a student/parent could
  // also see it on their published report card, never a Draft/Submitted one.
  let terminalReports = await TerminalReport.find({ studentId }).populate('academicTerm', 'name startDate');
  if (req.user.role === 'student' || req.user.role === 'parent') {
    terminalReports = terminalReports.filter((tr) => tr.status === 'Published');
  }

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const history = performanceInsights.computeAcademicHistory({ results, scheme, terminalReports });

  res.json({ success: true, data: history });
});

module.exports = {
  getRoster, getAnomalies, recordBulk, amendResult, reportConflict, getForStudent, getMyResults, getInsights, getAcademicHistory,
};
