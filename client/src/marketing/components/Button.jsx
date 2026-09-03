import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-indigo-700 text-white hover:bg-indigo-800',
  secondary: 'bg-white text-indigo-700 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
};

const BASE = 'inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold no-underline transition-colors duration-150';

// One CTA component for the whole marketing site — renders a router <Link>
// when `to` is given, otherwise a plain <button>, so callers don't have to
// pick the right element themselves.
export default function Button({ variant = 'primary', to, onClick, type = 'button', children, className = '' }) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (to) {
    return <Link to={to} className={classes}>{children}</Link>;
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
