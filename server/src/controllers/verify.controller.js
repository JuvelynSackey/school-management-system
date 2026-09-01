const {
  Payment, TerminalReport, School, Student,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { receiptNumber } = require('../services/receiptTemplate.service');
const { runWithSchool } = require('../middleware/tenantContext');

// GET /verify/receipt/:schoolSlug/:id (public, no auth — printed on receipts
// as a QR code). Resolves the school from the slug first, then runs every
// lookup (including nested populates) inside that school's tenant context —
// this route sits outside the normal authenticated request flow, so without
// this the tenant-scoping plugin would have no context to inject and would
// throw. A leaked id under the wrong school's slug fails closed rather than
// leaking cross-tenant data.
const verifyReceipt = asyncHandler(async (req, res) => {
  const school = await School.findOne({ slug: req.params.schoolSlug, status: 'active' });
  if (!school) return res.json({ success: true, data: { valid: false, reason: 'not_found' } });

  const { payment, fee } = await runWithSchool(school._id, async () => {
    const foundPayment = await Payment.findById(req.params.id).catch(() => null);
    const foundFee = foundPayment ? await foundPayment.populate({
      path: 'fee',
      populate: [
        { path: 'student', select: 'firstName lastName admissionNo' },
        { path: 'academicTerm', select: 'name' },
      ],
    }).then((p) => p.fee) : null;
    return { payment: foundPayment, fee: foundFee };
  });

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

// GET /verify/report/:schoolSlug/:id (public, no auth — printed on report cards as a QR code)
const verifyReport = asyncHandler(async (req, res) => {
  const school = await School.findOne({ slug: req.params.schoolSlug, status: 'active' });
  if (!school) return res.json({ success: true, data: { valid: false, reason: 'not_found' } });

  const report = await runWithSchool(school._id, () => TerminalReport.findById(req.params.id)
    .populate('student', 'firstName lastName admissionNo')
    .populate('class', 'name section showPositions')
    .populate('academicTerm', 'name academicYear')
    .catch(() => null));

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
      classPosition: report.class?.showPositions === false ? null : report.classPosition,
      status: report.status,
    },
  });
});

// GET /verify/student/:schoolSlug/:id (public, no auth — printed on ID
// cards as a QR code). Confirms the card matches a genuinely enrolled
// student at this school — an archived/inactive student still resolves but
// is reported as such, rather than a bare "not found", since the card
// itself is real, just no longer current.
const verifyStudent = asyncHandler(async (req, res) => {
  const school = await School.findOne({ slug: req.params.schoolSlug, status: 'active' });
  if (!school) return res.json({ success: true, data: { valid: false, reason: 'not_found' } });

  const student = await runWithSchool(school._id, async () => Student.findById(req.params.id)
    .populate('class', 'name section')
    .catch(() => null));

  if (!student) {
    return res.json({ success: true, data: { valid: false, reason: 'not_found' } });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      type: 'student',
      schoolName: school.name,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      className: student.class ? `${student.class.name} ${student.class.section || ''}`.trim() : null,
      status: student.status,
    },
  });
});

module.exports = { verifyReceipt, verifyReport, verifyStudent };
