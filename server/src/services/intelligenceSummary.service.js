const { Student, Class, Result } = require('../models');
const earlyWarning = require('./earlyWarning.service');
const performanceInsights = require('./performanceInsights.service');
const { buildAttendanceSummary } = require('./attendanceReport.service');
const { classAverages, subjectPassRates, round1 } = require('./academicAnalytics.service');

// Subjects where under half the class is passing — a real, computed
// threshold, not a claim about which subjects are "core" (the Subject model
// has no such field, so we don't fabricate that distinction).
const SUBJECT_ALERT_PASS_RATE_CUTOFF = 50;

// School-wide counts for the Intelligence overview: how many active
// students are currently flagged at risk (earlyWarning.service.js's
// existing definition — same list the At-Risk Students view shows), and how
// many show an "improving" multi-term trend (performanceInsights.service.js
// — the same trend engine detectAcademicDeclineFlag already uses, just
// read for its positive case instead of its negative one).
const countStudentFlags = async ({ academicTermId, scheme }) => {
  const students = await Student.find({ status: 'active' }, { _id: 1 });

  const perStudent = await Promise.all(students.map(async (s) => {
    const [flags, results] = await Promise.all([
      earlyWarning.detectRiskFlags({ studentId: s.id, academicTermId, scheme }),
      Result.find({ studentId: s.id }).populate('subject', 'name').populate('academicTerm', 'name startDate'),
    ]);
    const { trend } = performanceInsights.computeInsights({ results, scheme });
    return { atRisk: flags.length > 0, improving: trend.direction === 'improving' };
  }));

  return {
    atRiskCount: perStudent.filter((s) => s.atRisk).length,
    improvingCount: perStudent.filter((s) => s.improving).length,
  };
};

const buildIntelligenceSummary = async ({ schoolId, academicTermId, scheme }) => {
  const [{ atRiskCount, improvingCount }, attendance, classRows, subjectRates] = await Promise.all([
    countStudentFlags({ academicTermId, scheme }),
    buildAttendanceSummary({ academicTermId }),
    classAverages(schoolId, academicTermId),
    subjectPassRates(schoolId, academicTermId),
  ]);

  let topClass = null;
  if (classRows.length > 0) {
    const best = classRows.reduce((a, b) => (b.average > a.average ? b : a));
    const classRow = await Class.findById(best._id);
    topClass = {
      classId: best._id.toString(),
      className: classRow ? `${classRow.name} ${classRow.section || ''}`.trim() : 'Unknown',
      average: round1(best.average),
    };
  }

  const subjectAlerts = subjectRates
    .filter((s) => s.passRate < SUBJECT_ALERT_PASS_RATE_CUTOFF)
    .sort((a, b) => a.passRate - b.passRate);

  return {
    atRiskCount,
    improvingCount,
    termAttendanceAveragePercent: attendance.overallPercent,
    topClass,
    subjectAlerts,
  };
};

module.exports = { buildIntelligenceSummary, SUBJECT_ALERT_PASS_RATE_CUTOFF };
