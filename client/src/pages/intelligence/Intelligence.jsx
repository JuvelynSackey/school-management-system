import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIntelligenceSummary, getHealthScore } from '../../api/intelligence.api';
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

const HEALTH_COMPONENT_LABELS = {
  academic: 'Academic Average', attendance: 'Attendance Rate', feeCollection: 'Fee Collection Rate', reportApproval: 'Report Approval Rate',
};

const scoreTone = (score) => {
  if (score === null) return 'neutral';
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
};

function HealthScoreBadge({ health }) {
  const [expanded, setExpanded] = useState(false);
  if (!health) return null;
  const { score, components, weights } = health;

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>School Health Score</h2>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>Academic 40% · Attendance 30% · Fee Collection 15% · Report Approval 15%</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`badge badge-${scoreTone(score)}`} style={{ fontSize: 18, padding: '6px 16px' }}>
            {score === null ? 'No data yet' : `${score} / 100`}
          </span>
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(components).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13.5 }}>{HEALTH_COMPONENT_LABELS[key]} <span className="muted">({Math.round(weights[key] * 100)}% weight)</span></span>
              <span style={{ fontWeight: 600 }}>{value === null ? 'No data yet' : `${value}%`}</span>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            A component with no data yet is excluded, and its weight is redistributed among the others — it never drags the score toward zero.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Intelligence() {
  const [terms, setTerms] = useState([]);
  const [academicTermId, setAcademicTermId] = useState('');
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);
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
    getHealthScore({ academicTermId }).then(setHealth).catch(() => setHealth(null));
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
          <HealthScoreBadge health={health} />

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
