const { Result } = require('../models');

// Purely advisory, deterministic, and never calls the AI on its own — see
// the boundary rule in results.controller.js's getAnomalies: a flag is a
// yellow badge on the admin's review screen, never a gate on recordBulk or
// approve. Thresholds are heuristics for "worth a second look before
// approving," not a claim of certainty.
const PERFORMANCE_DROP_THRESHOLD = 0.25; // a 25%+ drop vs. the student's own history in this subject
const SCORE_GAP_THRESHOLD_POINTS = 40; // percentage points between normalized class% and exam%
const MIN_HISTORY_TERMS = 1;

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
const detectAnomalies = async ({ classId, subjectId, academicTermId, scheme }) => {
  const results = await Result.find({ classId, subjectId, academicTermId });

  const flagged = await Promise.all(results.map(async (r) => {
    const studentFlags = [];
    const drop = await detectPerformanceDrop(r.studentId, subjectId, academicTermId, r.totalScore);
    if (drop) studentFlags.push(drop);
    const discrepancy = detectScoreDiscrepancy(r.classScore, r.examScore, scheme);
    if (discrepancy) studentFlags.push(discrepancy);
    return studentFlags.length > 0 ? { studentId: r.studentId.toString(), flags: studentFlags } : null;
  }));

  return flagged.filter(Boolean);
};

module.exports = {
  detectAnomalies, PERFORMANCE_DROP_THRESHOLD, SCORE_GAP_THRESHOLD_POINTS,
};
