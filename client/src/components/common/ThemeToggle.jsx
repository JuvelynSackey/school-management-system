import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const OPTIONS = [
  { value: 'light', icon: '☀️', label: 'Light' },
  { value: 'dark', icon: '🌙', label: 'Dark' },
  { value: 'system', icon: '🖥️', label: 'System' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = OPTIONS.find((opt) => opt.value === theme) || OPTIONS[2];

  return (
    <div className="theme-toggle" ref={containerRef}>
      <button
        type="button"
        className="theme-toggle-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
        title="Theme"
      >
        ◐
      </button>
      {open && (
        <div className="theme-toggle-menu" role="menu">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === opt.value}
              className={`theme-toggle-menu-item${theme === opt.value ? ' active' : ''}`}
              onClick={() => { setTheme(opt.value); setOpen(false); }}
            >
              <span aria-hidden="true">{opt.icon}</span>
              <span>{opt.label}</span>
              {theme === opt.value && <span aria-hidden="true" style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
