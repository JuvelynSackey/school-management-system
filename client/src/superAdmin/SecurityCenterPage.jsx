import { useEffect, useState } from 'react';
import { getFailedLogins } from './api';

const WINDOWS = [
  { label: 'Last hour', hours: 1 },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 7 days', hours: 24 * 7 },
];

export default function SecurityCenterPage() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    getFailedLogins(hours)
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load security data.'))
      .finally(() => setIsLoading(false));
  }, [hours]);

  return (
    <div>
      <div className="toolbar">
        <h1>Security Center</h1>
        <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {WINDOWS.map((w) => <option key={w.hours} value={w.hours}>{w.label}</option>)}
        </select>
      </div>

      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}

      {!isLoading && !error && data && (
        <>
          <div className="stat-card-row">
            <div className="stat-card stat-card-warning">
              <div>
                <div className="stat-card-label">Failed Login Attempts</div>
                <div className="stat-card-value">{data.totalFailedAttempts}</div>
              </div>
            </div>
            <div className="stat-card stat-card-rose">
              <div>
                <div className="stat-card-label">Accounts Flagged</div>
                <div className="stat-card-value">{data.alertCount}</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Failed Login Activity</h2>
            <p className="muted" style={{ marginBottom: 12 }}>Identifiers with 5 or more failed attempts in the window are flagged as an alert.</p>
            <table>
              <thead><tr><th>Identifier</th><th>School</th><th>Attempts</th><th>Last Attempt</th><th>Reasons</th><th /></tr></thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={`${row.schoolId}:${row.identifier}`}>
                    <td>{row.identifier}</td>
                    <td>{row.schoolName}</td>
                    <td>{row.count}</td>
                    <td>{new Date(row.lastAttempt).toLocaleString()}</td>
                    <td>{row.reasons.join(', ')}</td>
                    <td>{row.isAlert && <span className="badge badge-danger">Alert</span>}</td>
                  </tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan={6} className="muted">No failed login attempts in this window.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
