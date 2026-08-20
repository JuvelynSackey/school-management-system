import { useState } from 'react';
import { useOffline } from '../../context/OfflineContext';
import {
  getCache, removeFromQueue, retryEntry,
} from '../../utils/offlineStore';
import { reportResultConflict } from '../../api/results.api';
import Modal from './Modal';

// Best-effort name lookup from whatever ResultsEntry already cached while
// online — no extra network round trip just to label a conflict, falls back
// to the raw id if the name isn't cached (e.g. a different browser/session
// queued the write).
const describeConflict = ({ classId, subjectId }) => {
  const classes = getCache('classes') || [];
  const subjects = getCache(`subjects:${classId}`) || [];
  const classRow = classes.find((c) => String(c.id) === String(classId));
  const subject = subjects.find((s) => String(s.id) === String(subjectId));
  const className = classRow ? `${classRow.name} ${classRow.section || ''}`.trim() : 'Unknown class';
  return `${className} — ${subject?.name || 'Unknown subject'}`;
};

// entry.key IS the roster cache key ResultsEntry queues under
// (roster:classId:subjectId:academicTermId — see ResultsEntry.jsx's
// rosterCacheKey), so the cached roster is reachable directly, no separate
// lookup key to reconstruct. Named so a discard decision is informed by what
// it's actually discarding, not just "this class/subject has a conflict."
const describeQueuedChanges = (entry) => {
  const roster = getCache(entry.key) || [];
  const records = entry.payload?.records || [];
  const named = records.map((r) => {
    const student = roster.find((s) => String(s.studentId) === String(r.studentId));
    const name = student ? `${student.firstName} ${student.lastName}` : `Student ${r.studentId}`;
    return { name, classScore: r.classScore, examScore: r.examScore };
  });
  return { count: records.length, preview: named.slice(0, 3), remaining: Math.max(0, named.length - 3) };
};

const formatRelativeTime = (iso) => {
  if (!iso) return null;
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
};

export default function ConflictModal({ onClose }) {
  const { conflicts, refreshPendingCount, syncNow } = useOffline();
  const [busyKey, setBusyKey] = useState(null);
  const [notifiedKeys, setNotifiedKeys] = useState([]);

  const handleDiscard = (entry) => {
    removeFromQueue(entry.key);
    refreshPendingCount();
  };

  const handleRetry = (entry) => {
    retryEntry(entry.key);
    refreshPendingCount();
    syncNow();
  };

  const handleNotifyAdmin = async (entry) => {
    setBusyKey(entry.key);
    try {
      await reportResultConflict({
        classId: entry.payload.classId,
        subjectId: entry.payload.subjectId,
        academicTermId: entry.payload.academicTermId,
        message: entry.conflict?.message,
      });
      setNotifiedKeys((prev) => [...prev, entry.key]);
      removeFromQueue(entry.key);
      refreshPendingCount();
    } catch {
      // leave it queued — the teacher can try again
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Modal title="Sync Conflicts" onClose={onClose}>
      {conflicts.length === 0 && <p className="muted">No conflicts.</p>}
      {conflicts.map((entry) => {
        const changes = describeQueuedChanges(entry);
        const queuedAgo = formatRelativeTime(entry.queuedAt);
        const detectedAgo = formatRelativeTime(entry.conflict?.detectedAt);
        return (
          <div key={entry.key} className="panel" style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className={entry.status === 'conflict' ? 'badge badge-danger' : 'badge badge-warning'} style={{ fontSize: 11 }}>
                {entry.status === 'conflict' ? '🔴 Conflict' : '⚠️ Failed'}
              </span>
              <p style={{ fontWeight: 600, margin: 0 }}>{describeConflict(entry.payload)}</p>
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Queued {queuedAgo || 'earlier'}{detectedAgo ? ` · flagged ${detectedAgo}` : ''}
            </p>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {entry.status === 'conflict'
                ? 'This result could not be synchronized. It was submitted, approved, or locked while you were working offline.'
                : 'This result could not be synchronized due to an unexpected error.'}
            </p>
            {entry.conflict?.message && (
              <p className="alert-error" style={{ fontSize: 13, marginBottom: 8 }}>{entry.conflict.message}</p>
            )}
            {entry.status === 'conflict' && (
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                Your offline changes have <strong>not</strong> overwritten the current result.
              </p>
            )}
            {changes.count > 0 && (
              <div style={{ fontSize: 12.5, marginBottom: 10 }}>
                <p className="muted" style={{ marginBottom: 2 }}>
                  This will discard {changes.count} score{changes.count === 1 ? '' : 's'} you entered offline:
                </p>
                <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
                  {changes.preview.map((r, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <li key={`${r.name}-${i}`}>{r.name} — class {r.classScore}, exam {r.examScore}</li>
                  ))}
                  {changes.remaining > 0 && <li>+{changes.remaining} more</li>}
                </ul>
              </div>
            )}
            {notifiedKeys.includes(entry.key) ? (
              <p className="muted" style={{ fontSize: 13 }}>✅ Admin notified.</p>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => handleDiscard(entry)} disabled={busyKey === entry.key}>
                  Discard My Change
                </button>
                {entry.status === 'failed' && (
                  <button type="button" className="btn-secondary" onClick={() => handleRetry(entry)} disabled={busyKey === entry.key}>
                    Retry
                  </button>
                )}
                <button type="button" className="btn-primary" onClick={() => handleNotifyAdmin(entry)} disabled={busyKey === entry.key}>
                  {busyKey === entry.key ? 'Notifying...' : 'Notify Admin'}
                </button>
              </div>
            )}
          </div>
        );
      })}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
