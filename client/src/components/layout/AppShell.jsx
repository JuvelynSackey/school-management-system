import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'teacher', 'student'] },
  { to: '/students', label: 'Students', roles: ['admin', 'teacher'] },
  { to: '/profile', label: 'My Profile', roles: ['student'] },
  { to: '/teachers', label: 'Teachers', roles: ['admin'] },
  { to: '/classes', label: 'Classes', roles: ['admin'] },
  { to: '/subjects', label: 'Subjects', roles: ['admin'] },
  { to: '/houses', label: 'Houses', roles: ['admin'] },
  { to: '/terms', label: 'Academic Terms', roles: ['admin'] },
  { to: '/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
  { to: '/results', label: 'Results', roles: ['admin', 'teacher', 'student'] },
  { to: '/fees', label: 'Fees', roles: ['admin', 'student'] },
  { to: '/announcements', label: 'Announcements', roles: ['admin', 'teacher', 'student'] },
  { to: '/reports', label: 'Reports', roles: ['admin'] },
  { to: '/school-settings', label: 'School Settings', roles: ['admin'] },
];

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">School Manager</div>
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
          <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
