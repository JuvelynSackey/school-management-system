const { Result, TerminalReport } = require('../models');
const { getSchemeForSchool } = require('./grading.service');
const { buildAttendanceSummary } = require('./attendanceReport.service');
const { buildFinanceSummary } = require('./financeReport.service');

// A transparent, explainable composite — never a black box. Every component
// reuses an aggregate this app already computes and shows elsewhere
// (attendance %, fee collection %, report-lock %), so the score can never
// quietly disagree with what an admin sees on the Intelligence/Reports
// pages for the same term.
const WEIGHTS = {
  academic: 0.40, attendance: 0.30, feeCollection: 0.15, reportApproval: 0.15,
};

const getAcademicAverage = async (academicTermId, scheme) => {
  const maxTotal = (scheme?.classScoreMax ?? 50) + (scheme?.examScoreMax ?? 50);
  if (maxTotal <= 0) return null;
  const results = await Result.find({ academicTermId }, { totalScore: 1 });
  if (results.length === 0) return null;
  const rawAverage = results.reduce((sum, r) => sum + r.totalScore, 0) / results.length;
  return Math.round((rawAverage / maxTotal) * 1000) / 10;
};

const getReportApprovalRate = async (academicTermId) => {
  const [locked, total] = await Promise.all([
    TerminalReport.countDocuments({ academicTermId, status: 'Locked' }),
    TerminalReport.countDocuments({ academicTermId }),
  ]);
  return total > 0 ? Math.round((locked / total) * 1000) / 10 : null;
};

// A school with nothing recorded yet for one input (e.g. no fees assigned
// this term) shouldn't have its score dragged toward zero by an input that
// simply doesn't apply yet — that input's weight is redistributed
// proportionally among whichever components DO have data. A brand-new
// school with nothing recorded anywhere returns score: null, not 0.
const computeHealthScore = async ({ schoolId, academicTermId }) => {
  const scheme = await getSchemeForSchool(schoolId);
  const [academic, attendance, finance, reportApproval] = await Promise.all([
    getAcademicAverage(academicTermId, scheme),
    buildAttendanceSummary({ academicTermId }),
    buildFinanceSummary({ academicTermId }),
    getReportApprovalRate(academicTermId),
  ]);

  const feeCollection = finance.totalAssigned > 0
    ? Math.round((finance.totalCollected / finance.totalAssigned) * 1000) / 10
    : null;

  const components = {
    academic, attendance: attendance.overallPercent, feeCollection, reportApproval,
  };

  const available = Object.entries(components).filter(([, v]) => v !== null && v !== undefined);
  let score = null;
  if (available.length > 0) {
    const totalWeight = available.reduce((sum, [key]) => sum + WEIGHTS[key], 0);
    const weightedSum = available.reduce((sum, [key, value]) => sum + WEIGHTS[key] * value, 0);
    score = Math.round((weightedSum / totalWeight) * 10) / 10;
  }

  return { score, components, weights: WEIGHTS };
};

module.exports = { computeHealthScore, WEIGHTS };
