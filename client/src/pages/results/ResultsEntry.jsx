import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { listSubjectsForClass } from '../../api/subjects.api';
import { listTerms } from '../../api/terms.api';
import { getResultsRoster, recordResults, amendResult } from '../../api/results.api';
import { listResultSheets, submitResultSheet } from '../../api/resultSheets.api';
import { getGradingScheme } from '../../api/gradingScheme.api';
import { computeGrade } from '../../utils/grading';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import {
  getCache, setCache, queueWrite, removeFromQueue, markConflict, markFailed, getPending, isNetworkError,
} from '../../utils/offlineStore';
import Modal from '../../components/common/Modal';

const rosterCacheKey = (classId, subjectId, academicTermId) => `roster:${classId}:${subjectId}:${academicTermId}`;

const sheetStatusBadge = (status) => {
  if (status === 'Approved') return <span className="badge badge-success">Approved</span>;
  if (status === 'Submitted') return <span className="badge badge-warning">Submitted</span>;
  if (status === 'Rejected') return <span className="badge badge-danger">Rejected</span>;
  return <span className="badge badge-neutral">Draft</span>;
};

export default function ResultsEntry() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { isOnline, registerFlushHandler, refreshPendingCount } = useOffline();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [roster, setRoster] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [scheme, setScheme] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [amending, setAmending] = useState(null);
  const [showingCached, setShowingCached] = useState(false);

  useEffect(() => {
    getGradingScheme().then((s) => { setScheme(s); setCache('scheme', s); }).catch((err) => {
      if (isNetworkError(err)) { const cached = getCache('scheme'); if (cached) setScheme(cached); }
    });
    listClasses().then((rows) => {
      setClasses(rows);
      setCache('classes', rows);
      if (rows.length) setClassId(String(rows[0].id));
    }).catch((err) => {
      if (!isNetworkError(err)) return;
      const cached = getCache('classes');
      if (cached) { setClasses(cached); if (cached.length) setClassId(String(cached[0].id)); }
    });
    listTerms().then((rows) => {
      setTerms(rows);
      setCache('terms', rows);
      const current = rows.find((t) => t.isCurrent);
      if (current) setAcademicTermId(String(current.id));
      else if (rows.length) setAcademicTermId(String(rows[0].id));
    }).catch((err) => {
      if (!isNetworkError(err)) return;
      const cached = getCache('terms');
      if (cached) {
        setTerms(cached);
        const current = cached.find((t) => t.isCurrent);
        if (current) setAcademicTermId(String(current.id));
        else if (cached.length) setAcademicTermId(String(cached[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    listSubjectsForClass(classId).then((links) => {
      const subs = links.map((l) => l.subject);
      setSubjects(subs);
      setCache(`subjects:${classId}`, subs);
      setSubjectId(subs.length ? String(subs[0].id) : '');
    }).catch((err) => {
      if (!isNetworkError(err)) { setSubjects([]); return; }
      const cached = getCache(`subjects:${classId}`);
      if (cached) { setSubjects(cached); setSubjectId(cached.length ? String(cached[0].id) : ''); } else setSubjects([]);
    });
  }, [classId]);

  const loadRoster = async () => {
    if (!classId || !subjectId || !academicTermId) return;
    setIsLoading(true);
    setError('');
    setShowingCached(false);
    const key = rosterCacheKey(classId, subjectId, academicTermId);
    try {
      const data = await getResultsRoster({ classId, subjectId, academicTermId });
      setRoster(data);
      setCache(key, data);
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = getCache(key);
        if (cached) {
          setRoster(cached);
          setShowingCached(true);
        } else {
          setError('No connection, and no cached data for this selection yet.');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to load results.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSheet = async () => {
    if (!classId || !subjectId || !academicTermId) { setSheet(null); return; }
    try {
      const sheets = await listResultSheets({ classId, academicTermId });
      setSheet(sheets.find((s) => s.subjectId === subjectId) || null);
    } catch (err) {
      setSheet(null);
    }
  };

  useEffect(() => {
    setMessage('');
    loadRoster();
    loadSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, academicTermId]);

  const setField = (studentId, field, value) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, [field]: value } : r)));
  };

  const isLocked = sheet?.status === 'Submitted' || sheet?.status === 'Approved';
  const canSubmit = sheet && (sheet.status === 'Draft' || sheet.status === 'Rejected');
  const missingScores = roster.some((r) => r.classScore === '' || r.examScore === '' || r.classScore === null || r.examScore === null);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setMessage('');
    const payload = {
      classId,
      subjectId,
      academicTermId,
      records: roster
        .filter((r) => r.classScore !== '' && r.examScore !== '' && r.classScore !== null && r.examScore !== null)
        .map((r) => ({ studentId: r.studentId, classScore: Number(r.classScore), examScore: Number(r.examScore) })),
    };

    if (!isOnline) {
      const key = rosterCacheKey(classId, subjectId, academicTermId);
      queueWrite(key, payload);
      setCache(key, roster);
      refreshPendingCount();
      setMessage("Saved offline — will sync when you're back online.");
      setIsSaving(false);
      return;
    }

    try {
      await recordResults(payload);
      setMessage('Results saved.');
      loadRoster();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save results.');
    } finally {
      setIsSaving(false);
    }
  };

  // Registers with OfflineContext so reconnecting anywhere in the app
  // flushes whatever this page has queued, not just while this page is
  // mounted and the user happens to click something.
  useEffect(() => registerFlushHandler(async () => {
    // Only ever replay 'pending' entries — a 'conflict'/'failed' entry
    // already got a definitive rejection and stops auto-retrying (Stage 3B):
    // retry → reject → retry → reject forever helps no one, it needs a
    // human decision via the conflict UI instead.
    const queue = getPending();
    await Promise.all(queue.map(async (entry) => {
      try {
        await recordResults(entry.payload);
        removeFromQueue(entry.key);
      } catch (err) {
        if (isNetworkError(err)) return; // still offline (or just dropped again) — stays pending, retried next sync
        const { code, message: serverMessage } = err.response?.data || {};
        if (code === 'RESULT_LOCKED') {
          markConflict(entry.key, { message: serverMessage, code });
        } else {
          markFailed(entry.key, serverMessage || err.message);
        }
      }
    }));
  }), [registerFlushHandler]);

  const handleSubmit = async () => {
    if (!sheet) return;
    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      await submitResultSheet(sheet.id);
      setMessage('Submitted for approval.');
      loadSheet();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Score Entry</h1></div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.length === 0 && <option value="">No subjects assigned to this class</option>}
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {sheet && (
          <div style={{ marginBottom: 12 }}>
            {sheetStatusBadge(sheet.status)}
            {sheet.status === 'Rejected' && sheet.rejectionReason && (
              <p className="muted" style={{ marginTop: 6 }}>Reason: {sheet.rejectionReason}</p>
            )}
          </div>
        )}

        {showingCached && (
          <p className="muted" style={{ marginBottom: 12 }}>Showing cached data from earlier — reconnect to refresh.</p>
        )}
        {error && <div className="alert-error">{error}</div>}
        {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}
        {isLoading && <p className="muted">Loading...</p>}

        {!isLoading && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Admission No.</th><th>Name</th>
                  <th>Class Score ({scheme?.classScoreMax ?? 50})</th>
                  <th>Exam Score ({scheme?.examScoreMax ?? 50})</th>
                  <th>Total</th><th>Grade</th><th>Position</th>
                  {isAdmin && sheet?.status === 'Approved' && <th />}
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => {
                  const previewGrade = computeGrade(r.classScore, r.examScore, scheme?.bands) || r.grade;
                  const previewTotal = (r.classScore !== '' && r.examScore !== '') ? Number(r.classScore) + Number(r.examScore) : r.totalScore;
                  return (
                    <tr key={r.studentId}>
                      <td>{r.admissionNo}</td>
                      <td>{r.firstName} {r.lastName}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={scheme?.classScoreMax ?? 50}
                          value={r.classScore}
                          onChange={(e) => setField(r.studentId, 'classScore', e.target.value)}
                          disabled={isLocked}
                          style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={scheme?.examScoreMax ?? 50}
                          value={r.examScore}
                          onChange={(e) => setField(r.studentId, 'examScore', e.target.value)}
                          disabled={isLocked}
                          style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
                        />
                      </td>
                      <td>{previewTotal ?? '—'}</td>
                      <td>{previewGrade || '—'}</td>
                      <td>{r.subjectPosition ?? '—'}</td>
                      {isAdmin && sheet?.status === 'Approved' && (
                        <td>
                          {r.resultId && (
                            <button type="button" className="link-btn" onClick={() => setAmending(r)}>Amend</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {roster.length === 0 && <tr><td colSpan={7} className="muted">No students in this class.</td></tr>}
              </tbody>
            </table>
            {roster.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                {!isLocked && (
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Results'}
                  </button>
                )}
                {canSubmit && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || missingScores || !isOnline}
                    title={!isOnline ? 'Reconnect to submit' : (missingScores ? 'Enter scores for every student first' : undefined)}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {amending && (
        <AmendModal
          record={amending}
          scheme={scheme}
          onClose={() => setAmending(null)}
          onChanged={() => { setAmending(null); loadRoster(); }}
        />
      )}
    </div>
  );
}

function AmendModal({ record, scheme, onClose, onChanged }) {
  const [classScore, setClassScore] = useState(record.classScore ?? '');
  const [examScore, setExamScore] = useState(record.examScore ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('A reason is required.'); return; }
    setIsSaving(true);
    setError('');
    try {
      await amendResult(record.resultId, { classScore: Number(classScore), examScore: Number(examScore), reason });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to amend result.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={`Amend — ${record.firstName} ${record.lastName}`} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}
      <p className="muted" style={{ marginBottom: 12 }}>
        This corrects an already-approved score without reopening the whole subject for review. The change is recorded in the audit trail.
      </p>
      <label className="field">
        <span>Class Score ({scheme?.classScoreMax ?? 50})</span>
        <input type="number" min="0" max={scheme?.classScoreMax ?? 50} value={classScore} onChange={(e) => setClassScore(e.target.value)} />
      </label>
      <label className="field">
        <span>Exam Score ({scheme?.examScoreMax ?? 50})</span>
        <input type="number" min="0" max={scheme?.examScoreMax ?? 50} value={examScore} onChange={(e) => setExamScore(e.target.value)} />
      </label>
      <label className="field">
        <span>Reason</span>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Exam score entered incorrectly" />
      </label>
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Amendment'}
        </button>
      </div>
    </Modal>
  );
}
