import { useEffect } from 'react';
import RegisterForm from './RegisterForm';

// Mirrors LoginModal.jsx exactly (same overlay/scroll-lock/Escape/close/
// history-back behavior) — the "Register Your School" counterpart opened
// from the marketing navbar, instead of navigating to the full
// /register-school page.
export default function RegisterModal({ isOpen, onClose }) {
  // Pushes a same-URL history entry while open, so the browser/gesture
  // Back button closes this modal instead of navigating the page away from
  // under it — see LoginModal.jsx for the full reasoning.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.history.pushState({ jesmanageModal: true }, '');
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    const onPopState = () => onClose();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
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
