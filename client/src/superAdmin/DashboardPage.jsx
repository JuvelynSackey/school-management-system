import { Link } from 'react-router-dom';
import useApiResource from '../hooks/useApiResource';
import { getDashboard } from './api';

function StatTile({ label, value, tone }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useApiResource(getDashboard);

  return (
    <div>
      <div className="toolbar"><h1>Platform Dashboard</h1></div>

      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}

      {!isLoading && !error && data && (
        <>
          <div className="stat-card-row">
            <StatTile label="Total Schools" value={data.totalSchools} tone="accent" />
            <StatTile label="Active Schools" value={data.activeSchools} tone="success" />
            <StatTile label="Suspended Schools" value={data.suspendedSchools} tone="warning" />
            <StatTile label="Total Platform Users" value={data.totalUsers} tone="rose" />
          </div>

          {data.schoolsNeedingAdmin.length > 0 && (
            <div className="panel">
              <h2>Schools Needing an Admin</h2>
              <p className="muted" style={{ marginBottom: 12 }}>These schools have no admin account yet — nobody can log in until one is created.</p>
              <table>
                <thead><tr><th>School</th><th>Login Code</th><th /></tr></thead>
                <tbody>
                  {data.schoolsNeedingAdmin.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td><code>{s.slug}</code></td>
                      <td><Link className="link-btn" to="/super-admin/schools">Add Admin</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel">
            <h2>Recently Registered Schools</h2>
            <table>
              <thead><tr><th>School</th><th>Login Code</th><th>Status</th><th>Students</th><th>Teachers</th></tr></thead>
              <tbody>
                {data.recentSchools.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td><code>{s.slug}</code></td>
                    <td>{s.status}</td>
                    <td>{s.stats.studentCount}</td>
                    <td>{s.stats.teacherCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Backups</h2>
            {data.lastBackup ? (
              <p>Last backup: <strong>{new Date(data.lastBackup.createdAt).toLocaleString()}</strong> — {data.lastBackup.collections.length} collections, {data.lastBackup.collections.reduce((sum, c) => sum + c.count, 0)} documents.</p>
            ) : (
              <p className="muted">No backups yet.</p>
            )}
            <Link className="link-btn" to="/super-admin/backups">View Backup &amp; Recovery</Link>
          </div>
        </>
      )}
    </div>
  );
}
