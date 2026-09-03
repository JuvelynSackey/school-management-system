import { lazy, Suspense, useEffect, useState } from 'react';
import HeroFallback from './HeroFallback';

const HeroScene = lazy(() => import('./HeroScene'));

// Three conditions all resolve to the same static fallback — one fallback
// path, not three: prefers-reduced-motion, a <900px viewport, and the lazy
// R3F chunk still loading.
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
    return <HeroFallback />;
  }

  return (
    <div className="mx-auto h-[420px] w-full max-w-lg">
      <Suspense fallback={<HeroFallback />}>
        <HeroScene />
      </Suspense>
    </div>
  );
}
