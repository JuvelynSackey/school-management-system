import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMyNoticeBoard, getUnreadAnnouncementCount, markAnnouncementRead, listAnnouncements,
} from '../../api/announcements.api';

const RECIPIENT_ROLES = ['teacher', 'student', 'parent'];
const MAX_ITEMS = 8;

// Built on the existing per-user Announcement endpoints — this app has no
// separate Notification model, so "notifications" here means the same data
// NoticeBoard.jsx shows, just surfaced from the topbar. Admins compose
// announcements rather than receive them (their /announcements/me call
// would 400 — see resolveNoticeBoardMatchForRole on the server), so their
// feed is the admin-only announcement history instead, with no unread state.
export default function NotificationBell() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isRecipient = RECIPIENT_ROLES.includes(user?.role);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = () => {
    setIsLoading(true);
    const request = isAdmin
      ? listAnnouncements().then((rows) => ({ rows, count: 0 }))
      : Promise.all([getMyNoticeBoard(), getUnreadAnnouncementCount()]).then(([rows, count]) => ({ rows, count }));
    request
      .then(({ rows, count }) => {
        setItems(rows.slice(0, MAX_ITEMS));
        setUnreadCount(count);
      })
      .catch(() => { setItems([]); setUnreadCount(0); })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isAdmin && !isRecipient) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEscape = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      if (!prev) load();
      return !prev;
    });
  };

  const handleMarkRead = async (id) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markAnnouncementRead(id);
    } catch {
      load();
    }
  };

  if (!isAdmin && !isRecipient) return null;

  return (
    <div className="notification-bell" ref={wrapRef}>
      <button type="button" className="notification-bell-trigger" onClick={toggleOpen} aria-label="Notifications" title="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-bell-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span>{isAdmin ? 'Recent Announcements' : 'Notifications'}</span>
            <Link to="/announcements" className="link-btn" onClick={() => setOpen(false)}>View All</Link>
          </div>
          {isLoading && <p className="muted" style={{ padding: 12 }}>Loading...</p>}
          {!isLoading && items.length === 0 && <p className="muted" style={{ padding: 12 }}>Nothing here yet.</p>}
          {!isLoading && items.map((a) => (
            <div key={a.id} className={`notification-dropdown-item${a.isRead === false ? ' is-unread' : ''}`}>
              <p className="notification-dropdown-message">{a.message}</p>
              <div className="notification-dropdown-meta">
                <span className="muted">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                {!isAdmin && a.isRead === false && (
                  <button type="button" className="link-btn" onClick={() => handleMarkRead(a.id)}>Mark as read</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
