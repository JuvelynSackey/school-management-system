import { useEffect, useState } from 'react';
import { listAuditLogs, listSchools, exportAuditLogs } from './api';

const ENTITY_TYPES = [
  'Fee', 'Payment', 'Result', 'ResultSheet', 'TerminalReport', 'Student', 'Teacher', 'Admission', 'Guardian',
  'Auth', 'School', 'User', 'SuperAdmin', 'Backup',
];
const LIMIT = 50;

export default function AuditLogPage() {
  const [schoolId, setSchoolId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [schools, setSchools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    listSchools().then(setSchools).catch(() => setSchools([]));
  }, []);

  const activeFilters = {
    ...(entityType ? { entityType } : {}),
    ...(schoolId ? { schoolId } : {}),
    ...(action ? { action } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };

  const loadPage = async (nextPage, reset) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await listAuditLogs({ page: nextPage, limit: LIMIT, ...activeFilters });
      setLogs((prev) => (reset ? res.logs : [...prev, ...res.logs]));
      setTotal(res.total);
      setPage(nextPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit log.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, schoolId, action, startDate, endDate]);

  const hasMore = logs.length < total;

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportError('');
    try {
      await exportAuditLogs({ ...activeFilters, format });
    } catch (err) {
      setExportError(err.response?.data?.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Global Audit Log</h1>
        <div className="row-actions">
          <button type="button" className="btn-secondary" onClick={() => handleExport('csv')} disabled={isExporting}>
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => handleExport('json')} disabled={isExporting}>
            Export JSON
          </button>
        </div>
      </div>

      <div className="panel">
        {exportError && <div className="alert-error">{exportError}</div>}
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">All schools</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All record types</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Action (e.g. student.create)"
            style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            From
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            To
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {!error && (
          <table>
            <thead>
              <tr><th>When</th><th>Who</th><th>School</th><th>Action</th><th>Type</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.actorName || 'Unknown'} <span className="muted" style={{ fontSize: 12 }}>({log.actorRole || '—'})</span></td>
                  <td>{log.school?.name || '—'}</td>
                  <td>{log.description}</td>
                  <td><span className="badge badge-neutral">{log.entityType}</span></td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && <tr><td colSpan={5} className="muted">No activity recorded yet.</td></tr>}
            </tbody>
          </table>
        )}
        {isLoading && <p className="muted">Loading...</p>}

        {hasMore && !isLoading && (
          <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button type="button" className="btn-secondary" onClick={() => loadPage(page + 1, false)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}
