import { motion } from 'framer-motion';

// Scroll-reveal wrapper for the marketing site. Respects prefers-reduced-motion
// automatically via MotionConfig (mounted once in MarketingLayout.jsx) — no
// per-instance check needed here.
export default function Reveal({ as: Tag = 'div', children, delay = 0, y = 18, className = '', ...rest }) {
  const MotionTag = motion[Tag] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.2, 0.65, 0.3, 0.9] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
