import { useEffect } from 'react';
import RegisterForm from './RegisterForm';

// Mirrors LoginModal.jsx exactly (same overlay/scroll-lock/Escape/close
// behavior) — the "Register Your School" counterpart opened from the
// marketing navbar, instead of navigating to the full /register-school page.
export default function RegisterModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="cosmic-card cosmic-card--modal cosmic-card--solid" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <RegisterForm />
      </div>
    </div>
  );
}
