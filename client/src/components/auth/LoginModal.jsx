import { useEffect } from 'react';
import LoginForm from './LoginForm';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  // Lock background scroll while open, let Escape close it, and — since
  // opening this modal never changes the URL — push a same-URL history
  // entry so the browser/gesture Back button closes the modal instead of
  // silently navigating the page out from under it (popstate fires the
  // moment the browser pops that entry, whether it's a physical back
  // button, a mouse-back-button click, or a swipe-back gesture). Closing
  // any other way (X, overlay click, Escape, successful login) just lets
  // that entry sit there unused — same URL, so it's invisible; not worth
  // the risk of a manual history.back() call racing a concurrent
  // navigate() on the onSuccess path.
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
      <div className="cosmic-card cosmic-card--modal cosmic-card--solid" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        <LoginForm onSuccess={onSuccess} />
      </div>
    </div>
  );
}
