import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBeceReadinessReport } from '../../api/analytics.api';
import { getWaecExportPreview, downloadWaecExport } from '../../api/students.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

const STATUS_LABEL = { success: 'Good', warning: 'Attention Needed', danger: 'Action Required' };
const scoreTone = (score) => {
  if (score >= 90) return 'success';
  if (score >= 75) return 'warning';
  return 'danger';
};

// Same preview-then-download flow, and the same issues-modal shape, as
// StudentList.jsx's existing "WAEC Export" button -- this is the real
// export gate (previewWaecExport/downloadWaecExport), which only checks
// Date of Birth, WAEC Index Number, Photo, and Gender. It's deliberately
// narrower than this dashboard's own readiness score, which also checks
// hometown/region, guardian info, and class subjects -- so a class can
// show less than 100% ready above and still export cleanly here.
function ExportButton({ classId, className }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setIsChecking(true);
    setError('');
    try {
      const preview = await getWaecExportPreview(classId);
      if (!preview.ready) {
        setIssues(preview.issues);
        return;
      }
      await downloadWaecExport(classId, `waec-candidates-${className}.csv`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check or export WAEC candidate data.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <button type="button" className="btn-primary" onClick={handleExport} disabled={isChecking}>
        {isChecking ? 'Checking…' : `Export ${className} CSV`}
      </button>
      {error && <p className="alert-error" style={{ marginTop: 8, width: '100%' }}>{error}</p>}
      {issues && (
        <Modal title={`${className} — Data Missing for Export`} onClose={() => setIssues(null)}>
          <p className="muted" style={{ marginBottom: 12 }}>
            {issues.length} candidate{issues.length === 1 ? '' : 's'} in this class are missing data the export requires.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {issues.map((issue) => (
              <div key={issue.studentId} className="panel" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{issue.name} <span className="muted" style={{ fontWeight: 400 }}>({issue.admissionNo})</span></p>
                  <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Missing: {issue.missingFields.join(', ')}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate(`/students/${issue.studentId}`)}>Fix</button>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIssues(null)}>Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}

const TONE_GLYPH = { success: '✓', warning: '!', rose: '✕' };

function CriterionCard({ criterion }) {
  const pct = criterion.total > 0 ? Math.round((criterion.passCount / criterion.total) * 100) : 100;
  const tone = pct === 100 ? 'success' : (pct >= 75 ? 'warning' : 'rose');
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className="stat-card-icon" aria-hidden="true">{TONE_GLYPH[tone]}</span>
      <div>
        <div className="stat-card-label">{criterion.label}</div>
        <div className="stat-card-value">{criterion.passCount} / {criterion.total}</div>
      </div>
    </div>
  );
}

export default function BeceReadinessDashboard() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setIsLoading(true);
    setError('');
    getBeceReadinessReport()
      .then(setReport)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the BECE readiness report.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const tone = report && report.readyPercent !== null ? scoreTone(report.readyPercent) : null;

  return (
    <div>
      <div className="toolbar">
        <h1>BECE Readiness Dashboard</h1>
        <button type="button" className="btn-secondary" onClick={load} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : '↻ Re-run Check'}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {isLoading && !report && <LoadingSpinner label="Checking JHS 3 candidate readiness…" />}

      {report && report.classes.length === 0 && (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            No class is set to Grade Level &quot;JHS 3&quot; yet — set one on the Classes page to enable this dashboard.
          </p>
        </div>
      )}

      {report && report.classes.length > 0 && (
        <>
          <div className="panel dq-score-panel">
            <div className={`dq-score-ring dq-score-ring-${tone || 'success'}`} style={{ '--dq-pct': report.readyPercent ?? 0 }}>
              <span className="dq-score-value">{report.readyPercent !== null ? `${report.readyPercent}%` : '—'}</span>
            </div>
            <div>
              {tone && <span className={`badge badge-${tone}`}>{STATUS_LABEL[tone]}</span>}
              <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
                {report.readyCount} of {report.candidateTotal} JHS 3 candidate{report.candidateTotal === 1 ? '' : 's'} ready
                <br />
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 6 }}>Readiness Checklist</h2>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
              Each card counts how many of the {report.candidateTotal} candidates meet that one requirement.
            </p>
            <div className="stat-card-row">
              {report.criteria.map((c) => <CriterionCard key={c.key} criterion={c} />)}
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 6 }}>Export WAEC/BECE CSV</h2>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
              The export itself only requires Date of Birth, WAEC Index Number, Photo, and Gender —
              the other checklist items above are BECE registration completeness checks, not export blockers.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {report.classes.map((c) => <ExportButton key={c.classId} classId={c.classId} className={c.className} />)}
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 14 }}>Candidates Needing Attention</h2>
            {report.candidates.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Every JHS 3 candidate meets all readiness checks.</p>
            ) : (
              <table>
                <thead><tr><th>Candidate</th><th>Class</th><th>Missing</th><th /></tr></thead>
                <tbody>
                  {report.candidates.map((c) => (
                    <tr key={c.studentId}>
                      <td>{c.name} <span className="muted">({c.admissionNo})</span></td>
                      <td>{c.className}</td>
                      <td>{c.missing.join(', ')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate(`/students/${c.studentId}`)}>Fix</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
