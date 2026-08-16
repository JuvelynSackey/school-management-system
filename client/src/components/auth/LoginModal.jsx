import { useEffect } from 'react';
import LoginForm from './LoginForm';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  // Lock background scroll while open, and let Escape close it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="cosmic-card cosmic-card--modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <LoginForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
