import { useEffect } from 'react';
import LoginForm from './LoginForm';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  // Lock background scroll while open, and let Escape close it. Both html
  // and body need the lock — body alone leaves the page scrollable behind
  // the overlay in several browsers, since the viewport's actual scrolling
  // box is <html>, not <body>.
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
      <div className="cosmic-card cosmic-card--modal cosmic-card--solid" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <LoginForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
