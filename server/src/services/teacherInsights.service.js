const { mongoose, Result, Student } = require('../models');
const { getSchemeForSchool } = require('./grading.service');
const { computeInsights } = require('./performanceInsights.service');
const { round1, passCutoffFor } = require('./academicAnalytics.service');
const { SUBJECT_ALERT_PASS_RATE_CUTOFF } = require('./intelligenceSummary.service');

const TOP_IMPROVING_LIMIT = 5;

// This term's average score and pass rate for each of a teacher's own
// (classId, subjectId) assignments — the same average/pass-rate
// definitions academicAnalytics.service.js uses school-wide, just grouped
// one level finer (by the exact pair a teacher teaches, not the whole class
// or subject alone) since one teacher can teach several classes, or several
// subjects, with very different results in each.
// Result.aggregate() bypasses tenantScopePlugin — schoolId is matched
// explicitly, same as every other aggregate in this codebase.
const getAssignmentPerformance = async (schoolId, academicTermId, assignments) => {
  if (assignments.length === 0) return [];
  const scheme = await getSchemeForSchool(schoolId);
  const passCutoff = passCutoffFor(scheme);

  const rows = await Result.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        academicTermId: new mongoose.Types.ObjectId(academicTermId),
        $or: assignments.map((a) => ({
          classId: new mongoose.Types.ObjectId(a.classId),
          subjectId: new mongoose.Types.ObjectId(a.subjectId),
        })),
      },
    },
    {
      $group: {
        _id: { classId: '$classId', subjectId: '$subjectId' },
        average: { $avg: '$totalScore' },
        count: { $sum: 1 },
        passCount: { $sum: { $cond: [{ $gte: ['$totalScore', passCutoff] }, 1, 0] } },
      },
    },
  ]);

  const byKey = new Map(rows.map((r) => [`${r._id.classId}:${r._id.subjectId}`, r]));
  return assignments.map((a) => {
    const row = byKey.get(`${a.classId}:${a.subjectId}`);
    const passRate = row ? Math.round((row.passCount / row.count) * 100) : null;
    return {
      classId: a.classId,
      className: a.className,
      subjectId: a.subjectId,
      subjectName: a.subjectName,
      average: row ? round1(row.average) : null,
      passRate,
      resultCount: row?.count ?? 0,
      // Same "under half the class is passing" bar Intelligence's
      // subjectAlerts already uses school-wide — reused here rather than
      // inventing a second failure-rate threshold for the same idea.
      lowPassRate: passRate !== null && passRate < SUBJECT_ALERT_PASS_RATE_CUTOFF,
    };
  });
};

// Reuses the exact same multi-term trend engine (and 'improving' threshold)
// as the Dashboard's At-Risk panel and Intelligence's "Improving Performers"
// count — just filtered down to the students in THIS teacher's own classes,
// so "top improving" here can never quietly disagree with what those
// already say about the same student.
const getTopImprovingStudents = async (schoolId, classIds) => {
  if (classIds.length === 0) return [];
  const scheme = await getSchemeForSchool(schoolId);
  const students = await Student.find(
    { classId: { $in: classIds }, status: 'active' },
    { firstName: 1, lastName: 1 },
  );
  if (students.length === 0) return [];

  const withTrend = await Promise.all(students.map(async (s) => {
    const results = await Result.find({ studentId: s.id })
      .populate('subject', 'name')
      .populate('academicTerm', 'name startDate');
    const { trend } = computeInsights({ results, scheme });
    return {
      studentId: s.id, name: `${s.firstName} ${s.lastName}`, deltaPercent: trend.deltaPercent, direction: trend.direction,
    };
  }));

  return withTrend
    .filter((s) => s.direction === 'improving')
    .sort((a, b) => b.deltaPercent - a.deltaPercent)
    .slice(0, TOP_IMPROVING_LIMIT)
    .map(({ studentId, name, deltaPercent }) => ({ studentId, name, deltaPercent }));
};

module.exports = { getAssignmentPerformance, getTopImprovingStudents };
