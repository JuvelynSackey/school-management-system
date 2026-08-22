import { useNavigate } from 'react-router-dom';

const ICONS = {
  personPlus: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M18.5 8v6M15.5 11h6" />
    </svg>
  ),
  wallet: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  document: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2.5h8l5 5V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M14 2.5V8h5M8 12.5h8M8 16.5h8" />
    </svg>
  ),
  attendance: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      <path d="M8.5 14l2.2 2.2L15.5 12" />
    </svg>
  ),
  reports: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20.5V4.5a1 1 0 0 1 1-1h9.5L19 8v12.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M8.5 12.5v5M12 10v7.5M15.5 14v3.5" />
    </svg>
  ),
};

const DEFAULT_ACTIONS = [
  { icon: 'personPlus', label: 'Register New Pupil', to: '/students' },
  { icon: 'wallet', label: 'Record Fee Payment', to: '/fees' },
  { icon: 'document', label: 'Print Report Cards', to: '/results' },
];

export default function QuickActionsGrid({ actions = DEFAULT_ACTIONS }) {
  const navigate = useNavigate();
  return (
    <div className="panel">
      <h2>Quick Actions</h2>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <button key={action.label} type="button" className="quick-action-item" onClick={() => navigate(action.to)}>
            <span className="quick-action-icon">{ICONS[action.icon]}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
