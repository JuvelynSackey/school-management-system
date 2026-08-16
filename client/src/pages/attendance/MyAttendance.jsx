import { useEffect, useState } from 'react';
import { getMyAttendance } from '../../api/attendance.api';

export default function MyAttendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyAttendance()
      .then((data) => { setRecords(data.records); setSummary(data.summary); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load attendance.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1>My Attendance</h1>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <>
          <div className="cards">
            <div className="card"><div>Present</div><div className="num">{summary.Present}</div></div>
            <div className="card"><div>Absent</div><div className="num">{summary.Absent}</div></div>
            <div className="card"><div>Late</div><div className="num">{summary.Late}</div></div>
            <div className="card"><div>Excused</div><div className="num">{summary.Excused}</div></div>
          </div>
          <div className="panel">
            <table>
              <thead><tr><th>Date</th><th>Status</th><th>Term</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.attendanceDate}</td>
                    <td>{r.status}</td>
                    <td>{r.academicTerm?.name || '—'}</td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={3} className="muted">No attendance recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
