import { useEffect, useState } from 'react';
import { getDailyFeedingRoster, chargeFeedingDay, getFeedingDaySummary } from '../../api/feedingFees.api';
import { formatCurrency } from '../../utils/currency';

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyFeedingPanel({ classes }) {
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!classId || !date) { setRoster(null); setSummary(null); return; }
    setIsLoading(true);
    setError('');
    try {
      const [rosterData, summaryData] = await Promise.all([
        getDailyFeedingRoster(classId, date),
        getFeedingDaySummary(classId, date),
      ]);
      setRoster(rosterData);
      setSummary(summaryData);
      setSelected(new Set(rosterData.filter((r) => r.billableByDefault && !r.alreadyCharged).map((r) => r.studentId)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the feeding roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const toggleStudent = (studentId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleCharge = async () => {
    setIsCharging(true);
    setError('');
    try {
      await chargeFeedingDay({ classId, date, studentIds: [...selected] });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to charge feeding fees.');
    } finally {
      setIsCharging(false);
    }
  };

  const chargeableCount = roster ? roster.filter((r) => !r.alreadyCharged).length : 0;

  return (
    <div>
      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select a class...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {roster && chargeableCount > 0 && (
            <button type="button" className="btn-primary" onClick={handleCharge} disabled={isCharging || selected.size === 0}>
              {isCharging ? 'Charging...' : `Charge Selected (${selected.size})`}
            </button>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}
        {!classId && <p className="muted">Select a class and date to record feeding fees.</p>}
        {isLoading && <p className="muted">Loading...</p>}

        {!isLoading && roster && (
          <table>
            <thead><tr><th /><th>Student</th><th>Attendance</th><th>Status</th></tr></thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.studentId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(r.studentId)}
                      disabled={r.alreadyCharged}
                      onChange={() => toggleStudent(r.studentId)}
                    />
                  </td>
                  <td>{r.firstName} {r.lastName} <span className="muted" style={{ fontSize: 12 }}>({r.admissionNo})</span></td>
                  <td>{r.attendanceStatus || <span className="muted">Not recorded</span>}</td>
                  <td>
                    {r.alreadyCharged
                      ? <span className="badge badge-success">Charged</span>
                      : (r.billableByDefault ? <span className="badge badge-neutral">Billable</span> : <span className="badge badge-warning">Exempt (Absent)</span>)}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && <tr><td colSpan={4} className="muted">No active students in this class.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {summary && (
        <div className="panel">
          <h2>End-of-Day Summary</h2>
          <div className="stat-card-row">
            <div className="stat-card stat-card-accent">
              <div><div className="stat-card-label">Students Charged</div><div className="stat-card-value">{summary.studentsCharged}</div></div>
            </div>
            <div className="stat-card stat-card-warning">
              <div><div className="stat-card-label">Total Charged</div><div className="stat-card-value">{formatCurrency(summary.totalCharged)}</div></div>
            </div>
            <div className="stat-card stat-card-success">
              <div><div className="stat-card-label">Total Collected</div><div className="stat-card-value">{formatCurrency(summary.totalCollected)}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
