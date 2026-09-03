import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Cyan/teal is the primary brand accent everywhere on the marketing site;
// indigo is reserved for AI/"Intelligence"-specific UI only (see
// Intelligence.jsx, IntelligenceTeaserSection.jsx) so the two never compete.
const VARIANTS = {
  primary: 'bg-cyan-600 text-white hover:bg-cyan-500 dark:bg-cyan-500 dark:text-gray-950 dark:hover:bg-cyan-400',
  secondary: 'border border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-700 dark:bg-transparent dark:text-white dark:hover:border-gray-500',
  ghost: 'text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white',
};

const BASE = 'group inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold no-underline transition-colors duration-150';

// A trailing "→" in the label animates on hover/focus (group-hover), so
// every CTA across the site gets the same arrow-shift micro-interaction
// for free just by ending its label with an arrow.
const splitArrow = (children) => {
  if (typeof children !== 'string' || !children.endsWith('→')) return { label: children, arrow: false };
  return { label: children.slice(0, -1).trimEnd(), arrow: true };
};

export default function Button({ variant = 'primary', to, onClick, type = 'button', children, className = '' }) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  const { label, arrow } = splitArrow(children);
  const content = (
    <>
      {label}
      {arrow && <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-1">→</span>}
    </>
  );

  const motionProps = { whileHover: { y: -2 }, whileTap: { y: 0, scale: 0.98 }, transition: { duration: 0.15 } };

  if (to) {
    const MotionLink = motion.create(Link);
    return <MotionLink to={to} className={classes} {...motionProps}>{content}</MotionLink>;
  }
  return (
    <motion.button type={type} onClick={onClick} className={classes} {...motionProps}>
      {content}
    </motion.button>
  );
}
