// Administrative overview blending five signals this app already computes
// elsewhere. Deliberately NOT named "school health" -- that term is already
// taken by schoolHealth.service.js's computeHealthScore (the weighted
// academic/attendance/fee/report-lock score shown on the Intelligence page).
// This is a different, complementary lens: not "how well are students
// performing" but "how complete and well-maintained is the school's own
// administrative record-keeping" -- submission/approval completeness,
// staffing/class-structure gaps, and student-record data quality, none of
// which the existing health score covers.
const {
  AcademicTerm, Attendance, Fee, TeacherSubjectAssignment, ResultSheet,
} = require('../models');
const { getFeeBalance } = require('./fees.service');
const { getDataQualityReport } = require('./dataQuality.service');

const round1 = (n) => Math.round(n * 10) / 10;

// Same (TeacherSubjectAssignment, ResultSheet) join as
// teacherSubmissionStatus.service.js's getTeachersWithUnsubmittedMarksheets
// -- "expected" means the same thing here it does there: one result sheet
// per (class, subject) a teacher is actually assigned to teach this term,
// not literally every class times every subject in the school.
const computeAcademicCompletion = async (academicTermId) => {
  if (!academicTermId) return { expected: 0, approved: 0, rate: null };
  const [assignments, sheets] = await Promise.all([
    TeacherSubjectAssignment.find({}, { classId: 1, subjectId: 1 }),
    ResultSheet.find({ academicTermId }, { classId: 1, subjectId: 1, status: 1 }),
  ]);
  const expectedPairs = new Set(assignments.map((a) => `${a.classId}:${a.subjectId}`));
  const statusByPair = new Map(sheets.map((s) => [`${s.classId}:${s.subjectId}`, s.status]));
  let approved = 0;
  expectedPairs.forEach((key) => { if (statusByPair.get(key) === 'Approved') approved += 1; });
  const expected = expectedPairs.size;
  return { expected, approved, rate: expected > 0 ? round1((approved / expected) * 100) : null };
};

// A different window from schoolHealth.service.js's attendance component
// (which is term-scoped, via buildAttendanceSummary) -- this month, since
// a full-term average is less useful for "is this still on track right now."
const computeAttendanceRate = async () => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().slice(0, 10);
  const records = await Attendance.find({ attendanceDate: { $gte: monthStart, $lte: today } }, { status: 1 });
  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  return { presentCount, total, rate: total > 0 ? round1((presentCount / total) * 100) : null };
};

// Same per-fee loop dashboard.controller.js's sumFeeStats and
// analytics.controller.js's getFinancial already run -- kept as its own
// small copy here (matching how those two already independently repeat
// it) rather than a shared abstraction neither of them asked for.
const computeFinancialHealth = async (academicTermId) => {
  if (!academicTermId) return { totalDue: 0, totalPaid: 0, rate: null };
  const fees = await Fee.find({ academicTermId });
  let totalDue = 0;
  let totalPaid = 0;
  await Promise.all(fees.map(async (fee) => {
    const { amountPaid } = await getFeeBalance(fee);
    totalDue += Number(fee.amountDue);
    totalPaid += amountPaid;
  }));
  return { totalDue, totalPaid, rate: totalDue > 0 ? round1((totalPaid / totalDue) * 100) : null };
};

// Only "ResultSheet submitted, not yet approved" is a real, well-defined
// pending-action queue in this schema -- there's no approval workflow on
// Fee/Payment (a payment is recorded directly, never submitted for
// review), so a "pending financial/administrative adjustments" count
// isn't something this codebase can honestly report.
const computePendingApprovals = async (academicTermId) => {
  if (!academicTermId) return 0;
  return ResultSheet.countDocuments({ academicTermId, status: 'Submitted' });
};

// dataQuality.service.js's own 8 checks already tag each with a `scope`
// (Students/Staff/Academics/Parents/BECE) but return one blended score --
// this re-groups those SAME already-computed categories into two pillars
// rather than running new queries: student-record gaps ("Data Quality")
// vs staffing/class-structure gaps ("Operations").
const OPERATIONS_SCOPES = new Set(['Staff', 'Academics', 'Parents']);

const splitDataQualityCategories = (categories) => {
  const cleanRate = (c) => (c.total > 0 ? (c.total - c.count) / c.total : 1);
  const group = (predicate) => {
    const matched = categories.filter(predicate);
    if (matched.length === 0) return null;
    return round1((matched.reduce((sum, c) => sum + cleanRate(c), 0) / matched.length) * 100);
  };
  return {
    dataQualityRate: group((c) => !OPERATIONS_SCOPES.has(c.scope)),
    operationsRate: group((c) => OPERATIONS_SCOPES.has(c.scope)),
  };
};

const getOperationsOverviewReport = async () => {
  const currentTerm = await AcademicTerm.findOne({ isCurrent: true });
  const academicTermId = currentTerm ? currentTerm.id : null;

  const [academic, attendance, financial, dataQualityReport, pendingApprovals] = await Promise.all([
    computeAcademicCompletion(academicTermId),
    computeAttendanceRate(),
    computeFinancialHealth(academicTermId),
    getDataQualityReport(),
    computePendingApprovals(academicTermId),
  ]);
  const { dataQualityRate, operationsRate } = splitDataQualityCategories(dataQualityReport.categories);

  const pillars = [
    {
      key: 'academics', label: 'Result Sheet Completion', rate: academic.rate, detail: `${academic.approved} / ${academic.expected} result sheets approved this term`,
    },
    {
      key: 'attendance', label: 'Attendance (This Month)', rate: attendance.rate, detail: attendance.total > 0 ? `${attendance.presentCount} / ${attendance.total} attendance records present or late` : 'No attendance recorded yet this month',
    },
    {
      key: 'finance', label: 'Fee Collection', rate: financial.rate, detail: financial.totalDue > 0 ? `GH₵${financial.totalPaid.toFixed(2)} of GH₵${financial.totalDue.toFixed(2)} collected this term` : 'No fees charged this term yet',
    },
    {
      key: 'operations', label: 'Operations', rate: operationsRate, detail: 'Teacher assignments, homeroom coverage, class subjects, and guardian logins',
    },
    {
      key: 'dataQuality', label: 'Data Quality', rate: dataQualityRate, detail: 'Student demographic and guardian-link completeness',
    },
  ];

  const scored = pillars.filter((p) => p.rate !== null);
  const overallScore = scored.length > 0 ? round1(scored.reduce((sum, p) => sum + p.rate, 0) / scored.length) : null;

  return {
    generatedAt: new Date().toISOString(),
    hasCurrentTerm: Boolean(currentTerm),
    overallScore,
    pillars,
    pendingApprovals,
  };
};

module.exports = { getOperationsOverviewReport };
