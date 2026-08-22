import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from './SuperAdminAuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

export default function SuperAdminShell() {
  const { superAdmin, logout } = useSuperAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop is-open" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>Platform Admin</span>
        </div>
        <nav className="sidebar-nav" onClick={() => setSidebarOpen(false)}>
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
          <div className="topbar-left">
            <button type="button" className="menu-toggle" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <div className="topbar-user">
              <span className="user-name">{superAdmin?.fullName}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <ThemeToggle />
            <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
