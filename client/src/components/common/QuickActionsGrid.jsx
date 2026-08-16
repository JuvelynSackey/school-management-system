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
