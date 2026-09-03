import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import LoginModal from '../../components/auth/LoginModal';
import RegisterModal from '../../components/auth/RegisterModal';

// No Legal column — /privacy and /terms don't exist in this app, and a
// footer link to a page that 404s is worse than no link at all.
const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { to: '/features', label: 'Features' },
      { to: '/how-it-works', label: 'How It Works' },
      { to: '/jesmanage-intelligence', label: 'Intelligence' },
      { to: '/demo', label: 'Demo' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
  },
];

const linkClass = 'text-sm text-gray-500 no-underline transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
const buttonLinkClass = `${linkClass} appearance-none border-none bg-transparent p-0 text-left cursor-pointer`;

export default function Footer() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <img src="/logo.png" alt="JesManage" className="h-7 w-7 rounded-lg" />
              JesManage
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Secure, multi-tenant, offline-capable school management built for Ghanaian basic schools.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{col.heading}</h3>
              <ul className="mt-4 flex list-none flex-col gap-3 p-0">
                {col.links.map((l) => (
                  <li key={l.to}><NavLink to={l.to} className={linkClass}>{l.label}</NavLink></li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Access</h3>
            <ul className="mt-4 flex list-none flex-col gap-3 p-0">
              <li><button type="button" onClick={() => setLoginOpen(true)} className={buttonLinkClass}>Login</button></li>
              <li><button type="button" onClick={() => setRegisterOpen(true)} className={buttonLinkClass}>School Registration</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-1 border-t border-gray-100 pt-8 text-center dark:border-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2026 JesManage</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">Ghanaian school management, reimagined.</p>
        </div>
      </div>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={() => navigate('/dashboard')} />
      <RegisterModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} />
    </footer>
  );
}
