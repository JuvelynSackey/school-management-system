import { useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import { listBackups, triggerBackup } from './api';

export default function BackupsPage() {
  const { data: backups, isLoading, error, reload } = useApiResource(listBackups);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');

  const handleRunNow = async () => {
    setIsRunning(true);
    setRunError('');
    try {
      await triggerBackup();
      reload();
    } catch (err) {
      setRunError(err.response?.data?.message || 'Backup failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Backup &amp; Recovery</h1>
        <button type="button" className="btn-primary" onClick={handleRunNow} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run backup now'}
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        A full JSON snapshot of every collection runs automatically each day at 02:00. This spans the whole platform (every school), so it&apos;s managed here rather than per-school.
      </p>

      <div className="panel">
        {runError && <div className="alert-error">{runError}</div>}
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>When</th><th>Collections</th><th>Documents</th><th>Duration</th></tr></thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.timestamp}>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                  <td>{b.collections.length}</td>
                  <td>{b.collections.reduce((sum, c) => sum + c.count, 0)}</td>
                  <td>{(b.durationMs / 1000).toFixed(1)}s</td>
                </tr>
              ))}
              {backups.length === 0 && <tr><td colSpan={4} className="muted">No backups yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
