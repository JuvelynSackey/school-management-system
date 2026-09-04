import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAnnouncementBanner } from '../../api/announcements.api';

const DISMISSED_KEY = 'jm_dismissed_banner_id';
// Only these roles have a notice board an urgent announcement can target —
// admins compose announcements rather than receive them (see
// resolveNoticeBoardMatchForRole on the server), so /announcements/banner
// would 400 for an admin caller.
const BANNER_ROLES = ['teacher', 'student', 'parent'];

const loadDismissedId = () => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
};

// Persistent top-of-app notice for urgent announcements (PTA meetings, term
// closure dates, etc.) so recipients see them immediately instead of having
// to open the Announcements page. Dismissal is per browser tab session —
// sessionStorage rather than component state so it survives AppShell
// re-rendering across route changes, not just this one mount.
export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [banner, setBanner] = useState(null);
  const [dismissedId, setDismissedId] = useState(loadDismissedId);

  useEffect(() => {
    if (!BANNER_ROLES.includes(user?.role)) return;
    getAnnouncementBanner().then(setBanner).catch(() => setBanner(null));
  }, [user?.role]);

  if (!banner || banner.id === dismissedId) return null;

  const dismiss = () => {
    setDismissedId(banner.id);
    try { sessionStorage.setItem(DISMISSED_KEY, banner.id); } catch { /* ignore */ }
  };

  return (
    <div className="announcement-banner">
      <div className="announcement-banner-text">
        <strong>Announcement:</strong>
        <span>{banner.message}</span>
      </div>
      <div className="announcement-banner-actions">
        <Link to="/announcements" className="announcement-banner-link">View All</Link>
        <button type="button" className="announcement-banner-dismiss" onClick={dismiss} title="Dismiss" aria-label="Dismiss announcement">✕</button>
      </div>
    </div>
  );
}
