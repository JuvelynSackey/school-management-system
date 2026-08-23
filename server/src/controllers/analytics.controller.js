const {
  mongoose, Result, Class, Subject, AcademicTerm, Fee,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getFeeBalance } = require('../services/fees.service');
const { getSchemeForSchool } = require('../services/grading.service');

const round1 = (n) => Math.round(n * 10) / 10;

// Result.aggregate() bypasses tenantScopePlugin (only find/findOne/etc. are
// scoped, not aggregate) — schoolId must be matched explicitly here to avoid
// leaking another tenant's scores.
const classAverages = (schoolId, academicTermId) => Result.aggregate([
  { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
  { $group: { _id: '$classId', average: { $avg: '$totalScore' }, count: { $sum: 1 } } },
]);

const subjectAverages = (schoolId, academicTermId) => Result.aggregate([
  { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
  { $group: { _id: '$subjectId', average: { $avg: '$totalScore' }, count: { $sum: 1 } } },
]);

// Same "pass" definition as ai.controller.js's computeSubjectPerformance —
// at or above the grading scheme's second-lowest band minimum — but across
// every result this term rather than broken out per subject.
const overallPassRate = async (schoolId, academicTermId) => {
  const scheme = await getSchemeForSchool(schoolId);
  const sortedBands = [...scheme.bands].sort((a, b) => a.min - b.min);
  const passCutoff = sortedBands[1]?.min ?? 0;

  const [row] = await Result.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), academicTermId: new mongoose.Types.ObjectId(academicTermId) } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        passCount: { $sum: { $cond: [{ $gte: ['$totalScore', passCutoff] }, 1, 0] } },
      },
    },
  ]);

  return row && row.count > 0 ? round1((row.passCount / row.count) * 100) : null;
};

const resolvePreviousTerm = async (schoolId, currentTerm) => {
  const terms = await AcademicTerm.find({ schoolId }).sort({ academicYear: 1, termNumber: 1 });
  const idx = terms.findIndex((t) => t.id === currentTerm.id);
  return idx > 0 ? terms[idx - 1] : null;
};

// GET /analytics/academic?academicTermId=
const getAcademic = asyncHandler(async (req, res, next) => {
  const { academicTermId } = req.query;
  if (!academicTermId) return next(new AppError('academicTermId is required', 400));
  const term = await AcademicTerm.findById(academicTermId);
  if (!term) return next(new AppError('Academic term not found', 404));

  const { schoolId } = req.user;
  const [classRows, subjectRows, prevTerm, passRate] = await Promise.all([
    classAverages(schoolId, academicTermId),
    subjectAverages(schoolId, academicTermId),
    resolvePreviousTerm(schoolId, term),
    overallPassRate(schoolId, academicTermId),
  ]);
  const prevClassRows = prevTerm ? await classAverages(schoolId, prevTerm.id) : [];
  const prevByClass = new Map(prevClassRows.map((r) => [r._id.toString(), r.average]));

  const classes = await Class.find({ _id: { $in: classRows.map((r) => r._id) } }, { name: 1, section: 1 });
  const subjects = await Subject.find({ _id: { $in: subjectRows.map((r) => r._id) } }, { name: 1 });
  const classById = new Map(classes.map((c) => [c.id, c]));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const classAveragesOut = classRows.map((r) => {
    const key = r._id.toString();
    const cls = classById.get(key);
    const prevAvg = prevByClass.get(key);
    return {
      classId: key,
      className: cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Unknown',
      average: round1(r.average),
      previousAverage: prevAvg !== undefined ? round1(prevAvg) : null,
      delta: prevAvg !== undefined ? round1(r.average - prevAvg) : null,
      resultCount: r.count,
    };
  });

  const subjectAveragesOut = subjectRows.map((r) => {
    const subj = subjectById.get(r._id.toString());
    return {
      subjectId: r._id.toString(),
      subjectName: subj?.name || 'Unknown',
      average: round1(r.average),
      resultCount: r.count,
    };
  });

  res.json({
    success: true,
    data: {
      termId: term.id,
      previousTermId: prevTerm?.id || null,
      classAverages: classAveragesOut,
      subjectAverages: subjectAveragesOut,
      passRate,
    },
  });
});

// GET /analytics/financial?academicTermId=
const getFinancial = asyncHandler(async (req, res, next) => {
  const { academicTermId } = req.query;
  if (!academicTermId) return next(new AppError('academicTermId is required', 400));
  if (!(await AcademicTerm.findById(academicTermId))) return next(new AppError('Academic term not found', 404));

  const fees = await Fee.find({ academicTermId }).populate('student', 'classId');
  const balances = await Promise.all(fees.map(async (fee) => ({ fee, ...(await getFeeBalance(fee)) })));

  const overall = balances.reduce((acc, b) => {
    acc.totalDue += Number(b.fee.amountDue);
    acc.totalPaid += b.amountPaid;
    acc.outstanding += Math.max(b.balance, 0);
    return acc;
  }, { totalDue: 0, totalPaid: 0, outstanding: 0 });
  overall.collectionRate = overall.totalDue > 0 ? round1((overall.totalPaid / overall.totalDue) * 100) : null;

  const byClass = new Map();
  balances.forEach((b) => {
    const classId = b.fee.student?.classId ? b.fee.student.classId.toString() : 'unassigned';
    if (!byClass.has(classId)) byClass.set(classId, { totalDue: 0, totalPaid: 0, outstanding: 0 });
    const entry = byClass.get(classId);
    entry.totalDue += Number(b.fee.amountDue);
    entry.totalPaid += b.amountPaid;
    entry.outstanding += Math.max(b.balance, 0);
  });

  const classIds = [...byClass.keys()].filter((id) => id !== 'unassigned');
  const classes = await Class.find({ _id: { $in: classIds } }, { name: 1, section: 1 });
  const classById = new Map(classes.map((c) => [c.id, c]));

  const byClassOut = [...byClass.entries()].map(([classId, stats]) => {
    const cls = classById.get(classId);
    return {
      classId: classId === 'unassigned' ? null : classId,
      className: cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Unassigned',
      ...stats,
      collectionRate: stats.totalDue > 0 ? round1((stats.totalPaid / stats.totalDue) * 100) : null,
    };
  });

  res.json({ success: true, data: { overall, byClass: byClassOut } });
});

module.exports = { getAcademic, getFinancial };
