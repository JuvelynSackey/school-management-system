import { useEffect } from 'react';

// Every call site conditionally *mounts* Modal ({open && <Modal .../>})
// rather than passing an isOpen prop and leaving it mounted -- so the
// background-scroll lock keys off the component's own mount/unmount
// lifecycle, restoring the previous overflow value (not a hardcoded
// 'unset') in case something else on the page already set one.
export default function Modal({
  title, onClose, children, wide = false,
}) {
  useEffect(() => {
    // <html>, not <body>, is this app's actual scrolling element -- body
    // has no explicit height/overflow-y of its own (index.css only sets
    // overflow-x: hidden on both), so locking body alone leaves <html>
    // free to keep scrolling behind the modal. Lock both, and restore
    // each element's own previous value rather than a hardcoded ''.
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-card${wide ? ' modal-card--wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
