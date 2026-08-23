import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { listTerms } from '../../api/terms.api';
import { getAcademicAnalytics, getFinancialAnalytics } from '../../api/analytics.api';
import { getPerformanceSummary } from '../../api/ai.api';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Validated against the app's white panel surface with the dataviz skill's
// validator (scripts/validate_palette.js) — blue/violet clears every
// categorical CVD/contrast gate; good/warning are the skill's reserved,
// mode-invariant status colors (paid vs outstanding is a state, not an
// identity), always paired with a text label per its "never color alone" rule.
const COLOR_THIS_TERM = '#2a78d6';
const COLOR_PREV_TERM = '#4a3aa7';
const COLOR_PAID = '#0ca30c';
const COLOR_OUTSTANDING = '#fab219';

// Chart chrome (gridlines/axis ink) isn't part of the categorical palette —
// it's picked per-surface. The light set was validated against the white
// panel; the dark set is a lighter-touch pairing against the dark panel
// (`--surface` in dark mode), not a full re-validation pass.
const CHROME = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7' },
  dark: { grid: '#3a3760', axis: '#8783ab' },
};

function StatTile({ label, value, tone, index = 0 }) {
  return (
    <div className={`stat-card stat-card-${tone} dash-reveal`} style={{ '--stagger': index }}>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
      </div>
    </div>
  );
}

// Pure enrichment on top of the charts below, not load-bearing — a failed
// or empty summary just renders nothing rather than blocking the page,
// same "quiet when there's nothing to say" pattern as PerformanceInsightsPanel.
function AIInsightsBanner({ academicTermId }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!academicTermId) return;
    setSummary(null);
    getPerformanceSummary(academicTermId).then(setSummary).catch(() => setSummary(null));
  }, [academicTermId]);

  if (!summary) return null;
  const { keyStrengths, areasForAttention, recommendations, fallbackMode } = summary;
  const hasAnything = keyStrengths.length > 0 || areasForAttention.length > 0 || recommendations.length > 0;
  if (!hasAnything) return null;

  const column = (title, items) => items.length > 0 && (
    <div style={{ flex: '1 1 220px' }}>
      <p style={{ fontSize: 12.5, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-h)' }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {items.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} style={{ marginBottom: 4 }}>{item}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="panel dash-reveal">
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>✨ JesManage AI Insights</h2>
        {fallbackMode && (
          <span className="badge badge-neutral" style={{ fontSize: 11 }}>⚡ Rule-Based Fallback Mode</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {column('Key Strengths', keyStrengths)}
        {column('Areas Requiring Attention', areasForAttention)}
        {column('Recommendations', recommendations)}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { isDark } = useTheme();
  const chrome = isDark ? CHROME.dark : CHROME.light;
  const [terms, setTerms] = useState([]);
  const [academicTermId, setAcademicTermId] = useState('');
  const [academic, setAcademic] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listTerms().then((data) => {
      setTerms(data);
      const current = data.find((t) => t.isCurrent) || data[0];
      if (current) setAcademicTermId(current.id);
      else setIsLoading(false);
    }).catch((err) => {
      setError(err.response?.data?.message || 'Failed to load terms.');
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!academicTermId) return;
    setIsLoading(true);
    setError('');
    Promise.all([getAcademicAnalytics(academicTermId), getFinancialAnalytics(academicTermId)])
      .then(([academicData, financialData]) => {
        setAcademic(academicData);
        setFinancial(financialData);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics.'))
      .finally(() => setIsLoading(false));
  }, [academicTermId]);

  const classChartData = useMemo(() => (academic?.classAverages || []).map((c) => ({
    name: c.className,
    'This term': c.average,
    'Previous term': c.previousAverage,
  })), [academic]);

  const subjectChartData = useMemo(() => (academic?.subjectAverages || []).map((s) => ({
    name: s.subjectName,
    Average: s.average,
  })), [academic]);

  const financeChartData = useMemo(() => (financial?.byClass || []).map((c) => ({
    name: c.className,
    Paid: c.totalPaid,
    Outstanding: c.outstanding,
  })), [financial]);

  return (
    <div>
      <div className="toolbar">
        <h1>Analytics</h1>
        <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {isLoading && <LoadingSpinner label="Loading analytics…" />}

      {!isLoading && !error && academicTermId && <AIInsightsBanner academicTermId={academicTermId} />}

      {!isLoading && !error && financial && (
        <div className="stat-card-row">
          <StatTile label="Total Fees Due" value={formatCurrency(financial.overall.totalDue)} tone="accent" index={0} />
          <StatTile label="Total Collected" value={formatCurrency(financial.overall.totalPaid)} tone="success" index={1} />
          <StatTile label="Outstanding" value={formatCurrency(financial.overall.outstanding)} tone="warning" index={2} />
          <StatTile label="Collection Rate" value={financial.overall.collectionRate !== null ? `${financial.overall.collectionRate}%` : '—'} tone="rose" index={3} />
        </div>
      )}

      {!isLoading && !error && academic && (
        <div className="panel">
          <h2>Class Averages</h2>
          {classChartData.length === 0 && <p className="muted">No results recorded for this term yet.</p>}
          {classChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={chrome.axis} />
                <YAxis tick={{ fontSize: 12 }} stroke={chrome.axis} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="This term" fill={COLOR_THIS_TERM} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Previous term" fill={COLOR_PREV_TERM} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {!isLoading && !error && academic && (
        <div className="panel">
          <h2>Subject Averages</h2>
          {subjectChartData.length === 0 && <p className="muted">No results recorded for this term yet.</p>}
          {subjectChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={chrome.axis} />
                <YAxis tick={{ fontSize: 12 }} stroke={chrome.axis} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="Average" fill={COLOR_THIS_TERM} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {!isLoading && !error && financial && (
        <div className="panel">
          <h2>Fee Collection by Class</h2>
          {financeChartData.length === 0 && <p className="muted">No fees recorded for this term yet.</p>}
          {financeChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={financeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={chrome.axis} />
                <YAxis tick={{ fontSize: 12 }} stroke={chrome.axis} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Paid" stackId="fees" fill={COLOR_PAID} radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="Paid" position="inside" fill="#fff" fontSize={11} formatter={(v) => (v ? formatCurrency(v) : '')} />
                </Bar>
                <Bar dataKey="Outstanding" stackId="fees" fill={COLOR_OUTSTANDING} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Outstanding" position="inside" fill="#0b0b0b" fontSize={11} formatter={(v) => (v ? formatCurrency(v) : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
