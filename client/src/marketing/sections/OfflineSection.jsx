import { motion } from 'framer-motion';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const STAGES = [
  { label: 'Online', icon: <svg {...iconProps}><path d="M2 8.5a16 16 0 0 1 20 0M5.5 12.5a11 11 0 0 1 13 0M9 16.3a5.5 5.5 0 0 1 6 0" /><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" /></svg> },
  { label: 'Connection Lost', icon: <svg {...iconProps}><path d="M2.5 2.5l19 19M2 8.5a16 16 0 0 1 6.3-3.4M15.7 5.1A16 16 0 0 1 22 8.5M5.5 12.5a11 11 0 0 1 4-2.3M14.5 10.2a11 11 0 0 1 4 2.3" /></svg> },
  { label: 'Local Queue', icon: <svg {...iconProps}><rect x="3" y="6" width="18" height="4" rx="1" /><rect x="3" y="14" width="18" height="4" rx="1" /></svg> },
  { label: 'Continue Working', icon: <svg {...iconProps}><path d="M4 20l4.5-9L13 15l3-5 4 10" /></svg> },
  { label: 'Connection Restored', icon: <svg {...iconProps}><path d="M2 8.5a16 16 0 0 1 20 0M5.5 12.5a11 11 0 0 1 13 0M9 16.3a5.5 5.5 0 0 1 6 0" /><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" /></svg> },
  { label: 'Sync', icon: <svg {...iconProps}><path d="M20 11A8 8 0 0 0 5.1 7.5M4 13a8 8 0 0 0 14.9 3.5" /><path d="M4 4v6h6M20 20v-6h-6" /></svg> },
  { label: 'Complete', icon: <svg {...iconProps}><path d="M20 6L9 17l-5-5" /></svg> },
];

export default function OfflineSection() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-900 dark:bg-gray-900/40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading eyebrow="Offline Resilience" title="No connection? Keep entering marks." />

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-1 gap-y-4">
          {STAGES.map((s, i) => (
            <Reveal key={s.label} delay={i * 60} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                <span className={i === 1 ? 'text-red-500' : i === 0 || i === 4 ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-600 dark:text-gray-400'}>
                  {s.icon}
                </span>
                <span className="whitespace-nowrap text-[11px] font-medium text-gray-700 dark:text-gray-300">{s.label}</span>
              </div>
              {i < STAGES.length - 1 && <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">→</span>}
            </Reveal>
          ))}
        </div>

        <Reveal delay={200} className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-center gap-2">
            <motion.span
              className="h-2 w-2 rounded-full bg-amber-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <code className="text-xs font-semibold text-amber-800 dark:text-amber-400">RESULT_LOCKED</code>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
            Approved results cannot be silently overwritten. If a subject was approved while a
            teacher was offline, the sync stops and flags the conflict for an admin instead of
            replacing the approved record.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
