// Pure, deterministic calculation — no AI involved. Works from exactly the
// same approved-results history the Results panel on StudentProfile/MyResults
// already renders, just summarized: a multi-term trend and this term's
// strongest/weakest subjects. The AI narrative (ai.service.js's
// generatePerformanceNarrative) is a purely optional layer on top of this,
// built by results.controller.js's getInsights — this file never calls it.

// A trend under this magnitude is called 'steady' rather than manufacturing
// a direction out of noise — small term-to-term wobble is normal.
const STEADY_BAND_PERCENT = 3;
const STRONG_SUBJECT_THRESHOLD_PERCENT = 75;
const NEEDS_ATTENTION_THRESHOLD_PERCENT = 50;
const MAX_LISTED_SUBJECTS = 2;

// results: an array of populated Result docs — each needs .totalScore,
// .subject.name, and .academicTerm.{name,startDate}. Terms with no
// startDate are excluded from ordering (can't be placed on a timeline),
// not from the raw data otherwise.
const computeInsights = ({ results, scheme }) => {
  const maxTotal = (scheme?.classScoreMax ?? 50) + (scheme?.examScoreMax ?? 50);

  const byTerm = new Map();
  results.forEach((r) => {
    const termId = r.academicTerm?.id;
    const startDate = r.academicTerm?.startDate;
    if (!termId || !startDate) return;
    if (!byTerm.has(termId)) byTerm.set(termId, { startDate, scores: [] });
    byTerm.get(termId).scores.push(r.totalScore);
  });

  const orderedTerms = [...byTerm.entries()].sort(
    (a, b) => new Date(a[1].startDate) - new Date(b[1].startDate),
  );
  const termAverages = orderedTerms.map(
    ([, t]) => t.scores.reduce((sum, v) => sum + v, 0) / t.scores.length,
  );

  let trend = { direction: null, deltaPercent: null, termsCompared: termAverages.length };
  if (termAverages.length >= 2) {
    const latest = termAverages[termAverages.length - 1];
    const previous = termAverages[termAverages.length - 2];
    const delta = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
    let direction = 'steady';
    if (delta > STEADY_BAND_PERCENT) direction = 'improving';
    else if (delta < -STEADY_BAND_PERCENT) direction = 'declining';
    trend = { direction, deltaPercent: Math.round(delta), termsCompared: termAverages.length };
  }

  const mostRecentTermId = orderedTerms.length > 0 ? orderedTerms[orderedTerms.length - 1][0] : null;
  const currentTermSubjects = results
    .filter((r) => r.academicTerm?.id === mostRecentTermId)
    .map((r) => ({
      subjectName: r.subject?.name || 'Unknown subject',
      percentage: maxTotal > 0 ? Math.round((r.totalScore / maxTotal) * 100) : 0,
    }));

  const strongestSubjects = currentTermSubjects
    .filter((s) => s.percentage >= STRONG_SUBJECT_THRESHOLD_PERCENT)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, MAX_LISTED_SUBJECTS);

  const needsAttentionSubjects = currentTermSubjects
    .filter((s) => s.percentage < NEEDS_ATTENTION_THRESHOLD_PERCENT)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, MAX_LISTED_SUBJECTS);

  return { trend, strongestSubjects, needsAttentionSubjects };
};

// Same input shape and term-ordering rule as computeInsights (sorted by
// academicTerm.startDate; a term without one can't be placed on a timeline
// and is excluded) — this just returns the full history instead of
// collapsing it into a single trend number, for the Academic Progress
// History card on StudentProfile.
const computeAcademicHistory = ({ results, scheme }) => {
  const maxTotal = (scheme?.classScoreMax ?? 50) + (scheme?.examScoreMax ?? 50);
  const pct = (score) => (maxTotal > 0 ? Math.round((score / maxTotal) * 100) : null);

  const termById = new Map();
  results.forEach((r) => {
    const termId = r.academicTerm?.id;
    const startDate = r.academicTerm?.startDate;
    if (!termId || !startDate) return;
    if (!termById.has(termId)) {
      termById.set(termId, {
        termId, termName: r.academicTerm.name, startDate, scores: [],
      });
    }
    termById.get(termId).scores.push(r.totalScore);
  });
  const orderedTerms = [...termById.values()].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const overallHistory = orderedTerms.map((t) => ({
    term: t.termName,
    average: pct(t.scores.reduce((sum, v) => sum + v, 0) / t.scores.length),
  }));

  const bySubject = new Map();
  results.forEach((r) => {
    const termId = r.academicTerm?.id;
    if (!termId || !termById.has(termId)) return;
    const subjectName = r.subject?.name || 'Unknown subject';
    if (!bySubject.has(subjectName)) bySubject.set(subjectName, new Map());
    bySubject.get(subjectName).set(termId, pct(r.totalScore));
  });
  const subjectHistory = [...bySubject.entries()]
    .map(([subject, scoresByTerm]) => ({
      subject,
      scores: orderedTerms
        .filter((t) => scoresByTerm.has(t.termId))
        .map((t) => ({ term: t.termName, score: scoresByTerm.get(t.termId) })),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  return { overallHistory, subjectHistory };
};

module.exports = { computeInsights, computeAcademicHistory };
