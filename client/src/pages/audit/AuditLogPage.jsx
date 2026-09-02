import { useEffect, useState } from 'react';
import { listAuditLogs, downloadAuditLogExport } from '../../api/auditLogs.api';

const ENTITY_TYPES = ['Fee', 'Payment', 'Result', 'ResultSheet', 'TerminalReport', 'Student', 'Teacher', 'Admission', 'Guardian'];
const LIMIT = 50;

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      await downloadAuditLogExport(entityType ? { entityType } : {});
    } catch (err) {
      setExportError(err.response?.data?.message || 'Failed to export the audit log.');
    } finally {
      setIsExporting(false);
    }
  };

  const loadPage = async (nextPage, reset) => {
    setIsLoading(true);
    setError('');
    try {
      const params = { page: nextPage, limit: LIMIT, ...(entityType ? { entityType } : {}) };
      const res = await listAuditLogs(params);
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
  }, [entityType]);

  const hasMore = logs.length < total;

  return (
    <div>
      <div className="toolbar">
        <h1>Audit Log</h1>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All record types</option>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" className="btn-secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
        </div>

        {exportError && <div className="alert-error">{exportError}</div>}
        {error && <div className="alert-error">{error}</div>}
        {!error && (
          <table>
            <thead>
              <tr><th>When</th><th>Who</th><th>Action</th><th>Type</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.actorName || 'Unknown'} <span className="muted" style={{ fontSize: 12 }}>({log.actorRole || '—'})</span></td>
                  <td>{log.description}</td>
                  <td><span className="badge badge-neutral">{log.entityType}</span></td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && <tr><td colSpan={4} className="muted">No activity recorded yet.</td></tr>}
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
