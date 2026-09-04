import { useEffect, useMemo, useState } from 'react';
import { getMyNoticeBoard, markAnnouncementRead } from '../../api/announcements.api';

const targetLabel = (a) => {
  if (a.targetType === 'school') return 'Whole School';
  if (a.targetType === 'class' || a.targetType === 'specific_classes') return a.targetClass ? `${a.targetClass.name} ${a.targetClass.section || ''}` : 'Your Class';
  if (a.targetType === 'all_teachers') return 'All Teachers';
  if (a.targetType === 'all_parents') return 'All Parents';
  return 'Just for you';
};

const CATEGORY_LABELS = { general: 'General', fee_reminder: 'Fee Reminder', academic: 'Academic' };
const categoryBadgeClass = (category) => (category === 'fee_reminder' ? 'badge-warning' : 'badge-neutral');

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'for_you', label: 'For You' },
  { key: 'academic', label: 'Academic' },
  { key: 'general', label: 'General' },
  { key: 'urgent', label: 'Urgent' },
];

const matchesFilter = (a, filterKey) => {
  if (filterKey === 'all') return true;
  if (filterKey === 'for_you') return a.targetType !== 'school';
  if (filterKey === 'urgent') return a.priority === 'urgent';
  return a.category === filterKey;
};

export default function NoticeBoard() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getMyNoticeBoard()
      .then(setAnnouncements)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load notices.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, isRead: true } : prev));
    try {
      await markAnnouncementRead(id);
    } catch {
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: false } : a)));
    }
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;
  const roleScopedCount = announcements.filter((a) => a.targetType !== 'school').length;
  const schoolWideCount = announcements.length - roleScopedCount;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements
      .filter((a) => matchesFilter(a, filter))
      .filter((a) => !q || a.message.toLowerCase().includes(q));
  }, [announcements, filter, search]);

  return (
    <div>
      <div className="toolbar">
        <h1>Notice Board</h1>
      </div>

      <div className="cards" style={{ marginBottom: 16 }}>
        <div className="card"><div>Total Notices</div><div className="num">{announcements.length}</div></div>
        <div className="card"><div>For You</div><div className="num">{roleScopedCount}</div></div>
        <div className="card"><div>School-Wide</div><div className="num">{schoolWideCount}</div></div>
        <div className="card"><div>Unread</div><div className="num">{unreadCount}</div></div>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notices..."
          style={{ marginLeft: 'auto', minWidth: 200 }}
        />
      </div>

      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <div className="panel">
          {visible.length === 0 && <p className="muted">No notices match this view.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map((a) => (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(a)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(a); }}
                style={{
                  textAlign: 'left',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  background: a.isRead ? 'transparent' : 'var(--accent-bg)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap',
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-neutral">{targetLabel(a)}</span>
                    {CATEGORY_LABELS[a.category] && (
                      <span className={`badge ${categoryBadgeClass(a.category)}`}>{CATEGORY_LABELS[a.category]}</span>
                    )}
                    {a.priority === 'urgent' && <span className="badge badge-danger">Urgent</span>}
                    {!a.isRead && <span className="badge badge-warning">New</span>}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text)' }}>{a.message}</p>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
                }}
                >
                  <span className="muted" style={{ fontSize: 12 }}>From {a.creator?.fullName || 'School Administration'}</span>
                  {!a.isRead && (
                    <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); handleMarkRead(a.id); }}>
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="notice-drawer-overlay" onClick={() => setSelected(null)}>
          <div className="notice-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="notice-drawer-header">
              <h2 style={{ margin: 0, fontSize: 16 }}>Notice</h2>
              <button type="button" className="link-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="notice-drawer-body">
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12,
              }}
              >
                <span className="badge badge-neutral">{targetLabel(selected)}</span>
                {CATEGORY_LABELS[selected.category] && (
                  <span className={`badge ${categoryBadgeClass(selected.category)}`}>{CATEGORY_LABELS[selected.category]}</span>
                )}
                {selected.priority === 'urgent' && <span className="badge badge-danger">Urgent</span>}
                <span className={`badge ${selected.isRead ? 'badge-neutral' : 'badge-warning'}`}>{selected.isRead ? 'Read' : 'Unread'}</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selected.message}</p>
              <dl className="notice-drawer-meta">
                <dt>From</dt>
                <dd>{selected.creator?.fullName || 'School Administration'}</dd>
                <dt>Sent</dt>
                <dd>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</dd>
                <dt>Audience</dt>
                <dd>{targetLabel(selected)}</dd>
              </dl>
              {!selected.isRead && (
                <button type="button" className="btn-primary" onClick={() => handleMarkRead(selected.id)}>Mark as read</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
