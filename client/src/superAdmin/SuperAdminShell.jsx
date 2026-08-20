import { NavLink, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from './SuperAdminAuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

export default function SuperAdminShell() {
  const { superAdmin, logout } = useSuperAdminAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>Platform Admin</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/super-admin/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
          <NavLink to="/super-admin/schools" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Schools</NavLink>
          <NavLink to="/super-admin/users" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Platform Users</NavLink>
          <NavLink to="/super-admin/audit-log" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Global Audit Log</NavLink>
          <NavLink to="/super-admin/security" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Security Center</NavLink>
          <NavLink to="/super-admin/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Platform Settings</NavLink>
          <NavLink to="/super-admin/backups" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>Backup &amp; Recovery</NavLink>
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-user">
            <span className="user-name">{superAdmin?.fullName}</span>
          </div>
          <ThemeToggle />
          <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
