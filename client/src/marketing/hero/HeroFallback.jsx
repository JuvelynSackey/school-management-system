import { motion } from 'framer-motion';

const TONE_CLASSES = {
  cyan: 'text-cyan-600 dark:text-cyan-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  plain: 'text-gray-900 dark:text-white',
};

// Static composition matching HeroScene's 5 real product-surface cards,
// used whenever the R3F canvas doesn't mount (reduced-motion, <900px,
// still loading). One fallback visual, not three bespoke ones. The gentle
// float still respects prefers-reduced-motion via MarketingLayout's
// MotionConfig, so this stays fully still when that's set.
const CARDS = [
  { value: '482', label: 'Students', tone: 'cyan', pos: 'left-2 top-6', delay: 0 },
  { value: '96%', label: 'Attendance', tone: 'plain', pos: 'right-4 top-0', delay: 0.4 },
  { value: 'GH₵128k', label: 'Fees Collected', tone: 'plain', pos: 'left-6 bottom-16', delay: 0.8 },
  { value: 'Approved', label: 'Results Workflow', tone: 'cyan', pos: 'right-0 bottom-8', delay: 1.2 },
  { value: '86.2', label: 'School Health Score', tone: 'indigo', pos: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', delay: 1.6 },
];

export default function HeroFallback() {
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-md sm:h-[420px]">
      {CARDS.map((c) => (
        <motion.div
          key={c.label}
          className={`absolute ${c.pos} flex flex-col items-center gap-1 whitespace-nowrap rounded-xl border border-gray-200/70 bg-white/90 px-4 py-2.5 text-center shadow-lg backdrop-blur-sm dark:border-gray-700/70 dark:bg-gray-900/90`}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className={`text-lg font-bold ${TONE_CLASSES[c.tone]}`}>{c.value}</span>
          <span className="text-[10px] font-medium tracking-wide text-gray-500 dark:text-gray-400">{c.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
