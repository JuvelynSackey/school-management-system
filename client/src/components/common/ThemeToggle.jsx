import { useTheme } from '../../context/ThemeContext';

// A physical switch has no third position, so this reflects the resolved
// isDark value (which already accounts for 'system' + the OS preference)
// and always sets an explicit choice on click -- 'system' auto-detection
// still applies on first load, there's just no way back to it from here
// once a choice is made (same tradeoff every binary light/dark switch makes).
export default function ThemeToggle() {
  const { isDark, setTheme } = useTheme();

  return (
    <button
      type="button"
      className={`sun-moon-switch${isDark ? ' is-dark' : ''}`}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title="Theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="sms-track">
        <span className="sms-thumb">
          <svg className="sms-icon sms-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
            <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
            <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
            <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
            <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
          </svg>
          <svg className="sms-icon sms-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path className="sms-crescent" d="M20.2 14.1A8.5 8.5 0 1 1 10.9 4.8a6.6 6.6 0 0 0 9.3 9.3Z" />
            <path className="sms-star sms-star-a" d="M18.4 5.6l0.5 1.6 1.6 0.5-1.6 0.5-0.5 1.6-0.5-1.6-1.6-0.5 1.6-0.5z" />
            <path className="sms-star sms-star-b" d="M20.3 16.2l0.35 1.1 1.1 0.35-1.1 0.35-0.35 1.1-0.35-1.1-1.1-0.35 1.1-0.35z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
