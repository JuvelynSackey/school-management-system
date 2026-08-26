import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getAcademicHistory } from '../../api/results.api';
import { useTheme } from '../../context/ThemeContext';

const CHROME = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7' },
  dark: { grid: '#3a3760', axis: '#8783ab' },
};

// Fixed hue order, matching the app's existing "assign categorical colors in
// a fixed order, never cycled/random" convention — cycles only if a student
// somehow has more distinct subjects than colors here.
const SUBJECT_COLORS = ['#2a78d6', '#e0af2e', '#16a34a', '#db2777', '#7c3aed', '#0e7490', '#dc2626', '#65a30d'];

// Complements PerformanceInsightsPanel's single "latest trend" number with
// the full term-over-term picture — overall average, class position, and a
// per-subject trajectory chart. Same quiet-when-nothing-to-show behavior: no
// history yet is a normal state (a new student, or one term on record), not
// an error.
export default function AcademicHistoryPanel({ studentId }) {
  const [history, setHistory] = useState(null);
  const { isDark } = useTheme();
  const chrome = isDark ? CHROME.dark : CHROME.light;

  useEffect(() => {
    if (!studentId) return;
    getAcademicHistory(studentId).then(setHistory).catch(() => setHistory(null));
  }, [studentId]);

  const overallChartData = useMemo(() => {
    if (!history) return [];
    const positionByTerm = new Map((history.positionHistory || []).map((p) => [p.term, p.classPosition]));
    return history.overallHistory.map((h) => ({
      term: h.term, Average: h.average, Position: positionByTerm.get(h.term) ?? null,
    }));
  }, [history]);

  const subjectChartData = useMemo(() => {
    if (!history) return { data: [], subjects: [] };
    const subjects = history.subjectHistory.map((s) => s.subject);
    const data = history.overallHistory.map((h) => {
      const row = { term: h.term };
      history.subjectHistory.forEach((s) => {
        const match = s.scores.find((sc) => sc.term === h.term);
        if (match) row[s.subject] = match.score;
      });
      return row;
    });
    return { data, subjects };
  }, [history]);

  if (!history) return null;
  const { overallHistory, subjectHistory, positionHistory } = history;
  if (overallHistory.length === 0 && subjectHistory.length === 0) return null;

  const hasPosition = positionHistory && positionHistory.length > 0;
  const showAsChart = overallHistory.length >= 2;

  return (
    <div className="panel">
      <h2>Academic Progress History</h2>

      {overallHistory.length > 0 && (
        <div style={{ marginBottom: subjectHistory.length > 0 ? 20 : 0 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            Overall average by term{hasPosition ? ' (with class position)' : ''}
          </p>
          {showAsChart ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overallChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="term" tick={{ fontSize: 12 }} stroke={chrome.axis} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 12 }} stroke={chrome.axis} unit="%" />
                {hasPosition && (
                  <YAxis yAxisId="right" orientation="right" reversed tick={{ fontSize: 12 }} stroke={chrome.axis} allowDecimals={false} label={{ value: 'Position', angle: 90, position: 'insideRight', fontSize: 11, fill: chrome.axis }} />
                )}
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="Average" stroke="#2a78d6" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                {hasPosition && (
                  <Line yAxisId="right" type="monotone" dataKey="Position" name="Class Position" stroke="#e0af2e" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 13 }}>{overallHistory[0].term}: <strong>{overallHistory[0].average}%</strong>{hasPosition && positionHistory[0] && ` — Position ${positionHistory[0].classPosition}`}</p>
          )}
        </div>
      )}

      {subjectHistory.length > 0 && (
        <div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Subject-by-subject trajectory</p>
          {showAsChart ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={subjectChartData.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="term" tick={{ fontSize: 12 }} stroke={chrome.axis} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke={chrome.axis} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {subjectChartData.subjects.map((subject, i) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {subjectHistory.map((s) => (
                <p key={s.subject} style={{ fontSize: 13, margin: 0 }}>{s.subject}: <strong>{s.scores[0]?.score}%</strong></p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
