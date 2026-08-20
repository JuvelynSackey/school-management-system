const models = require('../models');
const { Fee, Payment, Student, SchoolSettings, School } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getFeeBalance, refreshFeeStatus } = require('../services/fees.service');
const { getParentStudentIds } = require('../services/parentScope.service');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildReceiptHtml, receiptNumber } = require('../services/receiptTemplate.service');
const { buildVerificationQrDataUrl } = require('../services/verification.service');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const { findOrCreate } = require('../utils/findOrCreate');
const auditLog = require('../services/auditLog.service');

const withBalance = async (fee) => {
  const { amountPaid, balance, status } = await getFeeBalance(fee);
  return { ...fee.toJSON(), amountPaid, balance, status };
};

// GET /fees?studentId=&classId=&overdue=true&category=
const list = asyncHandler(async (req, res, next) => {
  const { studentId, classId, overdue, category } = req.query;
  const where = {};
  if (overdue === 'true') {
    where.dueDate = { $lt: new Date().toISOString().slice(0, 10) };
    where.status = { $ne: 'Paid' };
  }
  if (category) where.category = category;

  if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentId || !studentIds.includes(studentId)) {
      return next(new AppError('studentId is required and must be one of your linked children', 400));
    }
    where.studentId = studentId;
  } else if (studentId) {
    where.studentId = studentId;
  } else if (classId) {
    const studentsInClass = await Student.find({ classId }, { _id: 1 });
    where.studentId = { $in: studentsInClass.map((s) => s.id) };
  }

  const fees = await Fee.find(where)
    .populate('student', 'firstName lastName admissionNo classId')
    .populate('academicTerm', 'name')
    .sort({ createdAt: -1 });

  const data = await Promise.all(fees.map(withBalance));
  res.json({ success: true, data });
});

// GET /fees/arrears-summary?classId= — per-student outstanding balance
// broken out by category (Tuition/Feeding/ClassActivity/PTA/Other) + total.
const arrearsSummary = asyncHandler(async (req, res) => {
  const { classId } = req.query;
  const studentWhere = classId ? { classId, status: 'active' } : { status: 'active' };
  const students = await Student.find(studentWhere).select('firstName lastName admissionNo');

  const fees = await Fee.find({ studentId: { $in: students.map((s) => s.id) } });
  const balances = await Promise.all(fees.map(async (fee) => ({ fee, ...(await getFeeBalance(fee)) })));

  const byStudent = new Map(students.map((s) => [s.id, {
    studentId: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    admissionNo: s.admissionNo,
    byCategory: { Tuition: 0, Feeding: 0, ClassActivity: 0, PTA: 0, Other: 0 },
    total: 0,
  }]));

  balances.forEach(({ fee, balance }) => {
    const entry = byStudent.get(fee.studentId.toString());
    if (!entry || balance <= 0) return;
    entry.byCategory[fee.category] = (entry.byCategory[fee.category] || 0) + balance;
    entry.total += balance;
  });

  const data = [...byStudent.values()].filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  res.json({ success: true, data });
});

// GET /fees/me
const getMyFees = asyncHandler(async (req, res, next) => {
  const student = await Student.findOne({ userId: req.user.id });
  if (!student) return next(new AppError('Student profile not found', 404));

  const fees = await Fee.find({ studentId: student.id }).populate('academicTerm', 'name').sort({ createdAt: -1 });

  const data = await Promise.all(fees.map(withBalance));
  res.json({ success: true, data });
});

const assertFeeAccess = async (req, fee) => {
  if (req.user.role === 'student') {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student || student.id !== fee.studentId.toString()) {
      throw new AppError('You do not have permission to view this record', 403);
    }
  }
  if (req.user.role === 'parent') {
    const { studentIds } = await getParentStudentIds(req.user.id);
    if (!studentIds.includes(fee.studentId.toString())) {
      throw new AppError('You do not have permission to view this record', 403);
    }
  }
};

// GET /fees/:id/payments
const getPayments = asyncHandler(async (req, res, next) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return next(new AppError('Fee not found', 404));
  await assertFeeAccess(req, fee);

  const payments = await Payment.find({ feeId: req.params.id })
    .populate('receiver', 'fullName')
    .sort({ paymentDate: -1 });
  res.json({ success: true, data: payments });
});

const create = asyncHandler(async (req, res, next) => {
  const { studentId, academicTermId, feeType, category, amountDue, dueDate } = req.body;
  if (!(await Student.findById(studentId))) return next(new AppError('Student not found', 404));
  const fee = await Fee.create({
    studentId,
    academicTermId: academicTermId || null,
    feeType,
    category: category || 'Tuition',
    amountDue,
    dueDate: dueDate || null,
    status: 'Pending',
  });
  res.status(201).json({ success: true, data: await withBalance(fee) });
});

const update = asyncHandler(async (req, res, next) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return next(new AppError('Fee not found', 404));

  const { feeType, category, amountDue, dueDate, academicTermId } = req.body;
  fee.feeType = feeType ?? fee.feeType;
  fee.category = category ?? fee.category;
  fee.amountDue = amountDue ?? fee.amountDue;
  fee.dueDate = dueDate === undefined ? fee.dueDate : dueDate;
  fee.academicTermId = academicTermId === undefined ? fee.academicTermId : academicTermId;
  await fee.save();
  await refreshFeeStatus(fee);
  await auditLog.record({
    req,
    action: 'fee.update',
    entityType: 'Fee',
    entityId: fee.id,
    description: `Updated fee: ${fee.feeType} (amount due now GHS ${fee.amountDue})`,
  });
  res.json({ success: true, data: await withBalance(fee) });
});

const remove = asyncHandler(async (req, res, next) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return next(new AppError('Fee not found', 404));
  await auditLog.record({
    req, action: 'fee.remove', entityType: 'Fee', entityId: fee.id, description: `Deleted fee: ${fee.feeType}`,
  });
  await deleteWithCascade(models, Fee, fee.id);
  res.json({ success: true, data: null });
});

const recordPayment = asyncHandler(async (req, res, next) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return next(new AppError('Fee not found', 404));

  const { amountPaid, paymentDate, paymentMethod, referenceNo, notes } = req.body;

  const payment = await Payment.create({
    feeId: fee.id,
    amountPaid,
    paymentDate,
    paymentMethod: paymentMethod || 'Cash',
    referenceNo: referenceNo || null,
    receivedBy: req.user.id,
    notes: notes || null,
  });

  await refreshFeeStatus(fee);

  await auditLog.record({
    req,
    action: 'fee.recordPayment',
    entityType: 'Payment',
    entityId: payment.id,
    description: `Recorded a payment of GHS ${amountPaid} (${payment.paymentMethod}) toward: ${fee.feeType}`,
  });

  res.status(201).json({ success: true, data: { payment, fee: await withBalance(fee) } });
});

// GET /fees/:feeId/payments/:paymentId/receipt
const downloadReceipt = asyncHandler(async (req, res, next) => {
  const { feeId, paymentId } = req.params;

  const fee = await Fee.findById(feeId)
    .populate({
      path: 'student',
      select: 'firstName lastName admissionNo classId',
      populate: { path: 'class', select: 'name section' },
    })
    .populate('academicTerm', 'name');
  if (!fee) return next(new AppError('Fee not found', 404));
  await assertFeeAccess(req, fee);

  const payment = await Payment.findOne({ _id: paymentId, feeId }).populate('receiver', 'fullName');
  if (!payment) return next(new AppError('Payment not found', 404));

  const { balance } = await getFeeBalance(fee);
  const [school] = await findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } });
  const schoolDoc = await School.findById(req.user.schoolId);
  const qrCodeDataUrl = await buildVerificationQrDataUrl('receipt', payment.id, schoolDoc.slug);

  const html = buildReceiptHtml({
    school,
    payment,
    fee,
    student: fee.student,
    totalFee: fee.amountDue,
    balance,
    receivedByName: payment.receiver?.fullName,
    qrCodeDataUrl,
  });

  const pdfBuffer = await renderHtmlToPdfBuffer(html);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${receiptNumber(payment.id)}.pdf"`);
  res.send(pdfBuffer);
});

module.exports = {
  list, arrearsSummary, getMyFees, getPayments, create, update, remove, recordPayment, downloadReceipt,
};
