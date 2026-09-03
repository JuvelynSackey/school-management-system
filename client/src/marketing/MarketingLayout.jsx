import { Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function MarketingLayout() {
  return (
    // reducedMotion="user" makes every Reveal/motion.* instance on the
    // marketing site automatically honor prefers-reduced-motion, with no
    // per-component check needed.
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <Navbar />
        <div className="h-16" aria-hidden="true" />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}
