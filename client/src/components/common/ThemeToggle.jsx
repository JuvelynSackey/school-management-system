import { useTheme } from '../../context/ThemeContext';

const OPTIONS = [
  { value: 'light', icon: '☀️', label: 'Light' },
  { value: 'dark', icon: '🌙', label: 'Dark' },
  { value: 'system', icon: '🖥️', label: 'System' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`theme-toggle-btn${theme === opt.value ? ' active' : ''}`}
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          aria-label={opt.label}
          aria-pressed={theme === opt.value}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
