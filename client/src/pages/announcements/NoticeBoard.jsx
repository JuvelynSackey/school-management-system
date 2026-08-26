import { useEffect, useState } from 'react';
import { getMyNoticeBoard, markAnnouncementRead } from '../../api/announcements.api';

const targetLabel = (a) => {
  if (a.targetType === 'school') return 'Whole School';
  if (a.targetType === 'class' || a.targetType === 'specific_classes') return a.targetClass ? `${a.targetClass.name} ${a.targetClass.section || ''}` : 'Your Class';
  if (a.targetType === 'all_teachers') return 'All Teachers';
  if (a.targetType === 'all_parents') return 'All Parents';
  return 'Just for you';
};

export default function NoticeBoard() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getMyNoticeBoard()
      .then(setAnnouncements)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load notices.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    try {
      await markAnnouncementRead(id);
    } catch {
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: false } : a)));
    }
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const visible = filter === 'unread' ? announcements.filter((a) => !a.isRead) : announcements;

  return (
    <div>
      <div className="toolbar">
        <h1>Notice Board {unreadCount > 0 && <span className="badge badge-warning">{unreadCount} unread</span>}</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All notices</option>
          <option value="unread">Unread only</option>
        </select>
      </div>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <div className="panel">
          {visible.length === 0 && <p className="muted">{filter === 'unread' ? 'Nothing unread.' : 'No notices yet.'}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map((a) => (
              <div key={a.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, opacity: a.isRead ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-neutral">{targetLabel(a)}</span>
                    {!a.isRead && <span className="badge badge-warning">New</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <p>{a.message}</p>
                {!a.isRead && (
                  <button type="button" className="link-btn" onClick={() => handleMarkRead(a.id)}>Mark as read</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
