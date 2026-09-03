import { motion } from 'framer-motion';
import Reveal from '../components/Reveal';

const PRINCIPLES = [
  { title: 'Built for Ghanaian Schools', desc: 'Not a generic platform with a currency symbol swapped in — GH₵ billing, NaCCA-style grading, and the real Creche-to-JHS-3 class ladder throughout.' },
  { title: 'Administrative Efficiency', desc: 'Totals, grades, and report cards generate themselves from data entered once, instead of being retyped every term.' },
  { title: 'Connected Academic Records', desc: 'Students, results, attendance, and fees live as one record, not scattered spreadsheets.' },
  { title: 'Offline Resilience', desc: 'A dropped connection at a rural school queues work locally and syncs automatically, without silently overwriting approved results.' },
  { title: 'Secure Multi-Tenancy', desc: "Every school's data is isolated at the database query layer — one platform, many schools, never a mixed record." },
  { title: 'Responsible Intelligence', desc: 'AI features assist people with decisions — remarks, summaries, drafts — but a human always reviews before anything counts.' },
];

// Abstract architecture nodes (tenant isolation / offline queue / audit
// log) — a stylized representation of real mechanisms, not a literal
// internals diagram.
const ARCH_NODES = [
  { label: 'Tenant Isolation', pos: 'left-[8%] top-[20%]' },
  { label: 'Offline Queue', pos: 'right-[10%] top-[10%]' },
  { label: 'Audit Log', pos: 'left-[15%] bottom-[15%]' },
  { label: 'Role Access', pos: 'right-[8%] bottom-[22%]' },
];

export default function About() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-6 pt-16 text-center sm:px-6 sm:pt-20">
        <Reveal as="h1" className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Built around the realities of modern school administration.
        </Reveal>
        <Reveal as="p" delay={100} className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
          JesManage exists because Ghanaian basic schools deserve software designed around how they
          actually run — not a generic template with the currency changed.
        </Reveal>
      </section>

      <section className="relative mx-auto h-64 max-w-3xl px-4 sm:px-6">
        <div className="relative h-full w-full">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="50" y1="50" x2="12" y2="25" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="0.3" />
            <line x1="50" y1="50" x2="88" y2="15" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="0.3" />
            <line x1="50" y1="50" x2="18" y2="80" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="0.3" />
            <line x1="50" y1="50" x2="85" y2="72" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="0.3" />
          </svg>
          <motion.div
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300 bg-cyan-50 text-xs font-bold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            SCHOOL
          </motion.div>
          {ARCH_NODES.map((n) => (
            <div key={n.label} className={`absolute ${n.pos} rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400`}>
              {n.label}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 70} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{p.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{p.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
