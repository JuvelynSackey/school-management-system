import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import OfflineIndicator from '../common/OfflineIndicator';
import AskJesManage from '../common/AskJesManage';
import CommandPalette from '../common/CommandPalette';
import { NAV_ITEMS } from '../../config/navItems';

export default function AppShell() {
  const { user, logout } = useAuth();
  const [askOpen, setAskOpen] = useState(false);
  const [askInitialQuestion, setAskInitialQuestion] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop is-open" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
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
        {askOpen && (
          <AskJesManage
            initialQuestion={askInitialQuestion}
            onClose={() => { setAskOpen(false); setAskInitialQuestion(''); }}
          />
        )}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <CommandPalette
        navItems={visibleNavItems}
        enableAI={user?.role === 'admin'}
        onAskJesManage={(q) => { setAskInitialQuestion(q); setAskOpen(true); }}
      />
    </div>
  );
}
