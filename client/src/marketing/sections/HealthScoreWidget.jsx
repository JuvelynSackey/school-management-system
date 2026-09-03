import SectionHeading from '../components/SectionHeading';
import Reveal from '../components/Reveal';

// Weights and mechanism match server/src/services/schoolHealth.service.js
// exactly (WEIGHTS = { academic: 0.40, attendance: 0.30, feeCollection: 0.15,
// reportApproval: 0.15 }) — every component reuses an aggregate the app
// already shows elsewhere, so the score can never quietly disagree with what
// an admin sees on the Intelligence/Reports pages for the same term. The
// numbers below are an illustrative example, not a real school's data.
const COMPONENTS = [
  { label: 'Academic Average', weight: 40, value: 78 },
  { label: 'Attendance', weight: 30, value: 94 },
  { label: 'Fee Collection', weight: 15, value: 82 },
  { label: 'Report Approval Rate', weight: 15, value: 90 },
];

const EXAMPLE_SCORE = Math.round(
  COMPONENTS.reduce((sum, c) => sum + (c.weight / 100) * c.value, 0) * 10,
) / 10;

export default function HealthScoreWidget() {
  return (
    <section className="border-t border-gray-100 py-20 dark:border-gray-900">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading
          title="Transparent by Design"
          subtitle="No black boxes — every score and suggestion traces back to numbers you can already see."
        />

        <Reveal delay={120} className="mx-auto mt-10 max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">School Health Score</h3>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">Example</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-400">{EXAMPLE_SCORE}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          <div className="mt-6 space-y-3">
            {COMPONENTS.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{c.label} <span className="text-gray-400 dark:text-gray-500">({c.weight}% weight)</span></span>
                  <span className="font-medium text-gray-900 dark:text-white">{c.value}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ width: `${c.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
            Each component is a real aggregate the app already computes — academic average, attendance rate,
            fee collection rate, and the share of report cards approved. If an input doesn&apos;t apply yet
            (e.g. no fees assigned this term), its weight redistributes across the rest rather than dragging
            the score toward zero.
          </p>
        </Reveal>

        <Reveal delay={200} className="mx-auto mt-8 max-w-2xl text-center text-sm text-gray-600 dark:text-gray-400">
          The same discipline applies to JesManage&apos;s natural-language admin assistant: every answer comes
          with an inspector trace — the query, the classified intent, the permission/tenant check, which
          service ran, and what data was returned — so nothing is a guess dressed up as an answer.
        </Reveal>
      </div>
    </section>
  );
}
