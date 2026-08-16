import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboard } from '../../api/dashboard.api';
import { listAnnouncements } from '../../api/announcements.api';
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
      <h1>Welcome, {user?.fullName}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Role: {user?.role}</p>

      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}

      {!isLoading && !error && data && (
        <>
          {data.role === 'admin' && <AdminDashboard data={data} />}
          {data.role === 'teacher' && <TeacherDashboard data={data} />}
          {data.role === 'student' && <StudentDashboard data={data} />}
        </>
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

function ProgressStatCard({ label, percent, tone }) {
  const pct = percent === null || percent === undefined ? null : Math.round(percent);
  return (
    <div className="progress-stat-card">
      <div className="progress-stat-label">{label}</div>
      <div className="progress-stat-value">{pct === null ? '—' : `${pct}%`}</div>
      <div className="progress-stat-bar">
        <div className={`progress-stat-fill progress-stat-fill-${tone}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
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

const STAGE_LABELS = ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'];

function AdminDashboard({ data }) {
  const { user } = useAuth();
  const {
    counts, attendanceStats, todayAttendancePercent, termReportApprovalPercent, feeStats, currentTermFeeStats,
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
        {/* Progress KPIs */}
        <div className="progress-stat-row">
          <ProgressStatCard label="Today's Attendance" percent={todayAttendancePercent} tone="accent" />
          <ProgressStatCard label="Term Fee Collection" percent={feeCollectionPercent} tone="success" />
          <ProgressStatCard label="Term Report Approval" percent={termReportApprovalPercent} tone="warning" />
        </div>

        <QuickActionsGrid />

        <div className="panel">
          <h2>Daily Attendance Monitor</h2>
          <AttendanceMonitor rows={attendanceMonitor} />
        </div>

        {/* Alerts */}
        <div className="panel">
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
        <div className="panel">
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

        <div className="cards">
          <div className="card"><div>Enrolment</div><div className="num">{counts.students}</div></div>
          <div className="card"><div>Teachers</div><div className="num">{counts.teachers}</div></div>
          <div className="card"><div>Classes</div><div className="num">{counts.classes}</div></div>
          <div className="card"><div>Subjects</div><div className="num">{counts.subjects}</div></div>
        </div>

        <div className="panel">
          <h2>Today&apos;s Attendance</h2>
          <AttendanceCards stats={attendanceStats} />
        </div>

        <div className="panel">
          <h2>Fee Overview (All Time)</h2>
          <div className="cards" style={{ marginBottom: 0 }}>
            <div className="card"><div>Total Due</div><div className="num">{formatCurrency(feeStats.totalDue)}</div></div>
            <div className="card"><div>Total Paid</div><div className="num">{formatCurrency(feeStats.totalPaid)}</div></div>
            <div className="card"><div>Outstanding</div><div className="num">{formatCurrency(feeStats.outstanding)}</div></div>
          </div>
        </div>

        <div className="panel">
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

        <div className="panel">
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
    </>
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
