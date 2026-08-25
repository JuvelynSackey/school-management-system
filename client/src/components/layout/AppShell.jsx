import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import OfflineIndicator from '../common/OfflineIndicator';
import AskJesManage from '../common/AskJesManage';
import CommandPalette from '../common/CommandPalette';
import { NAV_ITEMS, NAV_GROUPS } from '../../config/navItems';

const COLLAPSED_GROUPS_KEY = 'jm_sidebar_collapsed_groups';

const loadCollapsedGroups = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [askOpen, setAskOpen] = useState(false);
  const [askInitialQuestion, setAskInitialQuestion] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(loadCollapsedGroups);
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const toggleGroup = (group) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      try { localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop is-open" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const items = visibleNavItems.filter((item) => item.group === group);
            if (items.length === 0) return null;
            const hasActiveItem = items.some((item) => location.pathname.startsWith(item.to));
            const isExpanded = group === 'MAIN' || hasActiveItem || !collapsedGroups.has(group);
            return (
              <div className="sidebar-group" key={group}>
                {group !== 'MAIN' && (
                  <button
                    type="button"
                    className="sidebar-group-label"
                    onClick={() => toggleGroup(group)}
                    aria-expanded={isExpanded}
                  >
                    <span>{group}</span>
                    <span className={`sidebar-group-chevron${isExpanded ? ' is-open' : ''}`}>▾</span>
                  </button>
                )}
                {isExpanded && items.map((item) => (
                  <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
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
