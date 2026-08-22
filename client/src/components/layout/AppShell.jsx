import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import OfflineIndicator from '../common/OfflineIndicator';
import AskJesManage from '../common/AskJesManage';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'parent'] },
  { to: '/admissions', label: 'Admissions', roles: ['admin'] },
  { to: '/students', label: 'Students', roles: ['admin', 'teacher'] },
  { to: '/profile', label: 'My Profile', roles: ['student'] },
  { to: '/teachers', label: 'Teachers', roles: ['admin'] },
  { to: '/classes', label: 'Classes', roles: ['admin'] },
  { to: '/subjects', label: 'Subjects', roles: ['admin'] },
  { to: '/houses', label: 'Houses', roles: ['admin'] },
  { to: '/terms', label: 'Academic Terms', roles: ['admin'] },
  { to: '/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
  { to: '/results', label: 'Results', roles: ['admin', 'teacher', 'student'] },
  { to: '/assessment-sheets', label: 'Assessment Sheets', roles: ['admin', 'teacher'] },
  { to: '/fees', label: 'Fees', roles: ['admin', 'student'] },
  { to: '/announcements', label: 'Announcements', roles: ['admin', 'teacher', 'student', 'parent'] },
  { to: '/reports', label: 'Reports', roles: ['admin'] },
  { to: '/analytics', label: 'Analytics', roles: ['admin'] },
  { to: '/school-settings', label: 'School Settings', roles: ['admin'] },
  { to: '/audit-log', label: 'Audit Log', roles: ['admin'] },
  { to: '/account', label: 'My Account', roles: ['admin', 'teacher', 'student', 'parent'] },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const [askOpen, setAskOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop is-open" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => item.roles.includes(user?.role)).map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="menu-toggle" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
            <div className="topbar-user">
              <span className="user-name">{user?.fullName}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <div className="topbar-actions">
            {user?.role === 'admin' && (
              <button type="button" className="btn-secondary" onClick={() => setAskOpen(true)}>🔎 Ask JesManage</button>
            )}
            <OfflineIndicator />
            <ThemeToggle />
            <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
          </div>
        </header>
        {askOpen && <AskJesManage onClose={() => setAskOpen(false)} />}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
