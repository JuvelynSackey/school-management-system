import { useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import { listBackups, triggerBackup, downloadBackup, restoreBackup } from './api';
import Modal from '../components/common/Modal';

const CONFIRM_PHRASE = 'RESTORE';

function RestoreModal({ backup, onClose, onDone }) {
  const [phrase, setPhrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');

  const handleRestore = async () => {
    setIsRestoring(true);
    setError('');
    try {
      await restoreBackup(backup.timestamp);
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Restore failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal title="Restore Database" onClose={onClose}>
      <div className="alert-error" style={{ marginBottom: 12 }}>
        This replaces every collection across the entire platform — every school — with the contents of the{' '}
        <strong>{new Date(backup.createdAt).toLocaleString()}</strong> backup. Anything created or changed since then
        is lost unless it&apos;s in that snapshot. A safety backup of the current state is taken automatically right
        before this runs, but this action itself cannot be undone.
      </div>
      {error && <div className="alert-error">{error}</div>}
      <label className="field">
        <span>Type <strong>{CONFIRM_PHRASE}</strong> to confirm</span>
        <input value={phrase} onChange={(e) => setPhrase(e.target.value)} autoFocus />
      </label>
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={isRestoring}>Cancel</button>
        <button
          type="button"
          className="btn-danger"
          onClick={handleRestore}
          disabled={phrase !== CONFIRM_PHRASE || isRestoring}
        >
          {isRestoring ? 'Restoring…' : 'Restore Database'}
        </button>
      </div>
    </Modal>
  );
}

export default function BackupsPage() {
  const { data: backups, isLoading, error, reload } = useApiResource(listBackups);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [downloadingTimestamp, setDownloadingTimestamp] = useState(null);
  const [downloadError, setDownloadError] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoredMessage, setRestoredMessage] = useState('');

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

  const handleDownload = async (timestamp) => {
    setDownloadingTimestamp(timestamp);
    setDownloadError('');
    try {
      await downloadBackup(timestamp);
    } catch (err) {
      setDownloadError(err.response?.data?.message || 'Download failed.');
    } finally {
      setDownloadingTimestamp(null);
    }
  };

  const handleRestoreDone = () => {
    setRestoreTarget(null);
    setRestoredMessage('Restore complete. A safety backup of the prior state was taken automatically.');
    reload();
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
        {downloadError && <div className="alert-error">{downloadError}</div>}
        {restoredMessage && <div className="alert-success" style={{ marginBottom: 12 }}>{restoredMessage}</div>}
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>When</th><th>Collections</th><th>Documents</th><th>Duration</th><th /></tr></thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.timestamp}>
                  <td>{new Date(b.createdAt).toLocaleString()}</td>
                  <td>{b.collections.length}</td>
                  <td>{b.collections.reduce((sum, c) => sum + c.count, 0)}</td>
                  <td>{(b.durationMs / 1000).toFixed(1)}s</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => handleDownload(b.timestamp)} disabled={downloadingTimestamp === b.timestamp}>
                        {downloadingTimestamp === b.timestamp ? 'Downloading…' : 'Download'}
                      </button>
                      <button type="button" className="link-btn danger" onClick={() => setRestoreTarget(b)}>Restore</button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && <tr><td colSpan={5} className="muted">No backups yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {restoreTarget && (
        <RestoreModal backup={restoreTarget} onClose={() => setRestoreTarget(null)} onDone={handleRestoreDone} />
      )}
    </div>
  );
}
