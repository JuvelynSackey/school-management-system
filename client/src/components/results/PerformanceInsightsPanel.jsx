import { useEffect, useState } from 'react';
import { getResultInsights } from '../../api/results.api';

const TREND_DISPLAY = {
  improving: { icon: '📈', label: 'Improving' },
  declining: { icon: '📉', label: 'Declining' },
  steady: { icon: '➡️', label: 'Steady' },
};

// Auto-loads, no user action to trigger it and no error UI on failure —
// "not enough history yet" (a new student, or one with a single term on
// record) is a normal, expected state here, not an error, so this panel
// just quietly renders nothing rather than showing a broken-looking gap.
export default function PerformanceInsightsPanel({ studentId }) {
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    getResultInsights(studentId).then(setInsights).catch(() => setInsights(null));
  }, [studentId]);

  if (!insights) return null;

  const { trend, strongestSubjects, needsAttentionSubjects, aiNarrative } = insights;
  const hasTrend = Boolean(trend?.direction);
  const hasAnything = hasTrend || strongestSubjects.length > 0 || needsAttentionSubjects.length > 0;
  if (!hasAnything) return null;

  const trendInfo = hasTrend ? TREND_DISPLAY[trend.direction] : null;

  return (
    <div className="panel">
      <h2>Performance Insights</h2>

      {aiNarrative && (
        <p className="alert-warning" style={{ fontSize: 13 }}>🧠 {aiNarrative}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {hasTrend && (
          <div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Trend (last {trend.termsCompared} terms)</p>
            <p style={{ fontWeight: 600 }}>
              {trendInfo.icon} {trendInfo.label}
              {trend.deltaPercent !== 0 && ` (${trend.deltaPercent > 0 ? '+' : ''}${trend.deltaPercent}% vs. previous term)`}
            </p>
          </div>
        )}
        {strongestSubjects.length > 0 && (
          <div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Strongest this term</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {strongestSubjects.map((s) => (
                <span key={s.subjectName} className="badge badge-success">{s.subjectName} — {s.percentage}%</span>
              ))}
            </div>
          </div>
        )}
        {needsAttentionSubjects.length > 0 && (
          <div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>May need attention</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {needsAttentionSubjects.map((s) => (
                <span key={s.subjectName} className="badge badge-warning">{s.subjectName} — {s.percentage}%</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
