import { useEffect, useRef, useState } from 'react';
import { useOffline } from '../../context/OfflineContext';
import ConflictModal from './ConflictModal';

// Sits in the topbar next to ThemeToggle. Quiet when online with nothing
// pending (a small green dot, not a loud badge) — only gets loud when there's
// something the user actually needs to know about: offline, syncing, a
// just-completed sync, or — highest priority — a sync conflict that needs a
// human decision.
export default function OfflineIndicator() {
  const {
    isOnline, pendingCount, conflicts, isSyncing, lastSyncedAt,
  } = useOffline();
  const [showSynced, setShowSynced] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const lastSyncedRef = useRef(lastSyncedAt);

  useEffect(() => {
    if (lastSyncedAt && lastSyncedAt !== lastSyncedRef.current) {
      lastSyncedRef.current = lastSyncedAt;
      setShowSynced(true);
      const t = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [lastSyncedAt]);

  if (conflicts.length > 0) {
    // 'conflict' (the sheet/report genuinely moved on while offline) and
    // 'failed' (some other, possibly-retryable server error) are shown as
    // distinct counts — they need different decisions from the teacher, and
    // collapsing them into one red number hides which kind of problem it is.
    const conflictCount = conflicts.filter((c) => c.status === 'conflict').length;
    const failedCount = conflicts.filter((c) => c.status === 'failed').length;
    const label = [
      conflictCount > 0 ? `🔴 ${conflictCount} conflict${conflictCount === 1 ? '' : 's'}` : null,
      failedCount > 0 ? `⚠️ ${failedCount} failed` : null,
    ].filter(Boolean).join(' · ');
    return (
      <>
        <button
          type="button"
          className="badge badge-danger"
          style={{ border: 'none', cursor: 'pointer' }}
          onClick={() => setConflictModalOpen(true)}
        >
          {label}
        </button>
        {conflictModalOpen && <ConflictModal onClose={() => setConflictModalOpen(false)} />}
      </>
    );
  }
  if (showSynced) {
    return <span className="badge badge-success" title="All changes synchronized">✅ Synced</span>;
  }
  if (isSyncing) {
    return <span className="badge badge-neutral">🔄 Syncing…</span>;
  }
  if (!isOnline) {
    return (
      <span className="badge badge-warning" title="Changes are saved locally and will sync automatically when you're back online">
        🟠 Offline{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
      </span>
    );
  }
  if (pendingCount > 0) {
    return <span className="badge badge-warning" title="Waiting to sync">🟢 Online · {pendingCount} pending</span>;
  }
  return <span className="badge badge-neutral" title="Connected" style={{ opacity: 0.6 }}>🟢 Online</span>;
}
