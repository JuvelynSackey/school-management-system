import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import OfflineIndicator from '../common/OfflineIndicator';
import AnnouncementBanner from '../common/AnnouncementBanner';
import AskJesManage from '../common/AskJesManage';
import CommandPalette from '../common/CommandPalette';
import ScrollToTopButton from '../common/ScrollToTopButton';
import { NAV_ITEMS, NAV_GROUPS } from '../../config/navItems';
import { NAV_ICONS } from '../icons/NavIcons';

const COLLAPSED_GROUPS_KEY = 'jm_sidebar_collapsed_groups';
const ICON_ONLY_KEY = 'jm_sidebar_iconOnly';
// Every role assistantIntents.config.js assigns at least one intent to
// ('student' has none, and gets a graceful refusal if it ever reaches the
// endpoint some other way — no need to surface the entry point for it).
const ASK_JESMANAGE_ROLES = ['admin', 'teacher', 'parent'];

const loadCollapsedGroups = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const loadIconOnly = () => {
  try {
    return localStorage.getItem(ICON_ONLY_KEY) === 'true';
  } catch {
    return false;
  }
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [askOpen, setAskOpen] = useState(false);
  const [askInitialQuestion, setAskInitialQuestion] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(loadCollapsedGroups);
  const [iconOnly, setIconOnly] = useState(loadIconOnly);
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  // React Router doesn't reset scroll position on navigation the way a
  // traditional multi-page site does -- every route here is rendered
  // through this one Outlet, and there's no inner scrollable container
  // (.app-main/.page-content are both unconstrained flex; the window
  // itself scrolls), so a route change alone is what needs to reset it.
  // Instant, not smooth -- a page navigation should land already at the
  // top, the way a real page load would, not animate there.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const toggleGroup = (group) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      try { localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleIconOnly = () => {
    setIconOnly((prev) => {
      const next = !prev;
      try { localStorage.setItem(ICON_ONLY_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="sidebar-backdrop is-open" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}${iconOnly ? ' is-icon-only' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={toggleIconOnly}
            aria-label={iconOnly ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const items = visibleNavItems.filter((item) => item.group === group);
            if (items.length === 0) return null;
            const hasActiveItem = items.some((item) => location.pathname.startsWith(item.to));
            const isExpanded = iconOnly || group === 'MAIN' || hasActiveItem || !collapsedGroups.has(group);
            return (
              <div className="sidebar-group" key={group}>
                {group !== 'MAIN' && !iconOnly && (
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
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    title={item.label}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}${item.to === '/intelligence' ? ' sidebar-link--intelligence' : ''}`}
                  >
                    <span className="sidebar-link-icon">{NAV_ICONS[item.icon]}</span>
                    <span className="sidebar-link-label">{item.label}</span>
                    <span className="sidebar-link-tooltip">{item.label}</span>
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
            {ASK_JESMANAGE_ROLES.includes(user?.role) && (
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
        <AnnouncementBanner />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <ScrollToTopButton />
      <CommandPalette
        navItems={visibleNavItems}
        enableAI={ASK_JESMANAGE_ROLES.includes(user?.role)}
        onAskJesManage={(q) => { setAskInitialQuestion(q); setAskOpen(true); }}
      />
    </div>
  );
}
