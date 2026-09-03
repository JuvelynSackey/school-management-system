const { mongoose, Result } = require('../models');

// Purely advisory, deterministic, and never calls the AI on its own — see
// the boundary rule in results.controller.js's getAnomalies: a flag is a
// yellow badge on the admin's review screen, never a gate on recordBulk or
// approve. Thresholds are heuristics for "worth a second look before
// approving," not a claim of certainty.
const PERFORMANCE_DROP_THRESHOLD = 0.25; // a 25%+ drop vs. the student's own history in this subject
const SCORE_GAP_THRESHOLD_POINTS = 40; // percentage points between normalized class% and exam%
const MIN_HISTORY_TERMS = 1;
const STDDEV_THRESHOLD = 2.5; // z-score magnitude past which a score is a statistical outlier
const MIN_HISTORY_FOR_STDDEV = 3; // fewer prior terms than this and a stddev isn't meaningful
// A student whose own history happens to be unusually consistent (small
// stdDev over 3+ terms) can have an ordinary few-point difference this term
// blow past 2.5sigma on stdDev alone. Kept as a second, independent gate
// rather than flooring stdDev, so the sigma figure this produces (surfaced
// to the admin) always reflects the real numbers, not a dampened one.
const MIN_ABSOLUTE_DELTA = 10; // out of a /100 total — more than one grade band's worth of gap

// One batched aggregate for a whole roster's worth of students, rather than
// a per-student query — this is also what getRoster uses to hand the
// frontend live, per-keystroke σ bounds without any further network calls.
// Result.aggregate() bypasses tenantScopePlugin, so schoolId is matched
// explicitly to avoid leaking another tenant's scores.
const getHistoricalStatsForRoster = async (schoolId, studentIds, subjectId, academicTermId) => {
  if (studentIds.length === 0) return new Map();
  const rows = await Result.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
        subjectId: new mongoose.Types.ObjectId(subjectId),
        academicTermId: { $ne: new mongoose.Types.ObjectId(academicTermId) },
      },
    },
    {
      $group: {
        _id: '$studentId', mean: { $avg: '$totalScore' }, stdDev: { $stdDevSamp: '$totalScore' }, count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((r) => [
    r._id.toString(),
    { mean: Math.round(r.mean * 10) / 10, stdDev: Math.round((r.stdDev || 0) * 10) / 10, count: r.count },
  ]));
};

// A genuinely different signal from detectPerformanceDrop's flat 25% ratio:
// a naturally high-variance student's usual swings won't trip this, while a
// usually-rock-steady student's smaller-but-unusual swing will.
const detectStatisticalOutlier = (totalScore, stats) => {
  if (!stats || stats.count < MIN_HISTORY_FOR_STDDEV || stats.stdDev <= 0) return null;
  const delta = totalScore - stats.mean;
  const z = delta / stats.stdDev;
  if (Math.abs(z) < STDDEV_THRESHOLD || Math.abs(delta) < MIN_ABSOLUTE_DELTA) return null;

  const direction = z < 0 ? 'below' : 'above';
  return {
    type: 'statistical_outlier',
    message: `Scored ${totalScore}, ${Math.abs(z).toFixed(1)}σ ${direction} their own ${stats.count}-term average (${stats.mean}) in this subject — unusual even accounting for their normal variation.`,
  };
};

// Compares this term's total against the student's own average in the SAME
// subject across other terms — a student's usual level is the only
// meaningful baseline here, not the class average (a strong class doesn't
// make an individual drop less real, and a weak class doesn't manufacture one).
const detectPerformanceDrop = async (studentId, subjectId, academicTermId, totalScore) => {
  const priorResults = await Result.find({
    studentId, subjectId, academicTermId: { $ne: academicTermId },
  }).select('totalScore').limit(12);
  if (priorResults.length < MIN_HISTORY_TERMS) return null;

  const historicalAverage = priorResults.reduce((sum, r) => sum + r.totalScore, 0) / priorResults.length;
  if (historicalAverage <= 0) return null;

  const dropRatio = (historicalAverage - totalScore) / historicalAverage;
  if (dropRatio < PERFORMANCE_DROP_THRESHOLD) return null;

  return {
    type: 'performance_drop',
    message: `Scored ${totalScore}, about ${Math.round(dropRatio * 100)}% below their ${priorResults.length}-term average of ${Math.round(historicalAverage)} in this subject.`,
  };
};

// A large gap between class score and exam score (normalized to the
// school's own score maxes) is a common shape of data-entry slip — e.g. a
// digit transposed, or a score entered against the wrong column — as well
// as a genuine signal (strong coursework, poor exam performance or vice
// versa). Either way it's worth a glance before approving.
const detectScoreDiscrepancy = (classScore, examScore, scheme) => {
  if (!scheme?.classScoreMax || !scheme?.examScoreMax) return null;
  const classPct = (classScore / scheme.classScoreMax) * 100;
  const examPct = (examScore / scheme.examScoreMax) * 100;
  const gap = Math.abs(classPct - examPct);
  if (gap < SCORE_GAP_THRESHOLD_POINTS) return null;

  return {
    type: 'score_discrepancy',
    message: `Class score (${Math.round(classPct)}%) and exam score (${Math.round(examPct)}%) differ sharply — worth checking for a possible data-entry error.`,
  };
};

// One class/subject/term's worth of already-recorded Results only — a
// student with no score yet has nothing to flag. Returns only the students
// that actually have at least one flag, keyed by studentId.
const detectAnomalies = async ({
  schoolId, classId, subjectId, academicTermId, scheme,
}) => {
  const results = await Result.find({ classId, subjectId, academicTermId });
  const statsByStudent = await getHistoricalStatsForRoster(
    schoolId, results.map((r) => r.studentId.toString()), subjectId, academicTermId,
  );

  const flagged = await Promise.all(results.map(async (r) => {
    const studentFlags = [];
    const drop = await detectPerformanceDrop(r.studentId, subjectId, academicTermId, r.totalScore);
    if (drop) studentFlags.push(drop);
    const discrepancy = detectScoreDiscrepancy(r.classScore, r.examScore, scheme);
    if (discrepancy) studentFlags.push(discrepancy);
    const outlier = detectStatisticalOutlier(r.totalScore, statsByStudent.get(r.studentId.toString()));
    if (outlier) studentFlags.push(outlier);
    return studentFlags.length > 0 ? { studentId: r.studentId.toString(), flags: studentFlags } : null;
  }));

  return flagged.filter(Boolean);
};

module.exports = {
  detectAnomalies,
  getHistoricalStatsForRoster,
  detectStatisticalOutlier,
  PERFORMANCE_DROP_THRESHOLD,
  SCORE_GAP_THRESHOLD_POINTS,
  STDDEV_THRESHOLD,
  MIN_HISTORY_FOR_STDDEV,
  MIN_ABSOLUTE_DELTA,
};
