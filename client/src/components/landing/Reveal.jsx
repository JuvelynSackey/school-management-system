import { motion } from 'framer-motion';

// Fades/slides children in once they scroll into view, via Framer Motion's
// whileInView. Same external API as the plain-IntersectionObserver version
// this replaced (children/className/delay/as), so every call site in
// LandingPage.jsx needed no changes.
const VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Reveal({ children, className = '', delay = 0, as = 'div' }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={VARIANTS}
      transition={{ duration: 0.6, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
