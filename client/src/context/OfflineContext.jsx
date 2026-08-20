import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { getPending, getConflicts } from '../utils/offlineStore';

const OfflineContext = createContext(null);

// App-wide online/offline tracking + a place for a page to register "how do
// I flush my own queued writes" without this context needing to know
// anything about results/attendance/whatever specifically — keeps this
// reusable for the next offline-capable page instead of being result-shaped.
export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => getPending().length);
  const [conflicts, setConflicts] = useState(() => getConflicts());
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const flushHandlerRef = useRef(null);

  const refreshPendingCount = useCallback(() => {
    setPendingCount(getPending().length);
    setConflicts(getConflicts());
  }, []);

  const registerFlushHandler = useCallback((fn) => {
    flushHandlerRef.current = fn;
    return () => { if (flushHandlerRef.current === fn) flushHandlerRef.current = null; };
  }, []);

  const syncNow = useCallback(async () => {
    if (!flushHandlerRef.current || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await flushHandlerRef.current();
      setLastSyncedAt(new Date());
    } finally {
      refreshPendingCount();
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncNow(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // The browser's 'online' event only fires on a genuine offline->online
  // transition — it does nothing for the case where navigator.onLine is
  // already true but a queued write's sync attempt itself failed for a
  // transient reason (a flaky connection, a captive portal, the server
  // restarting). Without this, a 'pending' entry could sit untouched until
  // the user happens to reload the page. A periodic nudge while there's
  // actually something waiting closes that gap; syncNow() is already a
  // no-op when there's nothing to flush or no handler registered.
  useEffect(() => {
    if (!isOnline || pendingCount === 0) return undefined;
    const interval = setInterval(syncNow, 45000);
    return () => clearInterval(interval);
  }, [isOnline, pendingCount, syncNow]);

  const value = useMemo(() => ({
    isOnline, pendingCount, conflicts, lastSyncedAt, isSyncing, registerFlushHandler, syncNow, refreshPendingCount,
  }), [isOnline, pendingCount, conflicts, lastSyncedAt, isSyncing, registerFlushHandler, syncNow, refreshPendingCount]);

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return ctx;
}
