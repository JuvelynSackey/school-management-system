const { TerminalReport, Student, Class, AcademicTerm, Result, ClassSubject, SchoolSettings } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getTeacherClassIds } = require('../services/teacherScope.service');
const { findOrCreate } = require('../utils/findOrCreate');
const { computeAggregatesForStudent, recalculateClassPositions } = require('../services/terminalReports.service');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildReportCardsPdfHtml } = require('../services/reportCardTemplate.service');
const { buildVerificationQrDataUrl } = require('../services/verification.service');

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

  const reports = await TerminalReport.find({ classId, academicTermId })
    .populate('student', 'firstName lastName admissionNo')
    .sort({ classPosition: 1 });
  res.json({ success: true, data: reports });
});

const findReportOr404 = async (id, next) => {
  const report = await TerminalReport.findById(id);
  if (!report) {
    next(new AppError('Terminal report not found', 404));
    return null;
  }
  return report;
};

// POST /terminal-reports/:id/submit { teacherRemark, teacherSignatureName }
const submit = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  await assertClassAccess(req, report.classId);
  if (report.status === 'Locked') return next(new AppError('This report is locked. Ask an admin to unlock it first.', 400));

  const { teacherRemark, teacherSignatureName } = req.body;
  report.teacherRemark = teacherRemark || null;
  report.teacherSignatureName = teacherSignatureName || req.user.fullName || null;
  report.status = 'Submitted';
  await report.save();
  res.json({ success: true, data: report });
});

// POST /terminal-reports/:id/lock { headteacherRemark, headteacherSignatureName }  (admin only)
const lock = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;

  const { headteacherRemark, headteacherSignatureName } = req.body;
  const aggregates = await computeAggregatesForStudent(report.studentId, report.classId, report.academicTermId);
  Object.assign(report, aggregates, {
    headteacherRemark: headteacherRemark || null,
    headteacherSignatureName: headteacherSignatureName || null,
    status: 'Locked',
  });
  await report.save();
  await recalculateClassPositions(report.classId, report.academicTermId);

  res.json({ success: true, data: report });
});

// POST /terminal-reports/:id/unlock  (admin only)
const unlock = asyncHandler(async (req, res, next) => {
  const report = await findReportOr404(req.params.id, next);
  if (!report) return;
  report.status = 'Submitted';
  await report.save();
  res.json({ success: true, data: report });
});

// GET /terminal-reports/pdf?classId=&academicTermId=
const downloadPdf = asyncHandler(async (req, res, next) => {
  const { classId, academicTermId } = req.query;
  if (!classId || !academicTermId) return next(new AppError('classId and academicTermId are required', 400));
  await assertClassAccess(req, classId);

  const classRow = await Class.findById(classId);
  const term = await AcademicTerm.findById(academicTermId);
  if (!classRow || !term) return next(new AppError('Class or term not found', 404));

  const nextTerm = await AcademicTerm.findOne({
    academicYear: term.academicYear, termNumber: term.termNumber + 1,
  });

  const reports = await TerminalReport.find({ classId, academicTermId })
    .populate('student', 'firstName lastName admissionNo')
    .sort({ classPosition: 1 });
  if (reports.length === 0) return next(new AppError('No terminal reports generated for this class/term yet', 400));

  const studentIds = reports.map((r) => r.studentId);
  const results = await Result.find({ studentId: { $in: studentIds }, classId, academicTermId }).populate('subject', 'name');
  results.sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || ''));
  const resultsByStudent = new Map();
  results.forEach((r) => {
    const key = r.studentId.toString();
    if (!resultsByStudent.has(key)) resultsByStudent.set(key, []);
    resultsByStudent.get(key).push(r);
  });

  const totalPossible = (await ClassSubject.countDocuments({ classId })) * 100;
  const rollCount = reports.length;
  const [school] = await findOrCreate(SchoolSettings, { where: {} });

  const qrByReportId = new Map();
  await Promise.all(reports.map(async (r) => {
    qrByReportId.set(r.id, await buildVerificationQrDataUrl('report', r.id));
  }));

  const html = buildReportCardsPdfHtml({
    school,
    classRow,
    term,
    nextTerm,
    reports,
    resultsByStudent,
    totalPossible,
    rollCount,
    qrByReportId,
  });

  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-cards-${classRow.name}-${term.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

module.exports = { generate, list, submit, lock, unlock, downloadPdf };
