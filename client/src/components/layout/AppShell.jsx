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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.filter((item) => item.roles.includes(user?.role)).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-user">
            <span className="user-name">{user?.fullName}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          {user?.role === 'admin' && (
            <button type="button" className="btn-secondary" onClick={() => setAskOpen(true)}>🔎 Ask JesManage</button>
          )}
          <OfflineIndicator />
          <ThemeToggle />
          <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
        </header>
        {askOpen && <AskJesManage onClose={() => setAskOpen(false)} />}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
