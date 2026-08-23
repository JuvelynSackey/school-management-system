import { useEffect, useState } from 'react';
import { getAcademicHistory } from '../../api/results.api';

// Complements PerformanceInsightsPanel's single "latest trend" number with
// the full term-over-term picture — overall average plus a per-subject
// progression. Same quiet-when-nothing-to-show behavior: no history yet is
// a normal state (a new student, or one term on record), not an error.
export default function AcademicHistoryPanel({ studentId }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    getAcademicHistory(studentId).then(setHistory).catch(() => setHistory(null));
  }, [studentId]);

  if (!history) return null;
  const { overallHistory, subjectHistory } = history;
  if (overallHistory.length === 0 && subjectHistory.length === 0) return null;

  const trendArrow = (from, to) => {
    if (to > from) return '📈';
    if (to < from) return '📉';
    return '➡️';
  };

  const renderSeries = (scores, valueKey) => (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      {scores.map((s, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span aria-hidden="true">{trendArrow(scores[i - 1][valueKey], s[valueKey])}</span>}
          <span style={{ fontSize: 13 }}>{s.term}: <strong>{s[valueKey]}%</strong></span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="panel">
      <h2>Academic Progress History</h2>
      {overallHistory.length > 0 && (
        <div style={{ marginBottom: subjectHistory.length > 0 ? 16 : 0 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Overall average, by term</p>
          {renderSeries(overallHistory, 'average')}
        </div>
      )}
      {subjectHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {subjectHistory.map((s) => (
            <div key={s.subject}>
              <p className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{s.subject}</p>
              {renderSeries(s.scores, 'score')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
