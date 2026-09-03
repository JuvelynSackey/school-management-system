import { motion } from 'framer-motion';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';

const iconProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const NARRATIVES = [
  {
    title: 'Paper-based workflows',
    before: 'Attendance registers, mark sheets, and fee ledgers only one person can update at a time.',
    after: 'One digital record every authorized role can see and update, live.',
    beforeIcon: (
      <svg {...iconProps}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h7M9 16h7M9 8h3" /></svg>
    ),
    afterIcon: (
      <svg {...iconProps}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>
    ),
  },
  {
    title: 'Disconnected information',
    before: 'Results in one spreadsheet, fees in another, attendance somewhere else entirely.',
    after: 'Students, results, attendance, and fees — one connected record per student.',
    beforeIcon: (
      <svg {...iconProps}><circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" /></svg>
    ),
    afterIcon: (
      <svg {...iconProps}><circle cx="12" cy="12" r="2.2" /><circle cx="5" cy="6" r="1.6" /><circle cx="19" cy="6" r="1.6" /><circle cx="12" cy="19" r="1.6" /><path d="M12 12L5 6M12 12l7-6M12 12v7" /></svg>
    ),
  },
  {
    title: 'Repetitive administrative work',
    before: 'The same totals, the same lookups, the same report typed out term after term.',
    after: 'Totals, grades, and report cards generate themselves from data entered once.',
    beforeIcon: (
      <svg {...iconProps}><path d="M4 4v6h6M20 20v-6h-6" /><path d="M20 10a8 8 0 0 0-14.9-3.5M4 14a8 8 0 0 0 14.9 3.5" /></svg>
    ),
    afterIcon: (
      <svg {...iconProps}><path d="M5 20V13M11 20V7M17 20V11" /><path d="M3 20h18" /></svg>
    ),
  },
];

export default function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="The Problem"
        title="School administration shouldn't feel this complicated."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {NARRATIVES.map((n, i) => (
          <Reveal key={n.title} delay={i * 90} className="group rounded-2xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{n.title}</h3>

            <div className="relative mt-6 flex h-14 items-center">
              <motion.div
                className="absolute flex items-center gap-2 text-gray-400 dark:text-gray-600"
                initial={{ opacity: 1, x: 0 }}
                whileInView={{ opacity: 0, x: -12 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
              >
                {n.beforeIcon}
                <span className="text-xs font-medium uppercase tracking-wide">Before</span>
              </motion.div>
              <motion.div
                className="absolute flex items-center gap-2 text-cyan-600 dark:text-cyan-400"
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
              >
                {n.afterIcon}
                <span className="text-xs font-medium uppercase tracking-wide">With JesManage</span>
              </motion.div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{n.before}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-900 dark:text-white">{n.after}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
