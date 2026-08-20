import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import {
  generateTerminalReports, listTerminalReports, submitTerminalReport,
  lockTerminalReport, rejectTerminalReport, unlockTerminalReport, publishTerminalReport,
  unpublishTerminalReport, publishAllTerminalReports, lockAllTerminalReports,
  downloadReportCardsPdf, downloadSelectedReportCardsPdf, downloadReportCardsZip,
} from '../../api/terminalReports.api';
import { listResultSheets, approveResultSheet, rejectResultSheet, submitAllResultSheets } from '../../api/resultSheets.api';
import { getResultsRoster, getResultAnomalies } from '../../api/results.api';
import { listPersonalAttributes } from '../../api/personalAttributes.api';
import { suggestRemark } from '../../api/ai.api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';

const RATING_SCALE = ['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Improvement'];

const statusBadge = (status) => {
  if (status === 'Published') return <span className="badge badge-success">Published</span>;
  if (status === 'Locked') return <span className="badge badge-success">Locked</span>;
  if (status === 'Submitted') return <span className="badge badge-warning">Submitted</span>;
  if (status === 'Rejected') return <span className="badge badge-danger">Rejected</span>;
  return <span className="badge badge-neutral">Draft</span>;
};

const sheetStatusBadge = (status) => {
  if (status === 'Approved') return <span className="badge badge-success">Approved</span>;
  if (status === 'Submitted') return <span className="badge badge-warning">Submitted</span>;
  if (status === 'Rejected') return <span className="badge badge-danger">Rejected</span>;
  return <span className="badge badge-neutral">Draft</span>;
};

export default function TerminalReports() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [managing, setManaging] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [lockingAll, setLockingAll] = useState(false);

  useEffect(() => {
    listClasses().then((rows) => { setClasses(rows); if (rows.length) setClassId(String(rows[0].id)); }).catch(() => {});
    listTerms().then((rows) => {
      setTerms(rows);
      const current = rows.find((t) => t.isCurrent);
      if (current) setAcademicTermId(String(current.id));
      else if (rows.length) setAcademicTermId(String(rows[0].id));
    }).catch(() => {});
  }, []);

  const load = async () => {
    if (!classId || !academicTermId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await listTerminalReports({ classId, academicTermId });
      setReports(data);
      setSelectedIds([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load terminal reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [classId, academicTermId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setMessage('');
    try {
      const result = await generateTerminalReports({ classId, academicTermId });
      setMessage(`Generated/refreshed ${result.generated} student report(s).`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate terminal reports.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    const classRow = classes.find((c) => String(c.id) === classId);
    const term = terms.find((t) => String(t.id) === academicTermId);
    downloadReportCardsPdf(classId, academicTermId, `report-cards-${classRow?.name || ''}-${term?.name || ''}.pdf`);
  };

  const handleDownloadZip = () => {
    const classRow = classes.find((c) => String(c.id) === classId);
    const term = terms.find((t) => String(t.id) === academicTermId);
    downloadReportCardsZip(classId, academicTermId, `report-cards-${classRow?.name || ''}-${term?.name || ''}.zip`);
  };

  const handleDownloadSelected = () => {
    const classRow = classes.find((c) => String(c.id) === classId);
    const term = terms.find((t) => String(t.id) === academicTermId);
    downloadSelectedReportCardsPdf(classId, academicTermId, selectedIds, `report-cards-selected-${classRow?.name || ''}-${term?.name || ''}.pdf`);
  };

  const toggleSelected = (studentId) => {
    setSelectedIds((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]));
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.length === reports.length ? [] : reports.map((r) => r.studentId)));
  };

  const handlePublishAll = async () => {
    setError('');
    setMessage('');
    try {
      const result = await publishAllTerminalReports({ classId, academicTermId });
      setMessage(`Published ${result.published} report(s).`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish reports.');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Terminal Reports</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isAdmin && <button type="button" className="btn-secondary" onClick={() => setLockingAll(true)}>Lock All Submitted</button>}
          {isAdmin && <button type="button" className="btn-secondary" onClick={handlePublishAll}>Publish All Locked</button>}
          {selectedIds.length > 0 && (
            <button type="button" className="btn-secondary" onClick={handleDownloadSelected}>
              Download Selected ({selectedIds.length}) (PDF)
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={handleDownloadPdf}>Download Report Cards (PDF)</button>
          <button type="button" className="btn-secondary" onClick={handleDownloadZip}>Download ZIP</button>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" className="btn-primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate / Recalculate'}
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}
      </div>

      <SubjectCompletionStrip classId={classId} academicTermId={academicTermId} isAdmin={isAdmin} />

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {!isLoading && (
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" checked={reports.length > 0 && selectedIds.length === reports.length} onChange={toggleSelectAll} /></th>
                <th>Admission No.</th><th>Name</th><th>Total</th><th>Average</th><th>Position</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(r.studentId)} onChange={() => toggleSelected(r.studentId)} /></td>
                  <td>{r.student?.admissionNo}</td>
                  <td>{r.student?.firstName} {r.student?.lastName}</td>
                  <td>{r.totalMarksObtained ?? '—'}</td>
                  <td>{r.averageScore ? `${Number(r.averageScore).toFixed(2)}%` : '—'}</td>
                  <td>{r.classPosition ?? '—'}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td><button type="button" className="link-btn" onClick={() => setManaging(r)}>Manage</button></td>
                </tr>
              ))}
              {reports.length === 0 && <tr><td colSpan={8} className="muted">No terminal reports yet — click Generate.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {managing && (
        <ManageReportModal
          report={managing}
          isAdmin={isAdmin}
          userFullName={user?.fullName}
          onClose={() => setManaging(null)}
          onChanged={() => { setManaging(null); load(); }}
        />
      )}

      {lockingAll && (
        <LockAllModal
          classId={classId}
          academicTermId={academicTermId}
          userFullName={user?.fullName}
          onClose={() => setLockingAll(false)}
          onChanged={(msg) => { setLockingAll(false); setMessage(msg); load(); }}
        />
      )}
    </div>
  );
}

function LockAllModal({ classId, academicTermId, userFullName, onClose, onChanged }) {
  const [headteacherSignatureName, setHeadteacherSignatureName] = useState(userFullName || '');
  const [headteacherRemark, setHeadteacherRemark] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleLockAll = async () => {
    if (!headteacherSignatureName.trim()) {
      setError('Headteacher signature name is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const result = await lockAllTerminalReports({ classId, academicTermId, headteacherRemark, headteacherSignatureName });
      onChanged(`Locked ${result.locked} report(s).`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to lock reports.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Lock All Submitted Reports" onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}
      <p className="muted" style={{ marginBottom: 12 }}>
        This locks every report currently in Submitted status for this class/term, using one shared headteacher remark and signature.
      </p>
      <label className="field">
        <span>Headteacher's Remark</span>
        <textarea rows={2} value={headteacherRemark} onChange={(e) => setHeadteacherRemark(e.target.value)} />
      </label>
      <label className="field">
        <span>Headteacher Signature Name</span>
        <input value={headteacherSignatureName} onChange={(e) => setHeadteacherSignatureName(e.target.value)} />
      </label>
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" onClick={handleLockAll} disabled={isSaving}>
          {isSaving ? 'Locking...' : 'Lock All'}
        </button>
      </div>
    </Modal>
  );
}

function SubjectCompletionStrip({ classId, academicTermId, isAdmin }) {
  const [sheets, setSheets] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [submitAllMessage, setSubmitAllMessage] = useState('');

  const load = () => {
    if (!classId || !academicTermId) { setSheets(null); return; }
    listResultSheets({ classId, academicTermId }).then(setSheets).catch(() => setSheets([]));
  };

  useEffect(() => { load(); setSubmitAllMessage(''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [classId, academicTermId]);

  if (!sheets) return null;
  const approvedCount = sheets.filter((s) => s.status === 'Approved').length;
  const readyCount = sheets.filter((s) => ['Draft', 'Rejected'].includes(s.status)).length;

  const handleSubmitAll = async () => {
    setIsSubmittingAll(true);
    setSubmitAllMessage('');
    try {
      const result = await submitAllResultSheets({ classId, academicTermId });
      const skippedNote = result.skipped.length ? ` Skipped: ${result.skipped.map((s) => s.subjectName).join(', ')} (missing scores).` : '';
      setSubmitAllMessage(`Submitted ${result.submitted} sheet(s).${skippedNote}`);
      load();
    } catch (err) {
      setSubmitAllMessage(err.response?.data?.message || 'Failed to submit sheets.');
    } finally {
      setIsSubmittingAll(false);
    }
  };

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Subject Completion — {approvedCount}/{sheets.length} approved</h2>
        {readyCount > 0 && (
          <button type="button" className="btn-secondary" onClick={handleSubmitAll} disabled={isSubmittingAll}>
            {isSubmittingAll ? 'Submitting...' : `Submit All Ready (${readyCount})`}
          </button>
        )}
      </div>
      {submitAllMessage && <p className="muted" style={{ marginBottom: 10 }}>{submitAllMessage}</p>}
      {sheets.length === 0 && <p className="muted">No subjects assigned to this class yet.</p>}
      <div className="cards" style={{ marginBottom: 0 }}>
        {sheets.map((s) => (
          <div key={s.id} className="card" style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.subjectName}</div>
            {sheetStatusBadge(s.status)}
            {s.status === 'Rejected' && s.rejectionReason && (
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>{s.rejectionReason}</p>
            )}
            {isAdmin && s.status === 'Submitted' && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="link-btn" onClick={() => setReviewing(s)}>Review</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {reviewing && (
        <ReviewSheetModal
          sheet={reviewing}
          onClose={() => setReviewing(null)}
          onChanged={() => { setReviewing(null); load(); }}
        />
      )}
    </div>
  );
}

function ReviewSheetModal({ sheet, onClose, onChanged }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [roster, setRoster] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  useEffect(() => {
    const params = { classId: sheet.classId, subjectId: sheet.subjectId, academicTermId: sheet.academicTermId };
    getResultsRoster(params).then(setRoster).catch(() => setRoster([]));
    // Advisory only — a failed anomaly check should never block seeing the
    // roster or approving/rejecting it, so it fails silently into "no flags".
    getResultAnomalies(params).then(setAnomalies).catch(() => setAnomalies({ flags: [], aiSummary: null }));
  }, [sheet.classId, sheet.subjectId, sheet.academicTermId]);

  const flagsByStudent = new Map((anomalies?.flags || []).map((f) => [f.studentId, f.flags]));

  const handleApprove = async () => {
    setIsSaving(true);
    setError('');
    try {
      await approveResultSheet(sheet.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await rejectResultSheet(sheet.id, rejectionReason);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={`Review — ${sheet.subjectName}`} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}

      {anomalies?.aiSummary && (
        <p className="alert-warning" style={{ fontSize: 13, marginBottom: 10 }}>
          🧠 {anomalies.aiSummary}
        </p>
      )}

      {roster === null ? (
        <p className="muted">Loading scores…</p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th><th /></tr>
            </thead>
            <tbody>
              {roster.map((r) => {
                const studentFlags = flagsByStudent.get(String(r.studentId)) || [];
                return (
                  <tr key={r.studentId}>
                    <td>{r.firstName} {r.lastName}</td>
                    <td>{r.classScore}</td>
                    <td>{r.examScore}</td>
                    <td>{r.totalScore ?? '—'}</td>
                    <td>{r.grade ?? '—'}</td>
                    <td>
                      {studentFlags.length > 0 && (
                        <span
                          className="badge badge-warning"
                          title={studentFlags.map((f) => f.message).join(' ')}
                          style={{ cursor: 'help' }}
                        >
                          ⚠️ {studentFlags.length === 1 ? 'Review' : `${studentFlags.length} flags`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            ⚠️ flags are advisory only — a data point worth a second look, never a block on approval.
          </p>
        </div>
      )}

      {!showReject ? (
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowReject(true)}>Reject</button>
          <button type="button" className="btn-primary" onClick={handleApprove} disabled={isSaving}>
            {isSaving ? 'Approving...' : 'Approve'}
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            <span>Rejection Reason</span>
            <textarea rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowReject(false)}>Back</button>
            <button type="button" className="btn-primary" onClick={handleReject} disabled={isSaving}>
              {isSaving ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function ManageReportModal({ report, isAdmin, userFullName, onClose, onChanged }) {
  const [teacherRemark, setTeacherRemark] = useState(report.teacherRemark || '');
  const [teacherSignatureName, setTeacherSignatureName] = useState(report.teacherSignatureName || userFullName || '');
  const [headteacherRemark, setHeadteacherRemark] = useState(report.headteacherRemark || '');
  const [headteacherSignatureName, setHeadteacherSignatureName] = useState(report.headteacherSignatureName || userFullName || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [ratings, setRatings] = useState(() => Object.fromEntries((report.personalAttributeRatings || []).map((r) => [r.attributeId, r.rating])));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [remarkSuggestions, setRemarkSuggestions] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  useEffect(() => { listPersonalAttributes().then(setAttributes).catch(() => setAttributes([])); }, []);

  // AI only ever suggests text into this same editable textarea — a teacher
  // still has to review it, optionally edit it, and explicitly Submit for
  // the remark to go anywhere. Nothing here writes to the report on its own.
  const handleSuggestRemark = async () => {
    setIsSuggesting(true);
    setSuggestError('');
    setRemarkSuggestions(null);
    try {
      const { suggestions } = await suggestRemark(report.id);
      setRemarkSuggestions(suggestions);
    } catch (err) {
      setSuggestError(err.response?.data?.code === 'AI_NOT_CONFIGURED'
        ? 'AI remark suggestions aren\'t set up for this school yet.'
        : (err.response?.data?.message || 'Could not generate a suggestion right now.'));
    } finally {
      setIsSuggesting(false);
    }
  };

  const ratingsPayload = () => attributes
    .filter((a) => ratings[a.id])
    .map((a) => ({ attributeId: a.id, rating: ratings[a.id] }));

  const handleSubmit = async () => {
    setIsSaving(true);
    setError('');
    try {
      await submitTerminalReport(report.id, { teacherRemark, teacherSignatureName, personalAttributeRatings: ratingsPayload() });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLock = async () => {
    setIsSaving(true);
    setError('');
    try {
      await lockTerminalReport(report.id, { headteacherRemark, headteacherSignatureName, personalAttributeRatings: ratingsPayload() });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to lock report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlock = async () => {
    setIsSaving(true);
    setError('');
    try {
      await unlockTerminalReport(report.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unlock report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsSaving(true);
    setError('');
    try {
      await publishTerminalReport(report.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setIsSaving(true);
    setError('');
    try {
      await unpublishTerminalReport(report.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unpublish report.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await rejectTerminalReport(report.id, rejectionReason);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject report.');
    } finally {
      setIsSaving(false);
    }
  };

  const readOnly = report.status === 'Locked' || report.status === 'Published';

  return (
    <Modal title={`${report.student?.firstName} ${report.student?.lastName} — ${report.status}`} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}
      {report.status === 'Rejected' && report.rejectionReason && (
        <p className="muted" style={{ marginBottom: 12 }}>Reason: {report.rejectionReason}</p>
      )}

      <label className="field">
        <span>Teacher's Remark</span>
        <textarea rows={2} value={teacherRemark} onChange={(e) => setTeacherRemark(e.target.value)} disabled={readOnly} />
      </label>
      {!readOnly && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="btn-secondary" onClick={handleSuggestRemark} disabled={isSuggesting}>
            {isSuggesting ? 'Generating…' : remarkSuggestions ? '✨ Regenerate' : '✨ Suggest Remark'}
          </button>
          {suggestError && <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{suggestError}</p>}
          {remarkSuggestions && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {remarkSuggestions.map((s, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="panel" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <p style={{ fontSize: 13, margin: 0, flex: 1 }}>{s}</p>
                  <button type="button" className="btn-secondary" style={{ flexShrink: 0 }} onClick={() => { setTeacherRemark(s); setRemarkSuggestions(null); }}>
                    Use
                  </button>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 11.5 }}>
                AI-generated — review before using. Using a suggestion fills the textarea above; you can still edit it before submitting.
              </p>
            </div>
          )}
        </div>
      )}
      <label className="field">
        <span>Teacher Signature Name</span>
        <input value={teacherSignatureName} onChange={(e) => setTeacherSignatureName(e.target.value)} disabled={readOnly} />
      </label>

      {attributes.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, margin: '12px 0 8px' }}>Personal Attributes</h3>
          {attributes.map((attr) => (
            <label key={attr.id} className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 120 }}>{attr.name}</span>
              <select
                value={ratings[attr.id] || ''}
                onChange={(e) => setRatings((r) => ({ ...r, [attr.id]: e.target.value }))}
                disabled={readOnly}
              >
                <option value="">—</option>
                {RATING_SCALE.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          ))}
        </>
      )}

      {!readOnly && (
        <button type="button" className="btn-secondary" onClick={handleSubmit} disabled={isSaving} style={{ marginBottom: 16 }}>
          {isSaving ? 'Saving...' : 'Submit'}
        </button>
      )}

      {isAdmin && (
        <>
          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
          <label className="field">
            <span>Headteacher's Remark</span>
            <textarea rows={2} value={headteacherRemark} onChange={(e) => setHeadteacherRemark(e.target.value)} disabled={readOnly} />
          </label>
          <label className="field">
            <span>Headteacher Signature Name</span>
            <input value={headteacherSignatureName} onChange={(e) => setHeadteacherSignatureName(e.target.value)} disabled={readOnly} />
          </label>
          {showReject && (
            <label className="field">
              <span>Rejection Reason</span>
              <textarea rows={2} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            </label>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {report.status === 'Published' && (
              <button type="button" className="btn-secondary" onClick={handleUnpublish} disabled={isSaving}>Unpublish</button>
            )}
            {report.status === 'Locked' && (
              <>
                <button type="button" className="btn-secondary" onClick={handleUnlock} disabled={isSaving}>Unlock</button>
                <button type="button" className="btn-primary" onClick={handlePublish} disabled={isSaving}>Publish</button>
              </>
            )}
            {report.status === 'Submitted' && !showReject && (
              <>
                <button type="button" className="btn-secondary" onClick={() => setShowReject(true)} disabled={isSaving}>Reject</button>
                <button type="button" className="btn-primary" onClick={handleLock} disabled={isSaving}>
                  {isSaving ? 'Locking...' : 'Lock (Approve)'}
                </button>
              </>
            )}
            {report.status === 'Submitted' && showReject && (
              <>
                <button type="button" className="btn-secondary" onClick={() => setShowReject(false)} disabled={isSaving}>Back</button>
                <button type="button" className="btn-primary" onClick={handleReject} disabled={isSaving}>
                  {isSaving ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
