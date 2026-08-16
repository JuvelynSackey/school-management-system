import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import {
  generateTerminalReports, listTerminalReports, submitTerminalReport,
  lockTerminalReport, unlockTerminalReport, downloadReportCardsPdf,
} from '../../api/terminalReports.api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';

const statusBadge = (status) => {
  if (status === 'Locked') return <span className="badge badge-success">Locked</span>;
  if (status === 'Submitted') return <span className="badge badge-warning">Submitted</span>;
  return <span className="badge badge-neutral">Draft</span>;
};

export default function TerminalReports() {
  const { user } = useAuth();
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

  return (
    <div>
      <div className="toolbar">
        <h1>Terminal Reports</h1>
        <button type="button" className="btn-secondary" onClick={handleDownloadPdf}>Download Report Cards (PDF)</button>
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
        {isLoading && <p className="muted">Loading...</p>}

        {!isLoading && (
          <table>
            <thead>
              <tr><th>Admission No.</th><th>Name</th><th>Total</th><th>Average</th><th>Position</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.student?.admissionNo}</td>
                  <td>{r.student?.firstName} {r.student?.lastName}</td>
                  <td>{r.totalMarksObtained ?? '—'}</td>
                  <td>{r.averageScore ? `${Number(r.averageScore).toFixed(2)}%` : '—'}</td>
                  <td>{r.classPosition ?? '—'}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td><button type="button" className="link-btn" onClick={() => setManaging(r)}>Manage</button></td>
                </tr>
              ))}
              {reports.length === 0 && <tr><td colSpan={7} className="muted">No terminal reports yet — click Generate.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {managing && (
        <ManageReportModal
          report={managing}
          isAdmin={user?.role === 'admin'}
          userFullName={user?.fullName}
          onClose={() => setManaging(null)}
          onChanged={() => { setManaging(null); load(); }}
        />
      )}
    </div>
  );
}

function ManageReportModal({ report, isAdmin, userFullName, onClose, onChanged }) {
  const [teacherRemark, setTeacherRemark] = useState(report.teacherRemark || '');
  const [teacherSignatureName, setTeacherSignatureName] = useState(report.teacherSignatureName || userFullName || '');
  const [headteacherRemark, setHeadteacherRemark] = useState(report.headteacherRemark || '');
  const [headteacherSignatureName, setHeadteacherSignatureName] = useState(report.headteacherSignatureName || userFullName || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    setIsSaving(true);
    setError('');
    try {
      await submitTerminalReport(report.id, { teacherRemark, teacherSignatureName });
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
      await lockTerminalReport(report.id, { headteacherRemark, headteacherSignatureName });
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

  const locked = report.status === 'Locked';

  return (
    <Modal title={`${report.student?.firstName} ${report.student?.lastName} — ${report.status}`} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}

      <label className="field">
        <span>Teacher's Remark</span>
        <textarea rows={2} value={teacherRemark} onChange={(e) => setTeacherRemark(e.target.value)} disabled={locked} />
      </label>
      <label className="field">
        <span>Teacher Signature Name</span>
        <input value={teacherSignatureName} onChange={(e) => setTeacherSignatureName(e.target.value)} disabled={locked} />
      </label>
      {!locked && (
        <button type="button" className="btn-secondary" onClick={handleSubmit} disabled={isSaving} style={{ marginBottom: 16 }}>
          {isSaving ? 'Saving...' : 'Submit'}
        </button>
      )}

      {isAdmin && (
        <>
          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
          <label className="field">
            <span>Headteacher's Remark</span>
            <textarea rows={2} value={headteacherRemark} onChange={(e) => setHeadteacherRemark(e.target.value)} disabled={locked} />
          </label>
          <label className="field">
            <span>Headteacher Signature Name</span>
            <input value={headteacherSignatureName} onChange={(e) => setHeadteacherSignatureName(e.target.value)} disabled={locked} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
            {locked ? (
              <button type="button" className="btn-secondary" onClick={handleUnlock} disabled={isSaving}>Unlock</button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleLock} disabled={isSaving}>
                {isSaving ? 'Locking...' : 'Lock (Approve)'}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
