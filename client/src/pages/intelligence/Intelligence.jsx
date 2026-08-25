import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIntelligenceSummary } from '../../api/intelligence.api';
import { listTerms } from '../../api/terms.api';
import { AtRiskStudentsPanel } from '../dashboard/Dashboard';

function MetricBadge({ label, value, tone }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
      </div>
    </div>
  );
}

export default function Intelligence() {
  const [terms, setTerms] = useState([]);
  const [academicTermId, setAcademicTermId] = useState('');
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listTerms().then((data) => {
      setTerms(data);
      const current = data.find((t) => t.isCurrent) || data[0];
      if (current) setAcademicTermId(current.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!academicTermId) return;
    setIsLoading(true);
    setError('');
    getIntelligenceSummary({ academicTermId })
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load Intelligence summary.'))
      .finally(() => setIsLoading(false));
  }, [academicTermId]);

  return (
    <div>
      <div className="toolbar">
        <h1>🧠 JesManage Intelligence</h1>
        <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
        A second opinion built from the results, attendance, and fee data your school already has — never a decision. Every suggestion is reviewed, edited, or dismissed by a real person before it counts.
      </p>

      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}

      {summary && !isLoading && (
        <>
          <div className="stat-card-row" style={{ marginBottom: 20 }}>
            <MetricBadge label="At-Risk Students" value={summary.atRiskCount} tone="warning" />
            <MetricBadge label="Improving Performers" value={summary.improvingCount} tone="success" />
            <MetricBadge
              label="Term Attendance Average"
              value={summary.termAttendanceAveragePercent === null ? '—' : `${summary.termAttendanceAveragePercent}%`}
              tone="cyan"
            />
          </div>

          <div className="panel">
            <h2>Class Performance</h2>
            {summary.topClass ? (
              <p>
                <strong>{summary.topClass.className}</strong> leads with a <strong>{summary.topClass.average}%</strong> term average.
              </p>
            ) : (
              <p className="muted">No results recorded yet this term.</p>
            )}
            <Link className="link-btn" to="/analytics">View Analysis →</Link>
          </div>

          <div className="panel">
            <h2>Subjects Needing Attention</h2>
            <p className="muted" style={{ marginBottom: 12 }}>Subjects where under half the class is passing this term.</p>
            {summary.subjectAlerts.length === 0 ? (
              <p className="muted">No subjects flagged — nothing below the pass-rate threshold right now.</p>
            ) : (
              <table>
                <thead><tr><th>Subject</th><th>Pass Rate</th><th>Average</th><th /></tr></thead>
                <tbody>
                  {summary.subjectAlerts.map((s) => (
                    <tr key={s.subjectId}>
                      <td>{s.subjectName}</td>
                      <td><span className="badge badge-warning">{s.passRate}%</span></td>
                      <td>{s.average}%</td>
                      <td><Link className="link-btn" to="/analytics">View Analysis →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <AtRiskStudentsPanel index={0} />
        </>
      )}
    </div>
  );
}
