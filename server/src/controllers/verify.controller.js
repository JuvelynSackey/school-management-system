const { Payment, TerminalReport, SchoolSettings } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { findOrCreate } = require('../utils/findOrCreate');
const { receiptNumber } = require('../services/receiptTemplate.service');

// GET /verify/receipt/:id (public, no auth — printed on receipts as a QR code)
const verifyReceipt = asyncHandler(async (req, res) => {
  const [school] = await findOrCreate(SchoolSettings, { where: {} });

  const payment = await Payment.findById(req.params.id).catch(() => null);
  const fee = payment ? await payment.populate({
    path: 'fee',
    populate: [
      { path: 'student', select: 'firstName lastName admissionNo' },
      { path: 'academicTerm', select: 'name' },
    ],
  }).then((p) => p.fee) : null;

  if (!payment || !fee) {
    return res.json({ success: true, data: { valid: false, reason: 'not_found' } });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      type: 'receipt',
      schoolName: school.name,
      receiptNumber: receiptNumber(payment.id),
      studentName: `${fee.student.firstName} ${fee.student.lastName}`,
      admissionNo: fee.student.admissionNo,
      feeType: fee.feeType,
      term: fee.academicTerm?.name || null,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paymentDate,
    },
  });
});

// GET /verify/report/:id (public, no auth — printed on report cards as a QR code)
const verifyReport = asyncHandler(async (req, res) => {
  const [school] = await findOrCreate(SchoolSettings, { where: {} });

  const report = await TerminalReport.findById(req.params.id)
    .populate('student', 'firstName lastName admissionNo')
    .populate('class', 'name section')
    .populate('academicTerm', 'name academicYear')
    .catch(() => null);

  if (!report || report.status === 'Draft') {
    return res.json({ success: true, data: { valid: false, reason: !report ? 'not_found' : 'not_finalized' } });
  }

  const reportId = `RC-${(report.academicTerm?.academicYear || '').split('/')[0]}-${report.id.slice(-6).toUpperCase()}`;

  res.json({
    success: true,
    data: {
      valid: true,
      type: 'report',
      schoolName: school.name,
      reportId,
      studentName: `${report.student.firstName} ${report.student.lastName}`,
      admissionNo: report.student.admissionNo,
      className: report.class ? `${report.class.name} ${report.class.section || ''}`.trim() : null,
      term: report.academicTerm?.name || null,
      averageScore: report.averageScore,
      classPosition: report.classPosition,
      status: report.status,
    },
  });
});

module.exports = { verifyReceipt, verifyReport };
