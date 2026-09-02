const {
  Class, Subject, AcademicTerm, Fee,
} = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');
const { getFeeBalance } = require('../services/fees.service');
const {
  round1, classAverages, subjectAverages, overallPassRate, resolvePreviousTerm,
} = require('../services/academicAnalytics.service');
const { getDataQualityReport } = require('../services/dataQuality.service');
const { getBeceReadinessReport } = require('../services/beceReadiness.service');
const { getOperationsOverviewReport } = require('../services/operationsOverview.service');
const { UNRANKED_LEVEL_ORDER } = require('../constants/gradeLevels');

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

  const classes = await Class.find({ _id: { $in: classRows.map((r) => r._id) } }, { name: 1, section: 1, levelOrder: 1 });
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
  }).sort((a, b) => (classById.get(a.classId)?.levelOrder ?? UNRANKED_LEVEL_ORDER)
    - (classById.get(b.classId)?.levelOrder ?? UNRANKED_LEVEL_ORDER));

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
  const classes = await Class.find({ _id: { $in: classIds } }, { name: 1, section: 1, levelOrder: 1 });
  const classById = new Map(classes.map((c) => [c.id, c]));

  const byClassOut = [...byClass.entries()].map(([classId, stats]) => {
    const cls = classById.get(classId);
    return {
      classId: classId === 'unassigned' ? null : classId,
      className: cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Unassigned',
      ...stats,
      collectionRate: stats.totalDue > 0 ? round1((stats.totalPaid / stats.totalDue) * 100) : null,
    };
  }).sort((a, b) => (classById.get(a.classId)?.levelOrder ?? UNRANKED_LEVEL_ORDER)
    - (classById.get(b.classId)?.levelOrder ?? UNRANKED_LEVEL_ORDER));

  res.json({ success: true, data: { overall, byClass: byClassOut } });
});

// GET /analytics/data-quality
const getDataQuality = asyncHandler(async (req, res) => {
  const report = await getDataQualityReport();
  res.json({ success: true, data: report });
});

// GET /analytics/bece-readiness
const getBeceReadiness = asyncHandler(async (req, res) => {
  const report = await getBeceReadinessReport();
  res.json({ success: true, data: report });
});

// GET /analytics/operations-overview
const getOperationsOverview = asyncHandler(async (req, res) => {
  const report = await getOperationsOverviewReport();
  res.json({ success: true, data: report });
});

module.exports = {
  getAcademic, getFinancial, getDataQuality, getBeceReadiness, getOperationsOverview,
};
