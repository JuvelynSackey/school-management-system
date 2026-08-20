// Lightweight localStorage-backed cache + write-queue for in-tab offline
// support. No IndexedDB/service-worker — this only needs to survive a
// dropped connection while the tab stays open (or gets refreshed), not a
// fully closed browser. Data volumes here are tiny (one class roster's
// worth of scores at a time), so localStorage's synchronous API is simpler
// than reaching for a real database.
const CACHE_PREFIX = 'jm_cache:';
const QUEUE_KEY = 'jm_offline_queue';

export const getCache = (key) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCache = (key, value) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or unavailable (e.g. private browsing) — caching is a
    // nice-to-have here, never worth throwing over.
  }
};

export const getQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // best-effort, see setCache
  }
};

// Overwrites any existing queued entry for this key — saving offline twice
// replaces the pending payload rather than piling up duplicate writes.
// New entries always start 'pending'; editing the same key again while it's
// stuck in 'conflict'/'failed' resets it back to 'pending' — a fresh edit
// deserves a fresh sync attempt, not being stuck behind the old failure.
export const queueWrite = (key, payload) => {
  const queue = getQueue().filter((entry) => entry.key !== key);
  queue.push({
    key, payload, queuedAt: new Date().toISOString(), status: 'pending', conflict: null,
  });
  saveQueue(queue);
};

export const removeFromQueue = (key) => {
  saveQueue(getQueue().filter((entry) => entry.key !== key));
};

// A queued write whose sync attempt was rejected because the underlying
// result/sheet moved on while offline (RESULT_LOCKED) — auto-retry stops
// here; it needs a human decision (see resolveConflict below), not another
// silent retry loop of reject → retry → reject.
export const markConflict = (key, { message, code }) => {
  const queue = getQueue().map((entry) => (entry.key === key
    ? { ...entry, status: 'conflict', conflict: { message, code, detectedAt: new Date().toISOString() } }
    : entry));
  saveQueue(queue);
};

// A queued write whose sync attempt failed for some other real (non-network,
// non-conflict) server reason — also stops auto-retrying, distinct label
// from 'conflict' so the UI can be honest about which kind of problem it is.
export const markFailed = (key, message) => {
  const queue = getQueue().map((entry) => (entry.key === key
    ? { ...entry, status: 'failed', conflict: { message, code: null, detectedAt: new Date().toISOString() } }
    : entry));
  saveQueue(queue);
};

// Resets a 'failed' entry back to 'pending' for a fresh sync attempt — for
// when a human judges the underlying problem (e.g. a transient server error)
// worth retrying rather than discarding. Deliberately not used for 'conflict'
// entries: RESULT_LOCKED means the sheet/report genuinely moved on, which a
// blind retry can't fix — that needs the discard/escalate decision instead.
export const retryEntry = (key) => {
  const queue = getQueue().map((entry) => (entry.key === key
    ? { ...entry, status: 'pending', conflict: null }
    : entry));
  saveQueue(queue);
};

export const getConflicts = () => getQueue().filter((entry) => entry.status === 'conflict' || entry.status === 'failed');
export const getPending = () => getQueue().filter((entry) => entry.status === 'pending' || !entry.status);

// axios's signature for "the request never reached the server" (DNS/connect
// failure, offline) as opposed to a real 4xx/5xx the server sent back.
export const isNetworkError = (err) => !err?.response;
