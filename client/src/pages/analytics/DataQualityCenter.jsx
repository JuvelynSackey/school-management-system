import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDataQualityReport } from '../../api/analytics.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_LABEL = { success: 'Good', warning: 'Attention Needed', danger: 'Action Required' };
const scoreTone = (score) => {
  if (score >= 90) return 'success';
  if (score >= 75) return 'warning';
  return 'danger';
};

// Only 'students_*' and 'jhs3_*' categories carry a real per-record page
// (/students/:id exists; teachers, classes, and guardians don't have one).
// Everything else opens the relevant list page instead of pretending to
// deep-link somewhere that isn't there.
const FIX_TARGET = {
  students_missing_dob: (item) => `/students/${item.id}`,
  students_missing_hometown_region: (item) => `/students/${item.id}`,
  students_without_guardian_link: (item) => `/students/${item.id}`,
  jhs3_missing_waec_index: (item) => `/students/${item.id}`,
  teachers_unassigned: () => '/teachers',
  classes_missing_homeroom: () => '/classes',
  classes_missing_subjects: () => '/classes',
  guardians_without_login: () => '/parents',
};
const FIX_LABEL = {
  students_missing_dob: 'Open Student',
  students_missing_hometown_region: 'Open Student',
  students_without_guardian_link: 'Open Student',
  jhs3_missing_waec_index: 'Open Student',
  teachers_unassigned: 'Go to Teachers',
  classes_missing_homeroom: 'Go to Classes',
  classes_missing_subjects: 'Go to Classes',
  guardians_without_login: 'Go to Guardians',
};

function CategoryCard({ category, isOpen, onToggle, onFix }) {
  const {
    key, label, scope, total, count, items,
  } = category;
  const isClean = count === 0;

  return (
    <div className="panel dq-category-card">
      <button type="button" className="dq-category-header" onClick={onToggle} aria-expanded={isOpen}>
        <span>
          <span className="badge badge-neutral" style={{ marginRight: 10 }}>{scope}</span>
          <strong>{label}</strong>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isClean
            ? <span className="badge badge-success">✓ Clean</span>
            : <span className="badge badge-warning">{count} / {total} flagged</span>}
          <span className="dq-chevron">{isOpen ? '−' : '+'}</span>
        </span>
      </button>

      {isOpen && (
        <div className="dq-category-body">
          {isClean ? (
            <p className="muted" style={{ margin: 0 }}>No data quality issues detected in this scope.</p>
          ) : (
            <>
              <table>
                <thead><tr><th>Record</th><th /></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="btn-secondary" onClick={() => onFix(key, item)}>
                          {FIX_LABEL[key] || 'Open'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {count > items.length && (
                <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                  Showing the first {items.length} of {count} flagged records.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataQualityCenter() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openKeys, setOpenKeys] = useState(new Set());

  const load = () => {
    setIsLoading(true);
    setError('');
    getDataQualityReport()
      .then(setReport)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the data quality report.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const toggleCategory = (key) => setOpenKeys((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const handleFix = (key, item) => {
    const target = FIX_TARGET[key];
    if (target) navigate(target(item));
  };

  const tone = report ? scoreTone(report.overallScore) : 'success';

  return (
    <div>
      <div className="toolbar">
        <h1>Data Quality Center</h1>
        <button type="button" className="btn-secondary" onClick={load} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : '↻ Re-run Audit'}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {isLoading && !report && <LoadingSpinner label="Running data quality checks…" />}

      {report && (
        <>
          <div className="panel dq-score-panel">
            <div className={`dq-score-ring dq-score-ring-${tone}`} style={{ '--dq-pct': report.overallScore }}>
              <span className="dq-score-value">{report.overallScore}%</span>
            </div>
            <div>
              <span className={`badge badge-${tone}`}>{STATUS_LABEL[tone]}</span>
              <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {report.categories.map((category) => (
            <CategoryCard
              key={category.key}
              category={category}
              isOpen={openKeys.has(category.key)}
              onToggle={() => toggleCategory(category.key)}
              onFix={handleFix}
            />
          ))}
        </>
      )}
    </div>
  );
}
