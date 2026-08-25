const {
  Student, Attendance, Result, Fee, Class, Subject, AcademicTerm, SchoolSettings,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { toCsv } = require('../services/csv.service');
const { getFeeBalance } = require('../services/fees.service');
const { findOrCreate } = require('../utils/findOrCreate');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildBroadsheetPdfHtml } = require('../services/broadsheetTemplate.service');
const { buildFinanceSummary } = require('../services/financeReport.service');
const { buildAttendanceSummary } = require('../services/attendanceReport.service');
const { buildFinanceReportPdfHtml } = require('../services/financeReportTemplate.service');
const { buildAttendanceReportPdfHtml } = require('../services/attendanceReportTemplate.service');

const respond = (req, res, rows, columns, filename) => {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(toCsv(rows, columns));
  }
  return res.json({ success: true, data: rows });
};

// GET /reports/students?classId=&status=
const studentList = asyncHandler(async (req, res) => {
  const { classId, status } = req.query;
  const where = {};
  if (classId) where.classId = classId;
  if (status) where.status = status;

  const students = await Student.find(where).populate('class', 'name section').sort({ firstName: 1 });

  const rows = students.map((s) => ({
    admissionNo: s.admissionNo,
    firstName: s.firstName,
    lastName: s.lastName,
    class: s.class ? `${s.class.name} ${s.class.section || ''}`.trim() : '',
    status: s.status,
  }));

  const columns = [
    { key: 'admissionNo', label: 'Admission No.' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'class', label: 'Class' },
    { key: 'status', label: 'Status' },
  ];

  respond(req, res, rows, columns, 'students.csv');
});

// GET /reports/attendance?classId=&startDate=&endDate=
const attendanceReport = asyncHandler(async (req, res) => {
  const { classId, startDate, endDate } = req.query;
  const where = {};
  if (classId) where.classId = classId;
  if (startDate && endDate) where.attendanceDate = { $gte: startDate, $lte: endDate };

  const records = await Attendance.find(where)
    .populate('student', 'firstName lastName admissionNo')
    .sort({ attendanceDate: -1 });

  const rows = records.map((r) => ({
    date: r.attendanceDate,
    admissionNo: r.student?.admissionNo,
    name: `${r.student?.firstName} ${r.student?.lastName}`,
    status: r.status,
  }));

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'admissionNo', label: 'Admission No.' },
    { key: 'name', label: 'Student' },
    { key: 'status', label: 'Status' },
  ];

  respond(req, res, rows, columns, 'attendance.csv');
});

// GET /reports/results?classId=&subjectId=&academicTermId=
const resultsReport = asyncHandler(async (req, res) => {
  const { classId, subjectId, academicTermId } = req.query;
  const where = {};
  if (classId) where.classId = classId;
  if (subjectId) where.subjectId = subjectId;
  if (academicTermId) where.academicTermId = academicTermId;

  const results = await Result.find(where)
    .populate('student', 'firstName lastName admissionNo')
    .populate('subject', 'name')
    .populate('academicTerm', 'name');
  results.sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || ''));

  const rows = results.map((r) => ({
    admissionNo: r.student?.admissionNo,
    name: `${r.student?.firstName} ${r.student?.lastName}`,
    subject: r.subject?.name,
    term: r.academicTerm?.name,
    classScore: r.classScore,
    examScore: r.examScore,
    totalScore: r.totalScore,
    grade: r.grade,
    subjectPosition: r.subjectPosition,
  }));

  const columns = [
    { key: 'admissionNo', label: 'Admission No.' },
    { key: 'name', label: 'Student' },
    { key: 'subject', label: 'Subject' },
    { key: 'term', label: 'Term' },
    { key: 'classScore', label: 'Class Score' },
    { key: 'examScore', label: 'Exam Score' },
    { key: 'totalScore', label: 'Total' },
    { key: 'grade', label: 'Grade' },
    { key: 'subjectPosition', label: 'Position' },
  ];

  respond(req, res, rows, columns, 'results.csv');
});

// GET /reports/fees?status=
const feesReport = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const fees = await Fee.find().populate('student', 'firstName lastName admissionNo').sort({ feeType: 1 });

  const withBalances = await Promise.all(fees.map(async (f) => ({
    fee: f,
    ...(await getFeeBalance(f)),
  })));

  const filtered = status ? withBalances.filter((f) => f.status === status) : withBalances;

  const rows = filtered.map(({ fee, amountPaid, balance, status: computedStatus }) => ({
    admissionNo: fee.student?.admissionNo,
    name: `${fee.student?.firstName} ${fee.student?.lastName}`,
    feeType: fee.feeType,
    amountDue: fee.amountDue,
    amountPaid: amountPaid.toFixed(2),
    balance: balance.toFixed(2),
    status: computedStatus,
  }));

  const columns = [
    { key: 'admissionNo', label: 'Admission No.' },
    { key: 'name', label: 'Student' },
    { key: 'feeType', label: 'Fee Type' },
    { key: 'amountDue', label: 'Amount Due' },
    { key: 'amountPaid', label: 'Amount Paid' },
    { key: 'balance', label: 'Balance' },
    { key: 'status', label: 'Status' },
  ];

  respond(req, res, rows, columns, 'fees.csv');
});

// GET /reports/broadsheet-pdf?classId=&subjectId=&academicTermId=
// Same underlying data as resultsReport, but rendered as an official,
// signable A4 landscape PDF via the same pipeline as report cards/ID
// cards/fee receipts, rather than bolted onto the generic CSV export tool.
const broadsheetPdf = asyncHandler(async (req, res, next) => {
  const { classId, subjectId, academicTermId } = req.query;
  if (!classId || !subjectId || !academicTermId) {
    return next(new AppError('classId, subjectId, and academicTermId are required', 400));
  }

  const [classRow, subject, term] = await Promise.all([
    Class.findById(classId),
    Subject.findById(subjectId),
    AcademicTerm.findById(academicTermId),
  ]);
  if (!classRow) return next(new AppError('Class not found', 404));
  if (!subject) return next(new AppError('Subject not found', 404));
  if (!term) return next(new AppError('Academic term not found', 404));

  const [settings] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });

  const results = await Result.find({ classId, subjectId, academicTermId }).populate('student', 'firstName lastName');
  results.sort((a, b) => `${a.student?.firstName} ${a.student?.lastName}`.localeCompare(`${b.student?.firstName} ${b.student?.lastName}`));

  const rows = results.map((r) => ({
    name: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim(),
    classScore: r.classScore,
    examScore: r.examScore,
    totalScore: r.totalScore,
    grade: r.grade,
    position: r.subjectPosition,
  }));

  const html = buildBroadsheetPdfHtml({
    school: settings, classRow, subject, term, rows,
  });
  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4', landscape: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="broadsheet-${classRow.name}-${subject.name}-${term.name}.pdf"`.replace(/\s+/g, '-'));
  res.send(pdfBuffer);
});

// GET /reports/finance-summary?academicTermId=&format=csv
const financeSummary = asyncHandler(async (req, res) => {
  const { academicTermId } = req.query;
  const summary = await buildFinanceSummary({ academicTermId });

  if (req.query.format === 'csv') {
    const rows = [
      { section: 'Overview', label: 'Total Assigned', assigned: summary.totalAssigned.toFixed(2), collected: '', balanceOrTotal: '', count: '' },
      { section: 'Overview', label: 'Total Collected', assigned: '', collected: summary.totalCollected.toFixed(2), balanceOrTotal: '', count: '' },
      { section: 'Overview', label: 'Total Outstanding', assigned: '', collected: '', balanceOrTotal: summary.totalOutstanding.toFixed(2), count: '' },
      ...summary.byCategory.map((c) => ({
        section: 'Category', label: c.category, assigned: c.assigned.toFixed(2), collected: c.collected.toFixed(2), balanceOrTotal: '', count: '',
      })),
      ...summary.byClass.map((c) => ({
        section: 'Class Arrears', label: c.className, assigned: '', collected: '', balanceOrTotal: c.arrears.toFixed(2), count: '',
      })),
      ...summary.byMethod.map((m) => ({
        section: 'Payment Method', label: m.method, assigned: '', collected: '', balanceOrTotal: m.total.toFixed(2), count: m.count,
      })),
    ];
    const columns = [
      { key: 'section', label: 'Section' }, { key: 'label', label: 'Label' },
      { key: 'assigned', label: 'Assigned' }, { key: 'collected', label: 'Collected' },
      { key: 'balanceOrTotal', label: 'Balance / Total' }, { key: 'count', label: 'Count' },
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="finance-summary.csv"');
    return res.send(toCsv(rows, columns));
  }
  return res.json({ success: true, data: summary });
});

// GET /reports/finance-summary-pdf?academicTermId=
const financeSummaryPdf = asyncHandler(async (req, res) => {
  const { academicTermId } = req.query;
  const [summary, [settings], term] = await Promise.all([
    buildFinanceSummary({ academicTermId }),
    findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } }),
    academicTermId ? AcademicTerm.findById(academicTermId) : null,
  ]);

  const html = buildFinanceReportPdfHtml({ school: settings, term, summary });
  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="finance-summary.pdf"');
  res.send(pdfBuffer);
});

// GET /reports/attendance-summary?classId=&academicTermId=&format=csv
const attendanceSummary = asyncHandler(async (req, res) => {
  const { classId, academicTermId } = req.query;
  const summary = await buildAttendanceSummary({ classId, academicTermId });

  if (req.query.format === 'csv') {
    const rows = [
      {
        section: 'Overview', label: 'Overall Attendance', admissionNo: '', className: '', presentTotal: `${summary.totalRecords} records`, percent: summary.overallPercent === null ? '' : `${summary.overallPercent}%`,
      },
      ...summary.monthlyTrend.map((m) => ({
        section: 'Monthly Trend', label: m.month, admissionNo: '', className: '', presentTotal: `${m.present}/${m.total}`, percent: `${m.percent}%`,
      })),
      ...summary.chronicAbsentees.map((s) => ({
        section: 'Chronic Absentee', label: s.name, admissionNo: s.admissionNo, className: s.className, presentTotal: `${s.present}/${s.total}`, percent: `${s.percent}%`,
      })),
    ];
    const columns = [
      { key: 'section', label: 'Section' }, { key: 'label', label: 'Label' },
      { key: 'admissionNo', label: 'Admission No.' }, { key: 'className', label: 'Class' },
      { key: 'presentTotal', label: 'Present/Total' }, { key: 'percent', label: '%' },
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-summary.csv"');
    return res.send(toCsv(rows, columns));
  }
  return res.json({ success: true, data: summary });
});

// GET /reports/attendance-summary-pdf?classId=&academicTermId=
const attendanceSummaryPdf = asyncHandler(async (req, res) => {
  const { classId, academicTermId } = req.query;
  const [summary, [settings], classRow, term] = await Promise.all([
    buildAttendanceSummary({ classId, academicTermId }),
    findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } }),
    classId ? Class.findById(classId) : null,
    academicTermId ? AcademicTerm.findById(academicTermId) : null,
  ]);

  const html = buildAttendanceReportPdfHtml({
    school: settings, classRow, term, summary,
  });
  const pdfBuffer = await renderHtmlToPdfBuffer(html, { format: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-summary.pdf"');
  res.send(pdfBuffer);
});

module.exports = {
  studentList,
  attendanceReport,
  resultsReport,
  feesReport,
  broadsheetPdf,
  financeSummary,
  financeSummaryPdf,
  attendanceSummary,
  attendanceSummaryPdf,
};
