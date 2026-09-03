import SectionHeading from '../components/SectionHeading';
import Reveal from '../components/Reveal';

// Every item verified against server/src: ghanaRegions.js (exactly 16
// official regions), beceReadiness.service.js, grading.service.js's 50/50
// bands, and the Creche-to-JHS-3 class hierarchy from schoolOnboarding.
const FEATURES = [
  { title: 'GH₵ Billing', desc: 'Fee structures, balances, and receipts in Ghana cedis throughout.' },
  { title: '16-Region Validated', desc: 'Guardian and student addresses checked against Ghana\'s 16 official regions.' },
  { title: 'BECE Candidate Readiness', desc: 'Checks JHS 3 candidates for the fields WAEC registration actually requires — DOB, index number, photo, gender.' },
  { title: 'Creche → JHS 3 Structure', desc: 'Classes follow the real basic-education ladder, not a generic freeform list.' },
  { title: 'NaCCA-Style Grading', desc: 'Class Score (/50) + Exam Score (/50) = Total (/100), the structure Ghanaian basic schools already grade by.' },
];

export default function GhanaFeatures() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-900 dark:bg-gray-900/40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading title="Built for Ghana" subtitle="Details a generic school platform gets wrong." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
