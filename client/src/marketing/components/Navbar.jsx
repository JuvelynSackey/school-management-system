import { Fragment, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import LoginModal from '../../components/auth/LoginModal';
import Button from './Button';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/demo', label: 'Demo' },
  { to: '/about', label: 'About/Contact' },
];

const linkClasses = ({ isActive }) =>
  `text-sm font-medium no-underline transition-colors ${isActive ? 'text-indigo-700' : 'text-gray-600 hover:text-indigo-700'}`;

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Fragment>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 no-underline">
          <img src="/logo.png" alt="JesManage" className="h-8 w-8 rounded-lg" />
          JesManage
        </NavLink>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClasses}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="secondary" onClick={() => setLoginOpen(true)}>Login</Button>
          <Button variant="primary" onClick={() => navigate('/register-school')}>Register Your School</Button>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <div className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-gray-700" />
            <span className="h-0.5 w-5 bg-gray-700" />
            <span className="h-0.5 w-5 bg-gray-700" />
          </div>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClasses} onClick={() => setMenuOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="secondary" onClick={() => { setMenuOpen(false); setLoginOpen(true); }}>Login</Button>
            <Button variant="primary" onClick={() => { setMenuOpen(false); navigate('/register-school'); }}>Register Your School</Button>
          </div>
        </div>
      )}
      </header>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => navigate('/dashboard')}
      />
    </Fragment>
  );
}
