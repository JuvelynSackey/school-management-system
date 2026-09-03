import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Reveal from '../components/Reveal';

// Grounded in the real pipeline this session has verified repeatedly
// (schoolOnboarding, admissions, results.controller's submit/review/
// approve/lock flow, terminal report generation, publish/parent-access).
const STAGES = [
  { title: 'School Setup', role: 'Admin', desc: 'Terms, grading scheme, and school settings are configured once.', next: 'The school is ready to add people and academics.' },
  { title: 'Add People', role: 'Admin', desc: 'Students are registered, guardians linked, teachers added.', next: 'Everyone has an account for their role.' },
  { title: 'Configure Academics', role: 'Admin', desc: 'Subjects, classes, and grading bands are set up.', next: "Teachers can start entering results against a real structure." },
  { title: 'Enter Results', role: 'Teacher', desc: 'Class Score (/50) and Exam Score (/50) per subject — offline if needed.', next: 'Scores are submitted for admin review.' },
  { title: 'Review', role: 'Admin', desc: 'Each submitted subject is checked before approval.', next: 'Admin approves, or sends it back with a reason.' },
  { title: 'Approve', role: 'Admin', desc: 'Once every subject for a class is approved, that term is final.', next: 'Report cards can now be generated.' },
  { title: 'Generate Reports', role: 'Admin', desc: 'Report cards are generated with a QR code anyone can verify.', next: 'Reports are locked and ready to publish.' },
  { title: 'Publish', role: 'Admin', desc: 'Locked reports become visible to parents and students.', next: 'Parents and students can log in and view them.' },
  { title: 'Parent & Student Access', role: 'Parent / Student', desc: 'Approved results and report cards are downloaded, any time.', next: 'The term is complete.' },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const stage = STAGES[active];

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-6 pt-16 text-center sm:px-6 sm:pt-20">
        <Reveal as="h1" className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          From school setup to final report.
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="flex snap-x gap-2 overflow-x-auto pb-3">
          {STAGES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setActive(i)}
              className={`flex shrink-0 snap-start flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                active === i
                  ? 'border-cyan-400 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/60'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700'
              }`}
            >
              <span className={`text-[10px] font-bold ${active === i ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-400'}`}>0{i + 1}</span>
              <span className={`whitespace-nowrap text-sm font-semibold ${active === i ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{s.title}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stage.title}</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{stage.role}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{stage.desc}</p>
            <div className="mt-5 flex items-start gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-500">
              <span aria-hidden="true" className="text-cyan-500">→</span>
              <span>{stage.next}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
