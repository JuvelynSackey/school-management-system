import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getDashboard } from '../../api/dashboard.api';
import { listAnnouncements } from '../../api/announcements.api';
import { getAtRiskStudents } from '../../api/earlyWarning.api';
import { getAcademicAnalytics } from '../../api/analytics.api';
import { formatCurrency } from '../../utils/currency';
import QuickActionsGrid from '../../components/common/QuickActionsGrid';

// Same validated single-hue used for the "subject average" bar in
// AnalyticsPage.jsx — kept identical here so the two "average by subject"
// visuals in the app read as the same metric everywhere.
const ACADEMIC_BAR_COLOR = '#2a78d6';
const CHROME = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7' },
  dark: { grid: '#3a3760', axis: '#8783ab' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      {data?.role !== 'admin' && (
        <>
          <h1>Welcome, {user?.fullName}</h1>
          <p className="muted" style={{ marginBottom: 24 }}>Role: {user?.role}</p>
        </>
      )}

      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}

      {!isLoading && !error && data && (
        <>
          {data.role === 'admin' && <AdminDashboard data={data} user={user} />}
          {data.role === 'teacher' && <TeacherDashboard data={data} />}
          {data.role === 'student' && <StudentDashboard data={data} />}
          {data.role === 'parent' && <ParentDashboard data={data} />}
        </>
      )}
    </div>
  );
}

function StudentsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l9 5-9 5-9-5 9-5Z" />
      <path d="M5 10.5V16c0 1.5 3 3 7 3s7-1.5 7-3v-5.5" />
    </svg>
  );
}
function TeachersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="13" rx="2.5" />
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <path d="M4 11h16" />
    </svg>
  );
}
function AttendanceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      <path d="M8.5 14l2.2 2.2L15.5 12" />
    </svg>
  );
}
function FeesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M14.8 9.8c0-1.3-1.3-2.3-2.8-2.3s-2.8.9-2.8 2c0 3 5.6 1.5 5.6 4.5 0 1.1-1.3 2-2.8 2s-2.8-1-2.8-2.3" />
    </svg>
  );
}

function StatCard({ icon, label, value, tone, index = 0 }) {
  return (
    <div className={`stat-card stat-card-${tone} dash-reveal`} style={{ '--stagger': index }}>
      <span className="stat-card-icon">{icon}</span>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
      </div>
    </div>
  );
}

const SETUP_CHECKLIST_ITEMS = [
  { key: 'hasLogo', label: 'School logo uploaded', to: '/school-settings' },
  { key: 'hasClasses', label: 'Classes provisioned', to: '/classes' },
  { key: 'hasTeachers', label: 'Teachers added', to: '/teachers' },
  { key: 'hasStudents', label: 'Students enrolled', to: '/students' },
];

function SetupReadinessBanner({ setupStatus, schoolSlug }) {
  const dismissKey = `setup-banner-dismissed-${schoolSlug || 'default'}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === 'true');

  if (!setupStatus || setupStatus.percentComplete >= 100 || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, 'true');
    setDismissed(true);
  };

  return (
    <div className="panel dash-reveal" style={{ marginBottom: 20, borderLeft: '4px solid var(--accent)' }}>
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>School Setup — {setupStatus.percentComplete}% Complete</h2>
        <button type="button" className="link-btn" onClick={dismiss}>Dismiss</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SETUP_CHECKLIST_ITEMS.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{setupStatus[item.key] ? '✔️' : '⏳'}</span>
            {setupStatus[item.key] ? (
              <span>{item.label}</span>
            ) : (
              <Link to={item.to}>Action needed: {item.label}</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeBanner({ user, pendingApprovalsCount }) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="welcome-banner dash-reveal">
      <div>
        <h2>Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}</h2>
        <p className="welcome-banner-date">{today}</p>
      </div>
      {pendingApprovalsCount > 0 ? (
        <Link to="/results" className="welcome-banner-cta">
          {pendingApprovalsCount} report{pendingApprovalsCount === 1 ? '' : 's'} awaiting your approval →
        </Link>
      ) : (
        <span className="welcome-banner-note">Everything&apos;s on track today ✓</span>
      )}
    </div>
  );
}

function AttendanceCards({ stats }) {
  if (!stats) return null;
  return (
    <div className="cards">
      <div className="card"><div>Present</div><div className="num">{stats.Present}</div></div>
      <div className="card"><div>Absent</div><div className="num">{stats.Absent}</div></div>
      <div className="card"><div>Late</div><div className="num">{stats.Late}</div></div>
      <div className="card"><div>Excused</div><div className="num">{stats.Excused}</div></div>
    </div>
  );
}

function RingStat({ label, percent, tone, index = 0 }) {
  const pct = percent === null || percent === undefined ? null : Math.round(percent);
  const deg = pct === null ? 0 : (pct / 100) * 360;
  return (
    <div className="ring-stat-card dash-reveal" style={{ '--stagger': index }}>
      <div className={`ring-stat-circle ring-stat-${tone}`} style={{ '--ring-deg': `${deg}deg` }}>
        <span className="ring-stat-value">{pct === null ? '—' : `${pct}%`}</span>
      </div>
      <span className="ring-stat-label">{label}</span>
    </div>
  );
}

function AttendanceMonitor({ rows }) {
  if (!rows || rows.length === 0) return <p className="muted">No classes yet.</p>;
  return (
    <table>
      <thead><tr><th>Class</th><th>Homeroom Teacher</th><th>Status</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.name} {r.section || ''}</td>
            <td>{r.teacherName || <span className="muted">Unassigned</span>}</td>
            <td>
              {r.submitted
                ? <span className="badge badge-success">Submitted</span>
                : <Link className="badge badge-warning" to="/attendance">Pending</Link>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnnouncementsFeed() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    listAnnouncements().then((rows) => setItems(rows.slice(0, 4))).catch(() => setItems([]));
  }, []);

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Recent Announcements</h2>
        <Link to="/announcements" className="link-btn">View all</Link>
      </div>
      {items === null && <p className="muted">Loading...</p>}
      {items && items.length === 0 && <p className="muted">No announcements yet.</p>}
      {items && items.map((a) => (
        <div key={a.id} className="announcement-feed-item">
          <p>{a.message}</p>
          <span className="muted">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
        </div>
      ))}
    </div>
  );
}

const FLAG_LABELS = {
  low_attendance: 'Low Attendance',
  academic_decline: 'Academic Decline',
  failing_multiple_subjects: 'Failing Subjects',
};

// JesManage Intelligence, Stage 6 Phase 4 — shared between AdminDashboard
// (whole school) and TeacherDashboard (their own classes only; the server
// enforces that scoping, this component doesn't need to know which). Quiet
// by default: renders nothing at all if nobody is currently flagged, same
// as PerformanceInsightsPanel's "not enough to say" behavior.
//
// AdminDashboard now needs this same data for the Action Center's
// "declining performance" count, so it fetches once and passes it down via
// `data` — this component only fetches its own copy when no `data` prop is
// given (TeacherDashboard's usage, unchanged).
function AtRiskStudentsPanel({ index, data: externalData }) {
  const [internalData, setInternalData] = useState(null);

  useEffect(() => {
    if (externalData !== undefined) return;
    getAtRiskStudents().then(setInternalData).catch(() => setInternalData({ students: [], aiSynthesis: null }));
  }, [externalData]);

  const data = externalData !== undefined ? externalData : internalData;
  if (!data || data.students.length === 0) return null;

  return (
    <div className="panel dash-reveal" id="at-risk-students" style={{ '--stagger': index }}>
      <h2>⚠️ Students Who May Need Attention</h2>
      {data.aiSynthesis && <p className="alert-warning" style={{ fontSize: 13 }}>🧠 {data.aiSynthesis}</p>}
      <table>
        <thead><tr><th>Name</th><th>Class</th><th>Flags</th><th>Fee Balance</th></tr></thead>
        <tbody>
          {data.students.map((s) => (
            <tr key={s.studentId}>
              <td><Link to={`/students/${s.studentId}`}>{s.firstName} {s.lastName}</Link></td>
              <td>{s.className || '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {s.academicFlags.map((f) => (
                    <span key={f.type} className="badge badge-warning" title={f.message}>
                      {FLAG_LABELS[f.type] || f.type}
                    </span>
                  ))}
                </div>
              </td>
              <td>{s.outstandingBalance > 0 ? formatCurrency(s.outstandingBalance) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
        Advisory only — a starting point for a supportive conversation, never a rule or an automatic action.
      </p>
    </div>
  );
}

const STAGE_LABELS = ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'];

// "How is my school doing today?" (headline stats) is answered by the cards
// above this; "what do I actually need to do about it?" is answered here —
// one place instead of the old Alerts panel plus a separately-scrolled-to
// at-risk table. Declining-performance count is derived from the SAME
// at-risk fetch AdminDashboard already needs for the detail panel further
// down (see id="at-risk-students") rather than a second API call.
function ActionCenter({ alerts, decliningCount, index }) {
  const items = [
    alerts.pendingApprovalsCount > 0 && {
      key: 'approvals',
      to: '/results',
      text: `${alerts.pendingApprovalsCount} result sheet${alerts.pendingApprovalsCount === 1 ? '' : 's'} awaiting review`,
    },
    decliningCount > 0 && {
      key: 'declining',
      to: '#at-risk-students',
      text: `${decliningCount} student${decliningCount === 1 ? '' : 's'} showing declining performance`,
    },
    alerts.teachersUnsubmittedCount > 0 && {
      key: 'unsubmitted',
      to: '/results',
      text: `${alerts.teachersUnsubmittedCount} teacher${alerts.teachersUnsubmittedCount === 1 ? '' : 's'} ${alerts.teachersUnsubmittedCount === 1 ? "hasn't" : "haven't"} submitted marks yet`,
    },
    alerts.overdueFees.count > 0 && {
      key: 'fees',
      to: '/fees',
      text: `${alerts.overdueFees.count} overdue fee${alerts.overdueFees.count === 1 ? '' : 's'} totaling ${formatCurrency(alerts.overdueFees.total)}`,
    },
    alerts.unassignedClasses.length > 0 && {
      key: 'unassigned',
      to: '/classes',
      text: `${alerts.unassignedClasses.length} class${alerts.unassignedClasses.length === 1 ? '' : 'es'} with no homeroom teacher`,
    },
  ].filter(Boolean);

  return (
    <div className="panel dash-reveal" style={{ '--stagger': index }}>
      <h2>🔔 Action Center</h2>
      {items.length === 0 && <p className="muted">Nothing needs your attention right now — everything looks good.</p>}
      {items.length > 0 && (
        <div className="alert-list">
          {items.map((item) => (
            <Link key={item.key} className="alert-row" to={item.to}>
              <span>{item.text}</span>
              <span className="chevron">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Everything the redesigned dashboard doesn't consider first-screen material
// (Action Center, setup checklist, recent activity, etc.) lives behind this
// toggle instead of being deleted — collapsed by default so the landing
// view stays to the 3 sections the school actually asked for.
function CollapsibleSection({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dashboard-more">
      <button type="button" className="dashboard-more-toggle" onClick={() => setOpen((v) => !v)}>
        <span>{open ? 'Hide' : 'Show'} more detail</span>
        <span className={`dashboard-more-chevron${open ? ' is-open' : ''}`}>▾</span>
      </button>
      {open && <div className="dashboard-more-content">{children}</div>}
    </div>
  );
}

// "How is my school doing today?" — the one chart the redesigned dashboard
// asks for, covering average performance and best-performing subjects in a
// single visual (a reference line at the school-wide average across a bar
// per subject), plus a compact pointer to students needing attention rather
// than the full table (that detail lives in AtRiskStudentsPanel, below the
// fold) so this panel stays glanceable.
function AcademicOverview({ currentTermId, atRiskData, index }) {
  const { isDark } = useTheme();
  const chrome = isDark ? CHROME.dark : CHROME.light;
  const [academic, setAcademic] = useState(null);

  useEffect(() => {
    if (!currentTermId) { setAcademic({ subjectAverages: [] }); return; }
    getAcademicAnalytics(currentTermId).then(setAcademic).catch(() => setAcademic({ subjectAverages: [] }));
  }, [currentTermId]);

  const { overallAverage, topSubjects } = useMemo(() => {
    const rows = academic?.subjectAverages || [];
    if (rows.length === 0) return { overallAverage: null, topSubjects: [] };
    const totalResults = rows.reduce((sum, r) => sum + r.resultCount, 0);
    const weighted = rows.reduce((sum, r) => sum + r.average * r.resultCount, 0);
    return {
      overallAverage: totalResults > 0 ? Math.round((weighted / totalResults) * 10) / 10 : null,
      topSubjects: [...rows].sort((a, b) => b.average - a.average).slice(0, 5),
    };
  }, [academic]);

  const chartData = topSubjects.map((s) => ({ name: s.subjectName, Average: s.average }));
  const atRiskCount = atRiskData?.students?.length || 0;

  return (
    <div className="panel dash-reveal" style={{ '--stagger': index }}>
      <h2>Academic Overview</h2>

      {academic === null && <p className="muted">Loading…</p>}

      {academic !== null && topSubjects.length === 0 && (
        <p className="muted">No results recorded yet this term.</p>
      )}

      {topSubjects.length > 0 && (
        <>
          <div className="academic-overview-headline">
            <span className="academic-overview-score">{overallAverage}%</span>
            <span className="muted">average score across all subjects this term</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chrome.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={chrome.axis} />
              <YAxis tick={{ fontSize: 12 }} stroke={chrome.axis} domain={[0, 100]} />
              <Tooltip />
              {overallAverage !== null && (
                <ReferenceLine y={overallAverage} stroke={chrome.axis} strokeDasharray="4 4" />
              )}
              <Bar dataKey="Average" fill={ACADEMIC_BAR_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Best-performing subjects, dashed line marks the school average.</p>
        </>
      )}

      {atRiskCount > 0 && (
        <div className="academic-overview-attention">
          <h3>⚠️ {atRiskCount} student{atRiskCount === 1 ? '' : 's'} may need attention</h3>
          <ul>
            {atRiskData.students.slice(0, 3).map((s) => (
              <li key={s.studentId}><Link to={`/students/${s.studentId}`}>{s.firstName} {s.lastName}</Link></li>
            ))}
          </ul>
          <a href="#at-risk-students" className="link-btn">See full list →</a>
        </div>
      )}
    </div>
  );
}

const ADMIN_QUICK_ACTIONS = [
  { icon: 'personPlus', label: 'Register Student', to: '/students' },
  { icon: 'document', label: 'Enter Results', to: '/results' },
  { icon: 'attendance', label: 'Record Attendance', to: '/attendance' },
  { icon: 'wallet', label: 'Record Payment', to: '/fees' },
  { icon: 'reports', label: 'Generate Reports', to: '/reports' },
];

function AdminDashboard({ data, user }) {
  const {
    counts, setupStatus, currentTermId, attendanceStats, todayAttendancePercent, termReportApprovalPercent, feeStats,
    currentTermFeeStats, classEnrolmentByStage, attendanceMonitor, alerts, recentActivity,
  } = data;

  const [atRiskData, setAtRiskData] = useState(null);
  useEffect(() => {
    getAtRiskStudents().then(setAtRiskData).catch(() => setAtRiskData({ students: [], aiSynthesis: null }));
  }, []);
  const decliningCount = (atRiskData?.students || [])
    .filter((s) => s.academicFlags.some((f) => f.type === 'academic_decline')).length;

  const maxStageCount = Math.max(1, ...STAGE_LABELS.map((s) => classEnrolmentByStage[s] || 0));
  const feeCollectionPercent = currentTermFeeStats.totalDue > 0
    ? (currentTermFeeStats.totalPaid / currentTermFeeStats.totalDue) * 100
    : null;

  return (
    <div>
      <SetupReadinessBanner setupStatus={setupStatus} schoolSlug={user?.schoolSlug} />
      <WelcomeBanner user={user} pendingApprovalsCount={alerts.pendingApprovalsCount} />

      {/* "How is my school doing today?" */}
      <div className="stat-card-row">
        <StatCard icon={<StudentsIcon />} label="Students" value={counts.students} tone="accent" index={0} />
        <StatCard icon={<TeachersIcon />} label="Teachers" value={counts.teachers} tone="success" index={1} />
        <StatCard
          icon={<AttendanceIcon />}
          label="Attendance Today"
          value={todayAttendancePercent === null ? '—' : `${Math.round(todayAttendancePercent)}%`}
          tone="rose"
          index={2}
        />
        <StatCard icon={<FeesIcon />} label="Fees Collected" value={formatCurrency(currentTermFeeStats.totalPaid)} tone="warning" index={3} />
      </div>

      <AcademicOverview currentTermId={currentTermId} atRiskData={atRiskData} index={4} />

      <QuickActionsGrid actions={ADMIN_QUICK_ACTIONS} />

      <CollapsibleSection>
        <ActionCenter alerts={alerts} decliningCount={decliningCount} index={0} />

        <div className="progress-stat-row">
          <RingStat label="Term Fee Collection" percent={feeCollectionPercent} tone="success" index={1} />
          <RingStat label="Term Report Approval" percent={termReportApprovalPercent} tone="warning" index={2} />
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 3 }}>
          <h2>Daily Attendance Monitor</h2>
          <AttendanceMonitor rows={attendanceMonitor} />
        </div>

        <AtRiskStudentsPanel data={atRiskData} index={4} />

        <div className="panel dash-reveal" style={{ '--stagger': 5 }}>
          <h2>Class Enrolment Breakdown</h2>
          {STAGE_LABELS.map((stage) => {
            const count = classEnrolmentByStage[stage] || 0;
            return (
              <div className="stage-row" key={stage}>
                <span className="stage-label">{stage}</span>
                <span className="stage-bar"><span className="stage-bar-fill" style={{ width: `${(count / maxStageCount) * 100}%` }} /></span>
                <span className="stage-count">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 6 }}>
          <h2>Today&apos;s Attendance</h2>
          <AttendanceCards stats={attendanceStats} />
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 7 }}>
          <h2>Fee Overview (All Time)</h2>
          <div className="cards" style={{ marginBottom: 0 }}>
            <div className="card"><div>Total Due</div><div className="num">{formatCurrency(feeStats.totalDue)}</div></div>
            <div className="card"><div>Total Paid</div><div className="num">{formatCurrency(feeStats.totalPaid)}</div></div>
            <div className="card"><div>Outstanding</div><div className="num">{formatCurrency(feeStats.outstanding)}</div></div>
          </div>
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 8 }}>
          <h2>Recent Students</h2>
          <table>
            <thead><tr><th>Name</th><th>Admission No.</th></tr></thead>
            <tbody>
              {recentActivity.students.map((s) => (
                <tr key={s.id}><td>{s.firstName} {s.lastName}</td><td>{s.admissionNo}</td></tr>
              ))}
              {recentActivity.students.length === 0 && <tr><td colSpan={2} className="muted">No students yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 9 }}>
          <h2>Recent Payments</h2>
          <table>
            <thead><tr><th>Student</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>
              {recentActivity.payments.map((p) => (
                <tr key={p.id}><td>{p.studentName || '—'}</td><td>{formatCurrency(p.amountPaid)}</td><td>{p.paymentDate}</td></tr>
              ))}
              {recentActivity.payments.length === 0 && <tr><td colSpan={3} className="muted">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <AnnouncementsFeed />
      </CollapsibleSection>
    </div>
  );
}

function TeacherDashboard({ data }) {
  const { counts, attendanceStats } = data;
  const navigate = useNavigate();
  return (
    <>
      <div className="cards">
        <div className="card"><div>My Classes</div><div className="num">{counts.classes}</div></div>
        <div className="card"><div>My Students</div><div className="num">{counts.students}</div></div>
      </div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className="btn-secondary" onClick={() => navigate('/attendance')}>Record Attendance</button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/results')}>Enter Results</button>
      </div>
      <div className="panel">
        <h2>Today&apos;s Attendance (My Classes)</h2>
        <AttendanceCards stats={attendanceStats} />
      </div>
      <AtRiskStudentsPanel />
    </>
  );
}

function ParentDashboard({ data }) {
  const { children } = data;
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>My Children</h2>
      {children.length === 0 && <p className="muted">No children are linked to your account yet — ask the school admin to link you as a guardian.</p>}
      <div className="dashboard-grid">
        {children.map((child) => (
          <Link key={child.id} to={`/students/${child.id}`} className="panel" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <h3 style={{ marginTop: 0 }}>{child.firstName} {child.lastName}</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              {child.admissionNo} · {child.className || 'Unassigned class'}
            </p>
            <div className="cards" style={{ marginBottom: 12 }}>
              <div className="card"><div>Present</div><div className="num">{child.attendanceStats.Present}</div></div>
              <div className="card"><div>Absent</div><div className="num">{child.attendanceStats.Absent}</div></div>
            </div>
            <div className="cards" style={{ marginBottom: 0 }}>
              <div className="card"><div>Fees Due</div><div className="num">{formatCurrency(child.feeStats.totalDue)}</div></div>
              <div className="card"><div>Outstanding</div><div className="num">{formatCurrency(child.feeStats.outstanding)}</div></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StudentDashboard({ data }) {
  const { attendanceStats, feeStats } = data;
  return (
    <>
      <div className="panel">
        <h2>My Attendance</h2>
        <AttendanceCards stats={attendanceStats} />
      </div>
      {feeStats && (
        <div className="panel">
          <h2>My Fees</h2>
          <div className="cards" style={{ marginBottom: 0 }}>
            <div className="card"><div>Total Due</div><div className="num">{formatCurrency(feeStats.totalDue)}</div></div>
            <div className="card"><div>Total Paid</div><div className="num">{formatCurrency(feeStats.totalPaid)}</div></div>
            <div className="card"><div>Outstanding</div><div className="num">{formatCurrency(feeStats.outstanding)}</div></div>
          </div>
        </div>
      )}
    </>
  );
}
