import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboard } from '../../api/dashboard.api';
import { listAnnouncements } from '../../api/announcements.api';
import { getAtRiskStudents } from '../../api/earlyWarning.api';
import { formatCurrency } from '../../utils/currency';
import QuickActionsGrid from '../../components/common/QuickActionsGrid';

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
function ClassesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5L12 4l8.5 4.5L12 13 3.5 8.5Z" />
      <path d="M7 10.5V15c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5" />
    </svg>
  );
}
function SubjectsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 18.5v-14Z" />
      <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H20" />
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

function ProfileCard({ user }) {
  const initials = (user?.fullName || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="panel profile-card">
      <div className="profile-avatar">{initials}</div>
      <div className="profile-name">{user?.fullName}</div>
      <div className="profile-role muted" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
    </div>
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
function AtRiskStudentsPanel({ index }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAtRiskStudents().then(setData).catch(() => setData({ students: [], aiSynthesis: null }));
  }, []);

  if (!data || data.students.length === 0) return null;

  return (
    <div className="panel dash-reveal" style={{ '--stagger': index }}>
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

function AdminDashboard({ data, user }) {
  const {
    counts, setupStatus, attendanceStats, todayAttendancePercent, termReportApprovalPercent, feeStats, currentTermFeeStats,
    classEnrolmentByStage, attendanceMonitor, alerts, recentActivity,
  } = data;

  const maxStageCount = Math.max(1, ...STAGE_LABELS.map((s) => classEnrolmentByStage[s] || 0));
  const feeCollectionPercent = currentTermFeeStats.totalDue > 0
    ? (currentTermFeeStats.totalPaid / currentTermFeeStats.totalDue) * 100
    : null;
  const hasAlerts = alerts.pendingApprovalsCount > 0 || alerts.unassignedClasses.length > 0 || alerts.overdueFees.count > 0;

  return (
    <div className="dashboard-grid">
      <div className="dashboard-main">
        <SetupReadinessBanner setupStatus={setupStatus} schoolSlug={user?.schoolSlug} />
        <WelcomeBanner user={user} pendingApprovalsCount={alerts.pendingApprovalsCount} />

        <div className="stat-card-row">
          <StatCard icon={<StudentsIcon />} label="Enrolment" value={counts.students} tone="accent" index={0} />
          <StatCard icon={<TeachersIcon />} label="Teachers" value={counts.teachers} tone="success" index={1} />
          <StatCard icon={<ClassesIcon />} label="Classes" value={counts.classes} tone="rose" index={2} />
          <StatCard icon={<SubjectsIcon />} label="Subjects" value={counts.subjects} tone="warning" index={3} />
        </div>

        {/* Progress KPIs */}
        <div className="progress-stat-row">
          <RingStat label="Today's Attendance" percent={todayAttendancePercent} tone="accent" index={4} />
          <RingStat label="Term Fee Collection" percent={feeCollectionPercent} tone="success" index={5} />
          <RingStat label="Term Report Approval" percent={termReportApprovalPercent} tone="warning" index={6} />
        </div>

        <QuickActionsGrid />

        <div className="panel dash-reveal" style={{ '--stagger': 7 }}>
          <h2>Daily Attendance Monitor</h2>
          <AttendanceMonitor rows={attendanceMonitor} />
        </div>

        {/* Alerts */}
        <AtRiskStudentsPanel index={7.5} />

        <div className="panel dash-reveal" style={{ '--stagger': 8 }}>
          <h2>Alerts</h2>
          {!hasAlerts && <p className="muted">No alerts — everything looks good.</p>}
          {hasAlerts && (
            <div className="alert-list">
              {alerts.pendingApprovalsCount > 0 && (
                <Link className="alert-row" to="/results">
                  <span>{alerts.pendingApprovalsCount} terminal report{alerts.pendingApprovalsCount === 1 ? '' : 's'} awaiting your approval</span>
                  <span className="chevron">→</span>
                </Link>
              )}
              {alerts.unassignedClasses.length > 0 && (
                <Link className="alert-row" to="/classes">
                  <span>
                    {alerts.unassignedClasses.length} class{alerts.unassignedClasses.length === 1 ? '' : 'es'} with no homeroom teacher: {alerts.unassignedClasses.map((c) => `${c.name}${c.section ? ' ' + c.section : ''}`).join(', ')}
                  </span>
                  <span className="chevron">→</span>
                </Link>
              )}
              {alerts.overdueFees.count > 0 && (
                <Link className="alert-row" to="/fees">
                  <span>{alerts.overdueFees.count} overdue fee{alerts.overdueFees.count === 1 ? '' : 's'} totaling {formatCurrency(alerts.overdueFees.total)}</span>
                  <span className="chevron">→</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Class enrolment breakdown */}
        <div className="panel dash-reveal" style={{ '--stagger': 9 }}>
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

        <div className="panel dash-reveal" style={{ '--stagger': 10 }}>
          <h2>Today&apos;s Attendance</h2>
          <AttendanceCards stats={attendanceStats} />
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 11 }}>
          <h2>Fee Overview (All Time)</h2>
          <div className="cards" style={{ marginBottom: 0 }}>
            <div className="card"><div>Total Due</div><div className="num">{formatCurrency(feeStats.totalDue)}</div></div>
            <div className="card"><div>Total Paid</div><div className="num">{formatCurrency(feeStats.totalPaid)}</div></div>
            <div className="card"><div>Outstanding</div><div className="num">{formatCurrency(feeStats.outstanding)}</div></div>
          </div>
        </div>

        <div className="panel dash-reveal" style={{ '--stagger': 12 }}>
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

        <div className="panel dash-reveal" style={{ '--stagger': 13 }}>
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
      </div>

      <div className="dashboard-rail">
        <ProfileCard user={user} />
        <AnnouncementsFeed />
      </div>
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
