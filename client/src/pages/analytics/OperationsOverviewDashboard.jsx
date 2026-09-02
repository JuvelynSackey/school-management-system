import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOperationsOverviewReport } from '../../api/analytics.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_LABEL = { success: 'Good', warning: 'Attention Needed', danger: 'Critical' };
const scoreTone = (score) => {
  if (score >= 90) return 'success';
  if (score >= 75) return 'warning';
  return 'danger';
};

// Where an admin actually goes to act on a low pillar — only pillars with
// a real destination page appear here; a pillar reads its rate straight
// off the report either way.
const PILLAR_LINK = {
  operations: '/analytics/data-quality',
  dataQuality: '/analytics/data-quality',
};

// .stat-card only has success/warning/rose/cyan/accent tone variants (no
// "danger") -- badges use "danger" for the same severity, so this maps
// scoreTone's result onto the stat-card-specific name instead of reusing
// it directly.
const STAT_CARD_TONE = { success: 'success', warning: 'warning', danger: 'rose' };
const TONE_GLYPH = { success: '✓', warning: '!', rose: '✕' };

function PillarCard({ pillar }) {
  const tone = pillar.rate === null ? null : STAT_CARD_TONE[scoreTone(pillar.rate)];
  return (
    <div className={`stat-card${tone ? ` stat-card-${tone}` : ''}`}>
      {tone && <span className="stat-card-icon" aria-hidden="true">{TONE_GLYPH[tone]}</span>}
      <div>
        <div className="stat-card-label">{pillar.label}</div>
        <div className="stat-card-value">{pillar.rate !== null ? `${pillar.rate}%` : '—'}</div>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{pillar.detail}</div>
      </div>
    </div>
  );
}

// Deliberately separate from the Intelligence page's Health Score badge
// (schoolHealth.service.js's computeHealthScore) -- that one answers "how
// well are students performing," blending academic average, attendance,
// fee collection, and report-lock rate. This one answers a different
// question: "how complete and well-maintained is the school's own
// administrative record-keeping" -- submission completeness, staffing/
// class-structure gaps, and student-record data quality.
export default function OperationsOverviewDashboard() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setIsLoading(true);
    setError('');
    getOperationsOverviewReport()
      .then(setReport)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the operations overview.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const tone = report && report.overallScore !== null ? scoreTone(report.overallScore) : null;

  const actionItems = report ? [
    ...(report.pendingApprovals > 0 ? [{
      key: 'pending-approvals',
      text: `${report.pendingApprovals} result sheet${report.pendingApprovals === 1 ? '' : 's'} awaiting your approval`,
      to: '/assessment-sheets',
    }] : []),
    ...report.pillars
      .filter((p) => p.rate !== null && p.rate < 90 && p.key !== 'academics')
      .map((p) => ({
        key: p.key,
        text: `${p.label} is at ${p.rate}% — ${p.detail}`,
        to: PILLAR_LINK[p.key] || null,
      })),
  ] : [];

  return (
    <div>
      <div className="toolbar">
        <h1>Operations Overview</h1>
        <button type="button" className="btn-secondary" onClick={load} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {isLoading && !report && <LoadingSpinner label="Checking operations overview…" />}

      {report && (
        <>
          <div className="panel dq-score-panel">
            <div className={`dq-score-ring dq-score-ring-${tone || 'success'}`} style={{ '--dq-pct': report.overallScore ?? 0 }}>
              <span className="dq-score-value">{report.overallScore !== null ? `${report.overallScore}%` : '—'}</span>
            </div>
            <div>
              {tone && <span className={`badge badge-${tone}`}>{STATUS_LABEL[tone]}</span>}
              <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
                Blends result sheet completion, attendance, fee collection, operations, and data quality
                <br />
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 14 }}>Pillars</h2>
            <div className="stat-card-row">
              {report.pillars.map((p) => <PillarCard key={p.key} pillar={p} />)}
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginBottom: 14 }}>Action Center</h2>
            {actionItems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nothing needs your attention right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {actionItems.map((item) => (
                  <div key={item.key} className="panel" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5 }}>{item.text}</p>
                    {item.to && (
                      <button type="button" className="btn-secondary" onClick={() => navigate(item.to)}>Review</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
