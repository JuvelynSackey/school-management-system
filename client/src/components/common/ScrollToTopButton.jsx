import { useEffect, useState } from 'react';

const VISIBILITY_THRESHOLD = 300;

// Floating jump-to-top button for dense student tables / long forms.
// AppShell.jsx already resets scroll to 0 on every route change, so this is
// purely a same-page convenience -- it never needs to know about routing.
export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > VISIBILITY_THRESHOLD);
    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className="scroll-to-top-btn"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}
