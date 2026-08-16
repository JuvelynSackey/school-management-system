import { useEffect, useState } from 'react';
import { getMyNoticeBoard } from '../../api/announcements.api';

const targetLabel = (a) => {
  if (a.targetType === 'school') return 'Whole School';
  if (a.targetType === 'class') return a.targetClass ? `${a.targetClass.name} ${a.targetClass.section || ''}` : 'Class';
  return 'Just for you';
};

export default function NoticeBoard() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyNoticeBoard()
      .then(setAnnouncements)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load notices.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1>Notice Board</h1>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <div className="panel">
          {announcements.length === 0 && <p className="muted">No notices yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.map((a) => (
              <div key={a.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className="badge badge-neutral">{targetLabel(a)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <p>{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
