const { TerminalReport, Student, Class, AcademicTerm, Result, ClassSubject, ResultSheet, SchoolSettings, School, PersonalAttribute } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds, isHomeroomTeacher } = require('../services/teacherScope.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const { findOrCreate } = require('../utils/findOrCreate');
const { computeAggregatesForStudent, recalculateClassPositions } = require('../services/terminalReports.service');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildReportCardsPdfHtml } = require('../services/reportCardTemplate.service');
const { buildVerificationQrDataUrl } = require('../services/verification.service');
const { getOutstandingBalanceForStudentTerm } = require('../services/fees.service');
const { getSchemeForSchool } = require('../services/grading.service');
const { getClassTeacherRecipient, getStudentAndGuardianRecipients } = require('../services/guardianRecipients.service');
const { RATING_SCALE } = require('../services/personalAttributes.service');
const auditLog = require('../services/auditLog.service');
const notifications = require('../services/notifications.service');
const { PDFDocument } = require('pdf-lib');
const archiver = require('archiver');

// Validates { attributeId, rating } pairs against the fixed rating scale and
// the school's currently-active attribute list, or throws AppError.
const validateAttributeRatings = async (ratings) => {
  if (!Array.isArray(ratings) || ratings.length === 0) return [];
  const invalidRating = ratings.find((r) => !RATING_SCALE.includes(r.rating));
  if (invalidRating) throw new AppError(`Invalid rating "${invalidRating.rating}"`, 400);

  const activeIds = new Set((await PersonalAttribute.find({ isActive: true }, { _id: 1 })).map((a) => a.id));
  const unknownAttribute = ratings.find((r) => !activeIds.has(r.attributeId));
  if (unknownAttribute) throw new AppError('One or more attributes are not recognized or are inactive', 400);

  return ratings.map((r) => ({ attributeId: r.attributeId, rating: r.rating }));
};

// Notification failures must never fail the underlying status-change
// response — dispatch() already swallows per-recipient send errors, this is
// just a belt-and-suspenders guard around the whole call.
const safeDispatch = (args) => notifications.dispatch(args).catch((err) => console.error('[notifications] dispatch failed:', err.message));

const describeReport = async (report) => {
  const populated = await TerminalReport.findById(report.id).populate('student', 'firstName lastName');
  const student = populated?.student;
  return student ? `${student.firstName} ${student.lastName}` : 'Unknown student';
};

// A headteacher signature name typed manually into a lock request always
// wins; only when the caller leaves it blank do we fall back to the
// school's configured default (SchoolSettings.headteacherName) instead of
// silently locking with nothing.
const getDefaultHeadteacherName = async (schoolId) => {
  const settings = await SchoolSettings.findOne({ schoolId });
  return settings?.headteacherName || '';
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

// Teacher's remark + personal-attribute ratings are a homeroom-teacher
// action, not a per-subject one -- any subject teacher assigned to the
// class can still view/generate/list reports (assertClassAccess above),
// just not submit these.
const assertHomeroomAccess = async (req, classId) => {
  if (req.user.role === 'admin') return;
  if (req.user.role === 'teacher' && await isHomeroomTeacher(req.user.id, classId)) return;
  throw new AppError('Only the class\'s homeroom teacher or an admin can submit remarks and personal attribute ratings', 403);
};

// POST /terminal-reports/generate { classId, academicTermId }
const generate = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.body;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const students = await Student.find({ classId, status: 'active' });

  await Promise.all(students.map(async (student) => {
    const aggregates = await computeAggregatesForStudent(student.id, classId, academicTermId);
    const [report] = await findOrCreate(TerminalReport, {
      where: { studentId: student.id, academicTermId },
      defaults: { classId, ...aggregates, status: 'Draft' },
    });
    if (report.status !== 'Locked') {
      Object.assign(report, { classId, ...aggregates });
      await report.save();
    }
  }));

  await recalculateClassPositions(classId, academicTermId);

  res.json({ success: true, data: { generated: students.length } });
});

// GET /terminal-reports?classId=&academicTermId=
const list = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.query;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const classRow = await Class.findById(classId, { showPositions: 1 });
  if (!classRow) return next(new AppError('Class not found', 404));

  const reports = await TerminalReport.find({ classId, academicTermId })
    .populate('student', 'firstName lastName admissionNo category programme')
    .sort({ classPosition: 1 });
  const data = classRow.showPositions === false
    ? reports.map((r) => Object.assign(r.toJSON(), { classPosition: null }))
    : reports;
  res.json({ success: true, data });
});

const findReportOr404 = async (id, next) => {
  const report = await TerminalReport.findById(id);
  if (!report) {
    next(new AppError('Terminal report not found', 404));
    return null;
  }
  return report;
};

// Every subject assigned to the class must have an Approved ResultSheet
// before that class's terminal reports can be submitted or locked.
const assertAllSubjectsApproved = async (classId, academicTermId, next) => {
  const [required, approved] = await Promise.all([
    ClassSubject.countDocuments({ classId }),
    ResultSheet.countDocuments({ classId, academicTermId, status: 'Approved' }),
  ]);
  if (approved < required) {
    next(new AppError(`${approved} of ${required} subjects have been approved for this class. All subjects must be approved first.`, 400));
    return false;
  }
  return true;
};

// POST /terminal-reports/:id/submit { teacherRemark, teacherSignatureName }
const submit = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  await assertHomeroomAccess(req, report.classId);
  if (!['Draft', 'Rejected'].includes(report.status)) {
    return next(new AppError('Only draft or rejected reports can be submitted', 400));
  }
  if (!(await assertAllSubjectsApproved(report.classId, report.academicTermId, next))) return;

  const { teacherRemark, teacherSignatureName, personalAttributeRatings } = req.body;
  report.teacherRemark = teacherRemark || null;
  report.teacherSignatureName = teacherSignatureName || req.user.fullName || null;
  if (personalAttributeRatings !== undefined) {
    report.personalAttributeRatings = await validateAttributeRatings(personalAttributeRatings);
  }
  report.status = 'Submitted';
  await report.save();
  await auditLog.record({
    req, action: 'terminalReport.submit', entityType: 'TerminalReport', entityId: report.id, description: `Submitted terminal report: ${await describeReport(report)}`,
  });
  res.json({ success: true, data: report });
});

// Core "finalize this report" logic, shared by the single-report lock
// action and the class-wide lockAll bulk action. Does NOT check
// assertAllSubjectsApproved itself — since that's a class/term-wide fact,
// callers check it once rather than repeating the same query per report.
const lockReport = async (req, report, { headteacherRemark, headteacherSignatureName, personalAttributeRatings }) => {
  if (report.status !== 'Submitted') {
    throw new AppError('Only submitted reports can be locked', 400);
  }
  const aggregates = await computeAggregatesForStudent(report.studentId, report.classId, report.academicTermId);
  Object.assign(report, aggregates, {
    headteacherRemark: headteacherRemark || null,
    headteacherSignatureName: headteacherSignatureName || null,
    status: 'Locked',
  });
  if (personalAttributeRatings !== undefined) {
    report.personalAttributeRatings = await validateAttributeRatings(personalAttributeRatings);
  }
  await report.save();
  await auditLog.record({
    req, action: 'terminalReport.lock', entityType: 'TerminalReport', entityId: report.id, description: `Locked terminal report: ${await describeReport(report)}`,
  });
  return report;
};

// POST /terminal-reports/:id/lock { headteacherRemark, headteacherSignatureName }  (admin only)
const lock = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  if (!(await assertAllSubjectsApproved(report.classId, report.academicTermId, next))) return;

  const headteacherSignatureName = req.body.headteacherSignatureName?.trim()
    || (await getDefaultHeadteacherName(req.user.schoolId));
  if (!headteacherSignatureName) {
    return next(new AppError('Headteacher signature name is required to lock a report', 400));
  }

  await lockReport(req, report, { ...req.body, headteacherSignatureName });
  await recalculateClassPositions(report.classId, report.academicTermId);

  res.json({ success: true, data: report });
});

// POST /terminal-reports/lock-all { classId, academicTermId, headteacherRemark, headteacherSignatureName }  (admin only)
// Locks every Submitted report in the class/term with one shared
// headteacher remark/signature, skipping (not failing the batch on) any
// report that isn't Submitted.
const lockAll = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId, headteacherRemark } = req.body;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));

  const headteacherSignatureName = req.body.headteacherSignatureName?.trim()
    || (await getDefaultHeadteacherName(req.user.schoolId));
  if (!headteacherSignatureName) return next(new AppError('Headteacher signature name is required to lock reports', 400));
  if (!(await assertAllSubjectsApproved(classId, academicTermId, next))) return;

  const reports = await TerminalReport.find({ classId, academicTermId, status: 'Submitted' })
    .populate('student', 'firstName lastName');
  let locked = 0;
  for (const report of reports) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await lockReport(req, report, { headteacherRemark, headteacherSignatureName });
      locked += 1;
    } catch (err) {
      console.error(`[terminalReports.lockAll] failed to lock report ${report.id}:`, err.message);
    }
  }
  if (locked > 0) {
    await recalculateClassPositions(classId, academicTermId);
  }

  res.json({ success: true, data: { locked } });
});

// POST /terminal-reports/:id/reject { rejectionReason }  (admin only)
const reject = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  if (report.status !== 'Submitted') {
    return next(new AppError('Only submitted reports can be rejected', 400));
  }
  report.status = 'Rejected';
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();
  report.rejectionReason = req.body.rejectionReason;
  await report.save();
  const description = await describeReport(report);
  await auditLog.record({
    req,
    action: 'terminalReport.reject',
    entityType: 'TerminalReport',
    entityId: report.id,
    description: `Rejected terminal report: ${description} — ${report.rejectionReason}`,
  });

  const teacherRecipients = await getClassTeacherRecipient(report.classId);
  if (teacherRecipients.length) {
    safeDispatch({
      channel: 'email',
      message: `${description}'s terminal report was rejected: ${report.rejectionReason}`,
      recipients: teacherRecipients,
    });
  }

  res.json({ success: true, data: report });
});

// POST /terminal-reports/:id/unlock  (admin only)
const unlock = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  if (report.status !== 'Locked') {
    return next(new AppError('Only locked reports can be unlocked', 400));
  }
  report.status = 'Submitted';
  await report.save();
  await auditLog.record({
    req, action: 'terminalReport.unlock', entityType: 'TerminalReport', entityId: report.id, description: `Unlocked terminal report: ${await describeReport(report)}`,
  });
  res.json({ success: true, data: report });
});

// POST /terminal-reports/:id/publish  (admin only) — releases a Locked report for the family to view/download in-app
const publish = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  if (report.status !== 'Locked') return next(new AppError('Only locked reports can be published', 400));
  report.status = 'Published';
  await report.save();
  const description = await describeReport(report);
  await auditLog.record({
    req, action: 'terminalReport.publish', entityType: 'TerminalReport', entityId: report.id, description: `Published terminal report: ${description}`,
  });

  const recipients = await getStudentAndGuardianRecipients(report.studentId);
  if (recipients.length) {
    safeDispatch({ channel: 'email', message: `${description}'s terminal report card is now available to view/download.`, recipients });
  }

  res.json({ success: true, data: report });
});

// POST /terminal-reports/:id/unpublish  (admin only)
const unpublish = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  if (report.status !== 'Published') return next(new AppError('Only published reports can be unpublished', 400));
  report.status = 'Locked';
  await report.save();
  await auditLog.record({
    req, action: 'terminalReport.unpublish', entityType: 'TerminalReport', entityId: report.id, description: `Unpublished terminal report: ${await describeReport(report)}`,
  });
  res.json({ success: true, data: report });
});

// POST /terminal-reports/publish-all { classId, academicTermId }  (admin only)
const publishAll = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.body;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  const toPublish = await TerminalReport.find({ classId, academicTermId, status: 'Locked' })
    .populate('student', 'firstName lastName');
  const result = await TerminalReport.updateMany(
    { classId, academicTermId, status: 'Locked' },
    { $set: { status: 'Published' } },
  );

  // Personalized per student rather than one shared blast, even though this
  // is a bulk action — each family only cares about their own child's report.
  await Promise.all(toPublish.map(async (report) => {
    const recipients = await getStudentAndGuardianRecipients(report.studentId);
    if (!recipients.length) return;
    const name = report.student ? `${report.student.firstName} ${report.student.lastName}` : 'Your';
    safeDispatch({ channel: 'email', message: `${name}'s terminal report card is now available to view/download.`, recipients });
  }));

  res.json({ success: true, data: { published: result.modifiedCount } });
});

// Gathers everything buildReportCardsPdfHtml needs for a class/term, or a
// subset of it if studentIds is given — shared by the whole-class PDF, the
// print-selected-students PDF, and the ZIP-of-individual-PDFs download, so
// none of them re-derive this independently.
const buildClassPdfContext = async (req, { classId, academicTermId, studentIds }) => {
  const classRow = await Class.findById(classId);
  const term = await AcademicTerm.findById(academicTermId);
  if (!classRow || !term) throw new AppError('Class or term not found', 404);

  const nextTerm = await AcademicTerm.findOne({
    academicYear: term.academicYear, termNumber: term.termNumber + 1,
  });

  const reportQuery = { classId, academicTermId };
  if (studentIds) reportQuery.studentId = { $in: studentIds };
  const reports = await TerminalReport.find(reportQuery)
    .populate('student', 'firstName lastName admissionNo category programme')
    .sort({ classPosition: 1 });
  if (reports.length === 0) throw new AppError('No terminal reports found for this selection', 400);

  const reportStudentIds = reports.map((r) => r.studentId);
  const results = await Result.find({ studentId: { $in: reportStudentIds }, classId, academicTermId }).populate('subject', 'name');
  results.sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || ''));
  const resultsByStudent = new Map();
  results.forEach((r) => {
    const key = r.studentId.toString();
    if (!resultsByStudent.has(key)) resultsByStudent.set(key, []);
    resultsByStudent.get(key).push(r);
  });

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const totalPossible = (await ClassSubject.countDocuments({ classId })) * (scheme.classScoreMax + scheme.examScoreMax);
  const [school] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });
  const schoolDoc = await School.findById(req.user.schoolId);

  const qrByReportId = new Map();
  await Promise.all(reports.map(async (r) => {
    qrByReportId.set(r.id, await buildVerificationQrDataUrl('report', r.id, schoolDoc.slug));
  }));

  const attributeNameById = new Map((await PersonalAttribute.find()).map((a) => [a.id, a.name]));

  return {
    school, classRow, term, nextTerm, reports, resultsByStudent, totalPossible, rollCount: reports.length, qrByReportId, scheme, attributeNameById,
  };
};

// GET /terminal-reports/pdf?classId=&academicTermId=
const downloadPdf = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.query;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const context = await buildClassPdfContext(req, { classId, academicTermId });
  const html = buildReportCardsPdfHtml(context);

  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-cards-${context.classRow.name}-${context.term.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

// POST /terminal-reports/pdf-selected { classId, academicTermId, studentIds }
// — a checkbox-driven subset of the whole-class PDF, same rendering path.
const downloadSelectedPdf = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId, studentIds } = req.body;
  await assertClassAccess(req, classId);

  const context = await buildClassPdfContext(req, { classId, academicTermId, studentIds });
  const html = buildReportCardsPdfHtml(context);

  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-cards-selected-${context.classRow.name}-${context.term.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

// GET /terminal-reports/zip?classId=&academicTermId= — one PDF per student
// inside a ZIP, so a school can distribute individual files instead of one
// combined document. Renders the whole class as ONE multi-page PDF (a
// single Puppeteer launch, same as downloadPdf) then splits it into
// per-student single-page PDFs with pdf-lib rather than launching Puppeteer
// once per student, which would be far slower for a large class.
const downloadZip = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.query;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const context = await buildClassPdfContext(req, { classId, academicTermId });
  const html = buildReportCardsPdfHtml(context);
  const combinedPdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });

  const combinedPdf = await PDFDocument.load(combinedPdfBuffer);
  const pageCount = combinedPdf.getPageCount();
  if (pageCount !== context.reports.length) {
    return next(new AppError('Could not split the combined PDF into per-student files', 500));
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="report-cards-${context.classRow.name}-${context.term.name}.zip"`.replace(/\s+/g, '-'));

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => next(err));
  archive.pipe(res);

  for (let i = 0; i < context.reports.length; i += 1) {
    const report = context.reports[i];
    // eslint-disable-next-line no-await-in-loop
    const singlePdf = await PDFDocument.create();
    // eslint-disable-next-line no-await-in-loop
    const [copiedPage] = await singlePdf.copyPages(combinedPdf, [i]);
    singlePdf.addPage(copiedPage);
    // eslint-disable-next-line no-await-in-loop
    const singleBytes = await singlePdf.save();
    const studentName = `${report.student.firstName}-${report.student.lastName}`.replace(/\s+/g, '-');
    archive.append(Buffer.from(singleBytes), { name: `${studentName}-${report.student.admissionNo}.pdf` });
  }

  await archive.finalize();
});

// GET /terminal-reports/student/:studentId — every Published report for one
// student, so a parent/student/admin can see what's available to download.
const listForStudent = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student || student.id !== studentId) {
      return next(new AppError('You do not have permission to view this record', 403));
    }
  } else if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentIds.includes(studentId)) {
      return next(new AppError('You do not have permission to view this record', 403));
    }
  } else {
    const student = await Student.findById(studentId);
    if (!student) return next(new AppError('Student not found', 404));
    await assertClassAccess(req, student.classId);
  }

  const reports = await TerminalReport.find({ studentId, status: 'Published' })
    .populate('academicTerm', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reports });
});

// GET /terminal-reports/:id/pdf — a single student's own published report card
// (parent/student self-service viewing; admin/teacher can also preview it).
const downloadStudentPdf = asyncHandler(async (req, res, next) => {
  const report = await TerminalReport.findById(req.params.id).populate('student', 'firstName lastName admissionNo category programme');
  if (!report) return next(new AppError('Terminal report not found', 404));

  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student || student.id !== report.studentId.toString()) {
      return next(new AppError('You do not have permission to view this record', 403));
    }
  } else if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentIds.includes(report.studentId.toString())) {
      return next(new AppError('You do not have permission to view this record', 403));
    }
  } else {
    await assertClassAccess(req, report.classId);
  }

  if (report.status !== 'Published') {
    return next(new AppError('This report card is not yet available.', 403));
  }

  const [settings] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });
  if (settings.reportCardFeeGateEnabled) {
    const outstanding = await getOutstandingBalanceForStudentTerm(report.studentId, report.academicTermId);
    if (outstanding > 0) {
      return next(new AppError(`Outstanding balance of GH₵ ${outstanding.toFixed(2)} must be cleared before downloading this report card.`, 402));
    }
  }

  const classRow = await Class.findById(report.classId);
  const term = await AcademicTerm.findById(report.academicTermId);
  const nextTerm = await AcademicTerm.findOne({ academicYear: term.academicYear, termNumber: term.termNumber + 1 });

  const results = await Result.find({
    studentId: report.studentId, classId: report.classId, academicTermId: report.academicTermId,
  }).populate('subject', 'name');
  results.sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || ''));

  const scheme = await getSchemeForSchool(req.user.schoolId);
  const totalPossible = (await ClassSubject.countDocuments({ classId: report.classId })) * (scheme.classScoreMax + scheme.examScoreMax);
  const rollCount = await Student.countDocuments({ classId: report.classId, status: 'active' });
  const schoolDoc = await School.findById(req.user.schoolId);
  const qrCodeDataUrl = await buildVerificationQrDataUrl('report', report.id, schoolDoc.slug);
  const attributeNameById = new Map((await PersonalAttribute.find()).map((a) => [a.id, a.name]));

  const html = buildReportCardsPdfHtml({
    school: settings,
    classRow,
    term,
    nextTerm,
    reports: [report],
    resultsByStudent: new Map([[report.studentId.toString(), results]]),
    totalPossible,
    rollCount,
    qrByReportId: new Map([[report.id, qrCodeDataUrl]]),
    scheme,
    attributeNameById,
  });

  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-card-${report.student.admissionNo}-${term.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

module.exports = {
  generate,
  list,
  listForStudent,
  submit,
  lock,
  lockAll,
  reject,
  unlock,
  publish,
  unpublish,
  publishAll,
  downloadPdf,
  downloadSelectedPdf,
  downloadZip,
  downloadStudentPdf,
};
