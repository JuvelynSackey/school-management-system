const {
  Student, Attendance, Fee, FeedingCharge, AcademicTerm, SchoolSettings, Payment,
} = require('../models');
const { findOrCreate } = require('../utils/findOrCreate');

// Students marked Present or Late are billable by default; Absent students
// are excluded automatically (the "auto-exemption"). Excused sits with
// Absent — a student who wasn't at school didn't eat at school either.
const BILLABLE_STATUSES = ['Present', 'Late'];

const getRoster = async ({ classId, date }) => {
  const [students, attendance, charges] = await Promise.all([
    Student.find({ classId, status: 'active' }).sort({ firstName: 1, lastName: 1 }),
    Attendance.find({ classId, attendanceDate: date }),
    FeedingCharge.find({ classId, date }),
  ]);

  const attendanceByStudent = new Map(attendance.map((a) => [a.studentId.toString(), a.status]));
  const chargedStudentIds = new Set(charges.map((c) => c.studentId.toString()));

  return students.map((s) => {
    const attendanceStatus = attendanceByStudent.get(s.id) || null;
    return {
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      admissionNo: s.admissionNo,
      attendanceStatus,
      billableByDefault: BILLABLE_STATUSES.includes(attendanceStatus),
      alreadyCharged: chargedStudentIds.has(s.id),
    };
  });
};

// Charges the given students for one school-day, skipping anyone already
// charged that date (idempotent — safe to re-run). Returns which students
// were actually charged vs skipped and why.
const chargeDay = async ({
  classId, date, studentIds, req,
}) => {
  const [term, settings] = await Promise.all([
    AcademicTerm.findOne({ isCurrent: true }),
    findOrCreate(SchoolSettings, { where: { schoolId: req.user.schoolId } }).then(([s]) => s),
  ]);
  if (!term) throw new Error('No current academic term is set');

  const rate = settings.feedingRatePerDay || 0;

  const existing = await FeedingCharge.find({ studentId: { $in: studentIds }, date }, { studentId: 1 });
  const alreadyChargedIds = new Set(existing.map((c) => c.studentId.toString()));

  const results = { charged: [], skipped: [] };

  for (const studentId of studentIds) {
    if (alreadyChargedIds.has(studentId)) {
      results.skipped.push({ studentId, reason: 'already charged today' });
      continue; // eslint-disable-line no-continue
    }

    const [fee] = await findOrCreate(Fee, {
      where: {
        studentId, category: 'Feeding', academicTermId: term.id,
      },
      defaults: {
        feeType: 'Feeding Fees', amountDue: 0, status: 'Pending',
      },
    });
    fee.amountDue = Number(fee.amountDue) + rate;
    await fee.save();

    await FeedingCharge.create({
      studentId, classId, feeId: fee.id, date, amount: rate, recordedBy: req.user.id,
    });

    results.charged.push({ studentId, amount: rate });
  }

  return results;
};

const getDaySummary = async ({ classId, date }) => {
  const charges = await FeedingCharge.find({ classId, date });
  const totalCharged = charges.reduce((sum, c) => sum + Number(c.amount), 0);

  const feeIds = charges.map((c) => c.feeId);
  const payments = feeIds.length
    ? await Payment.find({ feeId: { $in: feeIds }, paymentDate: date })
    : [];

  const collectedByMethod = payments.reduce((acc, p) => {
    acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + Number(p.amountPaid);
    return acc;
  }, {});
  const totalCollected = Object.values(collectedByMethod).reduce((a, b) => a + b, 0);

  return {
    studentsCharged: charges.length,
    totalCharged,
    totalCollected,
    collectedByMethod,
  };
};

module.exports = { getRoster, chargeDay, getDaySummary, BILLABLE_STATUSES };
