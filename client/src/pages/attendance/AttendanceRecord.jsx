import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listClasses, getMyClassAccess } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import { getRoster, recordAttendance, getClassSummary } from '../../api/attendance.api';
import { useAuth } from '../../context/AuthContext';
import HomeroomBadge from '../../components/common/HomeroomBadge';

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];
const today = () => new Date().toISOString().slice(0, 10);

export default function AttendanceRecord() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState(searchParams.get('classId') || '');
  const [access, setAccess] = useState(null);
  const [date, setDate] = useState(today());
  const [roster, setRoster] = useState([]);
  const [summary, setSummary] = useState([]);
  const [view, setView] = useState('record'); // 'record' | 'summary'
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    listClasses().then((rows) => {
      setClasses(rows);
      if (rows.length && !classId) setClassId(String(rows[0].id));
    }).catch(() => setClasses([]));
    listTerms().then(setTerms).catch(() => setTerms([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The daily register is a homeroom-teacher action — a subject specialist
  // can still view it (loadRoster/loadSummary stay unrestricted), just not
  // record it. isAdmin always gets full write access.
  useEffect(() => {
    if (!classId) return;
    if (isAdmin) { setAccess({ isHomeroom: true, subjectIds: [] }); return; }
    getMyClassAccess(classId).then(setAccess).catch(() => setAccess({ isHomeroom: false, subjectIds: [] }));
  }, [classId, isAdmin]);

  const canRecord = isAdmin || Boolean(access?.isHomeroom);

  const loadRoster = async () => {
    if (!classId || !date) return;
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await getRoster(classId, date);
      setRoster(data.map((r) => ({ ...r, status: r.status || 'Present' })));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load roster.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!classId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getClassSummary(classId);
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'record') loadRoster();
    else loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date, view]);

  const setStatus = (studentId, status) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  };

  const currentTerm = terms.find((t) => t.isCurrent);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await recordAttendance({
        classId,
        date,
        academicTermId: currentTerm?.id || null,
        records: roster.map((r) => ({ studentId: r.studentId, status: r.status, remarks: r.remarks })),
      });
      setMessage('Attendance saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Attendance</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={view === 'record' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('record')}>Record</button>
          <button type="button" className={view === 'summary' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('summary')}>Summary</button>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          {view === 'record' && (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          {!isAdmin && access && <HomeroomBadge isHomeroom={access.isHomeroom} />}
        </div>

        {error && <div className="alert-error">{error}</div>}
        {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}
        {isLoading && <p className="muted">Loading...</p>}
        {!isLoading && view === 'record' && !canRecord && (
          <p className="muted" style={{ marginBottom: 12 }}>
            View-only — only this class&apos;s homeroom teacher or an admin can record the daily register.
          </p>
        )}

        {!isLoading && view === 'record' && (
          <>
            <table>
              <thead>
                <tr><th>Admission No.</th><th>Name</th><th>Status</th></tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.studentId}>
                    <td>{r.admissionNo}</td>
                    <td>{r.firstName} {r.lastName}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={r.status === s ? 'btn-primary' : 'btn-secondary'}
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => setStatus(r.studentId, s)}
                            disabled={!canRecord}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {roster.length === 0 && <tr><td colSpan={3} className="muted">No students in this class.</td></tr>}
              </tbody>
            </table>
            {roster.length > 0 && canRecord && (
              <div style={{ marginTop: 16 }}>
                <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && view === 'summary' && (
          <table>
            <thead>
              <tr><th>Admission No.</th><th>Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th><th>Total</th></tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.admissionNo}</td>
                  <td>{s.firstName} {s.lastName}</td>
                  <td>{s.Present}</td>
                  <td>{s.Absent}</td>
                  <td>{s.Late}</td>
                  <td>{s.Excused}</td>
                  <td>{s.total}</td>
                </tr>
              ))}
              {summary.length === 0 && <tr><td colSpan={7} className="muted">No students in this class.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
