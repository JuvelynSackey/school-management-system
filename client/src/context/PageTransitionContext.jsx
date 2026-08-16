import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PageTransitionContext = createContext(null);

const EXPAND_MS = 550;
const REVEAL_MS = 600;

// Full-screen "warp" overlay used for the landing -> login hand-off. Gates
// navigation behind a timed animation, the same pattern the login page's
// earlier key-turn animation used, just generalized into a shared trigger.
export function PageTransitionProvider({ children }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle'); // 'idle' | 'expanding' | 'revealing'
  const originRef = useRef({ x: '50%', y: '50%' });

  const goTo = useCallback((path, originEvent) => {
    if (originEvent && typeof originEvent.clientX === 'number') {
      originRef.current = { x: `${originEvent.clientX}px`, y: `${originEvent.clientY}px` };
    } else {
      originRef.current = { x: '50%', y: '50%' };
    }
    setPhase('expanding');
    setTimeout(() => {
      navigate(path);
      setPhase('revealing');
      setTimeout(() => setPhase('idle'), REVEAL_MS);
    }, EXPAND_MS);
  }, [navigate]);

  return (
    <PageTransitionContext.Provider value={{ goTo }}>
      {children}
      <div
        className={`page-warp page-warp-${phase}`}
        style={{ '--warp-x': originRef.current.x, '--warp-y': originRef.current.y }}
        aria-hidden="true"
      >
        <div className="page-warp-core" />
      </div>
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) {
    throw new Error('usePageTransition must be used within a PageTransitionProvider');
  }
  return ctx;
}
