const {
  Student, Attendance, Result, Fee,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { toCsv } = require('../services/csv.service');
const { getFeeBalance } = require('../services/fees.service');

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

module.exports = { studentList, attendanceReport, resultsReport, feesReport };
