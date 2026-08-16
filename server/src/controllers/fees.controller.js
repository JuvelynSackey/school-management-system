const models = require('../models');
const { Fee, Payment, Student, SchoolSettings } = models;
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getFeeBalance, refreshFeeStatus } = require('../services/fees.service');
const { renderHtmlToPdfBuffer } = require('../services/pdf.service');
const { buildReceiptHtml, receiptNumber } = require('../services/receiptTemplate.service');
const { buildVerificationQrDataUrl } = require('../services/verification.service');
const { deleteWithCascade } = require('../services/cascadeDelete.service');
const { findOrCreate } = require('../utils/findOrCreate');

const withBalance = async (fee) => {
  const { amountPaid, balance, status } = await getFeeBalance(fee);
  return { ...fee.toJSON(), amountPaid, balance, status };
};

// GET /fees?studentId=&classId=&overdue=true
const list = asyncHandler(async (req, res) => {
  const { studentId, classId, overdue } = req.query;
  const where = {};
  if (overdue === 'true') {
    where.dueDate = { $lt: new Date().toISOString().slice(0, 10) };
    where.status = { $ne: 'Paid' };
  }

  if (studentId) {
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

const create = asyncHandler(async (req, res) => {
  const { studentId, academicTermId, feeType, amountDue, dueDate } = req.body;
  const fee = await Fee.create({
    studentId,
    academicTermId: academicTermId || null,
    feeType,
    amountDue,
    dueDate: dueDate || null,
    status: 'Pending',
  });
  res.status(201).json({ success: true, data: await withBalance(fee) });
});

const update = asyncHandler(async (req, res, next) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return next(new AppError('Fee not found', 404));

  const { feeType, amountDue, dueDate, academicTermId } = req.body;
  fee.feeType = feeType ?? fee.feeType;
  fee.amountDue = amountDue ?? fee.amountDue;
  fee.dueDate = dueDate === undefined ? fee.dueDate : dueDate;
  fee.academicTermId = academicTermId === undefined ? fee.academicTermId : academicTermId;
  await fee.save();
  await refreshFeeStatus(fee);
  res.json({ success: true, data: await withBalance(fee) });
});

const remove = asyncHandler(async (req, res, next) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) return next(new AppError('Fee not found', 404));
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
  const [school] = await findOrCreate(SchoolSettings, { where: {} });
  const qrCodeDataUrl = await buildVerificationQrDataUrl('receipt', payment.id);

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

module.exports = { list, getMyFees, getPayments, create, update, remove, recordPayment, downloadReceipt };
