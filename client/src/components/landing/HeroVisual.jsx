import { lazy, Suspense, useEffect, useState } from 'react';
import DashboardPreviewMockup from './DashboardPreviewMockup';

const HeroScene = lazy(() => import('./HeroScene'));

// Three conditions all resolve to the same fallback (DashboardPreviewMockup) —
// one fallback path, not three: prefers-reduced-motion, a <900px viewport
// (matches the app's own real breakpoint), and the lazy chunk still loading.
export default function HeroVisual() {
  const [canRender3d, setCanRender3d] = useState(false);

  useEffect(() => {
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const widthQuery = window.matchMedia('(min-width: 900px)');

    const evaluate = () => setCanRender3d(!reduceMotionQuery.matches && widthQuery.matches);
    evaluate();

    reduceMotionQuery.addEventListener('change', evaluate);
    widthQuery.addEventListener('change', evaluate);
    return () => {
      reduceMotionQuery.removeEventListener('change', evaluate);
      widthQuery.removeEventListener('change', evaluate);
    };
  }, []);

  if (!canRender3d) {
    return <DashboardPreviewMockup />;
  }

  return (
    <div className="hero-scene-wrap">
      <Suspense fallback={<DashboardPreviewMockup />}>
        <HeroScene />
      </Suspense>
    </div>
  );
}
