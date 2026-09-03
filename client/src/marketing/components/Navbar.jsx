import { Fragment, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoginModal from '../../components/auth/LoginModal';
import RegisterModal from '../../components/auth/RegisterModal';
import ThemeToggle from '../../components/common/ThemeToggle';
import Button from './Button';

const LINKS = [
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/jesmanage-intelligence', label: 'Intelligence' },
  { to: '/demo', label: 'Demo' },
];

const linkClasses = ({ isActive }) =>
  `text-sm font-medium no-underline transition-colors ${isActive ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'}`;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open, same pattern as
  // LoginModal/RegisterModal.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  return (
    <Fragment>
      {/* position: fixed, not sticky — the app's global `html, body {
          overflow-x: hidden }` rule (index.css) implicitly forces
          overflow-y: auto on both, which demotes <body> from Chrome's
          special root-scroller status and breaks position:sticky for any
          descendant. fixed sidesteps that entirely; MarketingLayout adds a
          matching h-16 spacer so content doesn't render underneath it. */}
      <header
        className={`fixed inset-x-0 top-0 z-40 h-16 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled
            ? 'border-b border-gray-200/80 bg-white/75 backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-950/75'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 no-underline dark:text-white">
            <img src="/logo.png" alt="JesManage" className="h-8 w-8 rounded-lg" />
            JesManage
          </NavLink>

          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClasses}>{l.label}</NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => setLoginOpen(true)}>Login</Button>
            <Button variant="primary" onClick={() => setRegisterOpen(true)}>Get Started →</Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <div className="flex flex-col gap-1">
                <span className="h-0.5 w-5 bg-gray-700 dark:bg-gray-300" />
                <span className="h-0.5 w-5 bg-gray-700 dark:bg-gray-300" />
                <span className="h-0.5 w-5 bg-gray-700 dark:bg-gray-300" />
              </div>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <Fragment>
            <motion.div
              className="fixed inset-0 z-50 bg-gray-950/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col gap-6 bg-white p-6 shadow-2xl dark:bg-gray-950"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900 dark:text-white">Menu</span>
                <button
                  type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  &times;
                </button>
              </div>
              <nav className="flex flex-col gap-5">
                {LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} className={linkClasses} onClick={() => setMenuOpen(false)}>
                    {l.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2">
                <Button variant="secondary" onClick={() => { setMenuOpen(false); setLoginOpen(true); }}>Login</Button>
                <Button variant="primary" onClick={() => { setMenuOpen(false); setRegisterOpen(true); }}>Get Started →</Button>
              </div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => navigate('/dashboard')}
      />
      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
    </Fragment>
  );
}
