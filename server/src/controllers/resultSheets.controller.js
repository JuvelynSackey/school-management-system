const {
  ResultSheet, ClassSubject, Student, Result, Teacher, User, Class, AcademicTerm,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { findOrCreate } = require('../utils/findOrCreate');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { getSchoolAdminEmails } = require('../services/guardianRecipients.service');
const auditLog = require('../services/auditLog.service');
const notifications = require('../services/notifications.service');

// Notification failures must never fail the underlying status-change
// response — dispatch() already swallows per-recipient send errors, this is
// just a belt-and-suspenders guard around the whole call.
const safeDispatch = (args) => notifications.dispatch(args).catch((err) => console.error('[notifications] dispatch failed:', err.message));

const getSheetSubmitterEmail = async (sheet) => {
  if (!sheet.submittedBy) return null;
  const teacher = await Teacher.findById(sheet.submittedBy);
  if (!teacher) return null;
  const user = await User.findById(teacher.userId);
  return user?.email || null;
};

const describeSheet = async (sheet) => {
  const populated = await ResultSheet.findById(sheet.id).populate('classId', 'name section').populate('subjectId', 'name');
  const cls = populated?.classId;
  const subject = populated?.subjectId;
  return `${cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Unknown class'} — ${subject?.name || 'Unknown subject'}`;
};

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

// GET /result-sheets?classId=&academicTermId= — status of every subject
// assigned to the class, lazily creating any sheet that doesn't exist yet.
const list = asyncHandler(async (req, res) => {
  const { classId, academicTermId } = req.query;
  await assertClassAccess(req, classId);

  const classSubjects = await ClassSubject.find({ classId }).populate('subject', 'name');

  const sheets = await Promise.all(classSubjects.map(async (cs) => {
    const [sheet] = await findOrCreate(ResultSheet, {
      where: { classId, subjectId: cs.subjectId, academicTermId },
      defaults: { status: 'Draft' },
    });
    return { ...sheet.toJSON(), subjectName: cs.subject?.name || null };
  }));

  res.json({ success: true, data: sheets });
});

const MATRIX_STATUS_BY_SHEET_STATUS = {
  Draft: 'draft', Submitted: 'submitted', Rejected: 'rejected', Approved: 'approved',
};

// GET /result-sheets/matrix?academicTermId= — a whole-school Classes x
// Subjects grid, admin-only. Deliberately read-only, unlike list() above:
// list() lazily creates a Draft ResultSheet the first time a single
// class/subject/term is viewed, which is fine for one class at a time, but
// doing that for every class-subject pair in the school on every matrix
// view would silently write a lot of empty documents just from someone
// glancing at an overview. A pair with no ResultSheet yet is reported as
// 'not_started' (or 'draft' if scores already exist but nobody has opened
// the review tab yet) without persisting anything.
const getMatrix = asyncHandler(async (req, res, next) => {
  let { academicTermId } = req.query;
  if (!academicTermId) {
    const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
    if (!currentTerm) return next(new AppError('No current academic term is set for this school', 400));
    academicTermId = currentTerm.id;
  }

  const classes = await Class.find({}).select('name section levelOrder').sort({ levelOrder: 1, name: 1 });
  const classIds = classes.map((c) => c.id);

  const classSubjects = await ClassSubject.find({ classId: { $in: classIds } }).populate('subject', 'name');
  const subjectNameById = new Map();
  const pairs = [];
  classSubjects.forEach((cs) => {
    if (!cs.subject) return;
    subjectNameById.set(cs.subjectId.toString(), cs.subject.name);
    pairs.push({ classId: cs.classId.toString(), subjectId: cs.subjectId.toString() });
  });
  const subjects = [...subjectNameById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sheets = await ResultSheet.find({ classId: { $in: classIds }, academicTermId }).select('classId subjectId status');
  const sheetByPair = new Map(sheets.map((s) => [`${s.classId}:${s.subjectId}`, s.status]));

  const results = await Result.find({ classId: { $in: classIds }, academicTermId }).select('classId subjectId');
  const hasResultsForPair = new Set(results.map((r) => `${r.classId}:${r.subjectId}`));

  const cells = pairs.map(({ classId, subjectId }) => {
    const key = `${classId}:${subjectId}`;
    const sheetStatus = sheetByPair.get(key);
    const status = sheetStatus
      ? (MATRIX_STATUS_BY_SHEET_STATUS[sheetStatus] || 'draft')
      : (hasResultsForPair.has(key) ? 'draft' : 'not_started');
    return { classId, subjectId, status };
  });

  res.json({
    success: true,
    data: {
      classes: classes.map((c) => ({ id: c.id, name: c.name, section: c.section })),
      subjects,
      cells,
    },
  });
});

const findSheetOr404 = async (id, next) => {
  const sheet = await ResultSheet.findById(id);
  if (!sheet) {
    next(new AppError('Result sheet not found', 404));
    return null;
  }
  return sheet;
};

// Core "mark this sheet's scores done" logic, shared by the single-sheet
// submit action and the class-wide submitAll bulk action. Throws AppError
// on any precondition failure — callers decide whether that aborts the
// whole request (single submit) or is just skipped (bulk submit).
const submitSheet = async (req, sheet) => {
  await assertClassAccess(req, sheet.classId);
  if (!['Draft', 'Rejected'].includes(sheet.status)) {
    throw new AppError('Only draft or rejected sheets can be submitted', 400);
  }

  const students = await Student.find({ classId: sheet.classId, status: 'active' });
  const results = await Result.find({
    classId: sheet.classId, subjectId: sheet.subjectId, academicTermId: sheet.academicTermId,
  });
  const byStudent = new Map(results.map((r) => [r.studentId.toString(), r]));
  const missing = students.filter((s) => {
    const r = byStudent.get(s.id);
    return !r || r.classScore === null || r.classScore === undefined || r.examScore === null || r.examScore === undefined;
  });
  if (missing.length > 0) {
    throw new AppError(`Scores are missing for: ${missing.map((s) => `${s.firstName} ${s.lastName}`).join(', ')}`, 400);
  }

  const teacher = req.user.role === 'teacher' ? await Teacher.findOne({ userId: req.user.id }) : null;
  sheet.status = 'Submitted';
  sheet.submittedBy = teacher?.id || sheet.submittedBy;
  sheet.submittedAt = new Date();
  await sheet.save();
  const sheetDescription = await describeSheet(sheet);
  await auditLog.record({
    req, action: 'resultSheet.submit', entityType: 'ResultSheet', entityId: sheet.id, description: `Submitted result sheet for review: ${sheetDescription}`,
  });

  const adminRecipients = await getSchoolAdminEmails(req.user.schoolId);
  if (adminRecipients.length) {
    safeDispatch({ channel: 'email', message: `${sheetDescription} has been submitted for your review.`, recipients: adminRecipients });
  }

  return sheet;
};

// POST /result-sheets/:id/submit — teacher marks their subject's scores done
const submit = asyncHandler(async (req, res, next) => {
  const sheet = await findSheetOr404(req.params.id, next);
  if (!sheet) return;
  const submitted = await submitSheet(req, sheet);
  res.json({ success: true, data: submitted });
});

// POST /result-sheets/submit-all { classId, academicTermId } — admin
// convenience action: submits every Draft/Rejected sheet in the class that
// has complete scores, and reports which ones were skipped and why (missing
// scores are the only realistic skip reason, since status is filtered
// upfront) rather than failing the whole batch on the first incomplete subject.
const submitAll = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.body;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const classSubjects = await ClassSubject.find({ classId }).populate('subject', 'name');
  const sheets = await Promise.all(classSubjects.map(async (cs) => {
    const [sheet] = await findOrCreate(ResultSheet, {
      where: { classId, subjectId: cs.subjectId, academicTermId },
      defaults: { status: 'Draft' },
    });
    return { sheet, subjectName: cs.subject?.name || 'Unknown subject' };
  }));

  const eligible = sheets.filter(({ sheet }) => ['Draft', 'Rejected'].includes(sheet.status));
  const submitted = [];
  const skipped = [];
  // Sequential, not Promise.all — submitSheet does its own read-then-write
  // per sheet, and these all touch the same class's Student/Result rows.
  for (const { sheet, subjectName } of eligible) {
    try {
      await submitSheet(req, sheet);
      submitted.push(subjectName);
    } catch (err) {
      skipped.push({ subjectName, reason: err.message });
    }
  }

  res.json({ success: true, data: { submitted: submitted.length, skipped } });
});

// POST /result-sheets/:id/approve — admin
const approve = asyncHandler(async (req, res, next) => {
  const sheet = await findSheetOr404(req.params.id, next);
  if (!sheet) return;
  if (sheet.status !== 'Submitted') {
    return next(new AppError('Only submitted sheets can be approved', 400));
  }
  sheet.status = 'Approved';
  sheet.reviewedBy = req.user.id;
  sheet.reviewedAt = new Date();
  sheet.rejectionReason = null;
  await sheet.save();
  await auditLog.record({
    req, action: 'resultSheet.approve', entityType: 'ResultSheet', entityId: sheet.id, description: `Approved result sheet: ${await describeSheet(sheet)}`,
  });
  res.json({ success: true, data: sheet });
});

// POST /result-sheets/:id/reject { rejectionReason } — admin
const reject = asyncHandler(async (req, res, next) => {
  const sheet = await findSheetOr404(req.params.id, next);
  if (!sheet) return;
  if (sheet.status !== 'Submitted') {
    return next(new AppError('Only submitted sheets can be rejected', 400));
  }
  sheet.status = 'Rejected';
  sheet.reviewedBy = req.user.id;
  sheet.reviewedAt = new Date();
  sheet.rejectionReason = req.body.rejectionReason;
  await sheet.save();
  const sheetDescription = await describeSheet(sheet);
  await auditLog.record({
    req,
    action: 'resultSheet.reject',
    entityType: 'ResultSheet',
    entityId: sheet.id,
    description: `Rejected result sheet: ${sheetDescription} — ${sheet.rejectionReason}`,
  });

  const submitterEmail = await getSheetSubmitterEmail(sheet);
  if (submitterEmail) {
    safeDispatch({
      channel: 'email',
      message: `${sheetDescription} was rejected: ${sheet.rejectionReason}`,
      recipients: [{ email: submitterEmail }],
    });
  }

  res.json({ success: true, data: sheet });
});

// POST /result-sheets/:id/reopen — admin, undoes an Approved sheet back to Draft
const reopen = asyncHandler(async (req, res, next) => {
  const sheet = await findSheetOr404(req.params.id, next);
  if (!sheet) return;
  if (sheet.status !== 'Approved') {
    return next(new AppError('Only approved sheets can be reopened', 400));
  }
  sheet.status = 'Draft';
  await sheet.save();
  await auditLog.record({
    req, action: 'resultSheet.reopen', entityType: 'ResultSheet', entityId: sheet.id, description: `Reopened result sheet: ${await describeSheet(sheet)}`,
  });
  res.json({ success: true, data: sheet });
});

module.exports = {
  list, getMatrix, submit, submitAll, approve, reject, reopen,
};
