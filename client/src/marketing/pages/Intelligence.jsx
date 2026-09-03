import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';

const iconProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

function IntelPanel({ eyebrow, title, children }) {
  return (
    <section className="border-t border-gray-100 py-16 dark:border-gray-900 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading eyebrow={eyebrow} title={title} align="left" className="mx-0 items-start text-left" />
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

// 01 — Remark Assistant. Real behavior: canned, score-banded templates
// pulled from the student's own term data when no model key is configured
// (server/tests/ai.test.js) — always reviewable, never auto-applied.
function RemarkAssistantDemo() {
  const [state, setState] = useState('suggested');
  return (
    <Reveal className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Ama Mensah &middot; Term 2 &middot; 79.25% average</span>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">AI-generated</span>
      </div>
      <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm italic text-gray-700 dark:bg-gray-950 dark:text-gray-300">
        {state === 'regenerated'
          ? 'Ama has shown consistent effort this term, with particularly strong results in Mathematics and Integrated Science.'
          : 'A pleasure to teach — Ama grasps new concepts quickly and supports classmates generously.'}
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setState('accepted')} className="rounded-full bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500">Accept</button>
        <button type="button" className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300">Edit</button>
        <button type="button" onClick={() => setState('regenerated')} className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300">Regenerate</button>
      </div>
      {state === 'accepted' && <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">Added to report card — a teacher always reviews before it counts.</p>}
    </Reveal>
  );
}

// 02 — Early Warning. Exactly the 3 real signals from earlyWarning.service.js
// — no more, no invented triggers. Fee arrears is deliberately excluded there.
const WARNING_SIGNALS = [
  { label: 'Academic Decline', desc: 'Term-over-term average dropped more than 3%.' },
  { label: 'Low Attendance', desc: 'Below 75% attendance, with at least 5 records on file.' },
  { label: 'Multiple Subject Failures', desc: 'Below 40% in two or more subjects this term.' },
];

function EarlyWarningDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {WARNING_SIGNALS.map((w, i) => (
        <Reveal key={w.label} delay={i * 80} className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900 dark:bg-amber-950/20">
          <span className="text-amber-600 dark:text-amber-400">
            <svg {...iconProps}><path d="M12 3l9 16H3L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>
          </span>
          <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{w.label}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{w.desc}</p>
        </Reveal>
      ))}
    </div>
  );
}

// 03 — Natural Language Admin Assistant. Mirrors IntelligenceInspector.jsx's
// real 5-step trace exactly — every field there comes straight off the
// actual API response, nothing simulated.
const NL_STEPS = [
  { label: 'Query', detail: '"Show me students with outstanding fees."' },
  { label: 'Intent', detail: 'students_with_outstanding_fees' },
  { label: 'Authorization', detail: 'Role "admin" allowed' },
  { label: 'Tenant Context', detail: 'Scoped to this school only' },
  { label: 'Structured Data', detail: 'Pre-approved service dispatch, sanitized fields' },
  { label: 'Response', detail: '12 students returned' },
];

function NaturalLanguageDemo() {
  return (
    <Reveal className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap gap-2">
        {NL_STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center dark:border-gray-800 dark:bg-gray-950">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">{s.label}</p>
              <p className="mt-0.5 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-400">{s.detail}</p>
            </div>
            {i < NL_STEPS.length - 1 && <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">→</span>}
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-gray-500 dark:text-gray-500">
        Controlled intents. Permission-aware data access. The assistant can only run a pre-approved
        set of queries, always scoped to the asking admin&apos;s own school.
      </p>
    </Reveal>
  );
}

// 04 — Performance Insights. Pure deterministic math (performanceInsights.
// service.js's own header comment says so) — no AI here. Reuses the
// validated academic-bar color from AnalyticsPage.jsx.
const TREND_DATA = [
  { term: 'Term 1', average: 68 },
  { term: 'Term 2', average: 74 },
  { term: 'Term 3', average: 79 },
];

function PerformanceInsightsDemo() {
  return (
    <Reveal className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Class average, term over term (example)</p>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={TREND_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="term" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
            <Bar dataKey="average" fill="#2a78d6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">+11% over 2 terms — improving trend</p>
    </Reveal>
  );
}

// 05 — Assessment Summary. Maps to the real GET /ai/performance-summary
// endpoint (subject-level, school-wide averages/pass-rates), distinct from
// per-student Performance Insights above.
function AssessmentSummaryDemo() {
  return (
    <Reveal className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Key Strength</p>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Mathematics — 84% pass rate</p>
      </div>
      <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Needs Attention</p>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">French — 52% pass rate</p>
      </div>
      <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Recommendation</p>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">Review French curriculum pacing</p>
      </div>
    </Reveal>
  );
}

// 06 — Smart Announcements. Real tones from AnnouncementComposer.jsx's
// TONE_OPTIONS, enforced server-side (ai.validators.js).
const TONES = ['Friendly', 'Formal', 'Urgent'];

function SmartAnnouncementsDemo() {
  const [tone, setTone] = useState('Friendly');
  const drafts = {
    Friendly: "Hi parents! Just a friendly reminder that Term 2 wraps up this Friday 😊",
    Formal: 'Please be advised that Term 2 concludes on Friday, 12th December.',
    Urgent: 'Important: Term 2 ends this Friday. Outstanding fees must be settled beforehand.',
  };
  return (
    <Reveal className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex gap-2">
        {TONES.map((t) => (
          <button
            key={t} type="button" onClick={() => setTone(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tone === t ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <motion.p
        key={tone}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
        className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-300"
      >
        {drafts[tone]}
      </motion.p>
      <p className="mt-3 text-xs text-gray-400">Draft only — you review and edit before sending.</p>
    </Reveal>
  );
}

export default function Intelligence() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-4 pt-16 text-center sm:px-6 sm:pt-20">
        <Reveal as="h1" className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Intelligence built around your school&apos;s data.
        </Reveal>
        <Reveal as="p" delay={100} className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          JesManage Intelligence assists people with decisions without replacing human judgment.
        </Reveal>
      </section>

      <IntelPanel eyebrow="01 — Remark Assistant" title="Suggestions from a student's own data."><RemarkAssistantDemo /></IntelPanel>
      <IntelPanel eyebrow="02 — Early Warning" title="Three real signals, nothing invented."><EarlyWarningDemo /></IntelPanel>
      <IntelPanel eyebrow="03 — Natural Language Admin Assistant" title="Ask a question. See exactly how it was answered."><NaturalLanguageDemo /></IntelPanel>
      <IntelPanel eyebrow="04 — Performance Insights" title="Deterministic trends, not a black box."><PerformanceInsightsDemo /></IntelPanel>
      <IntelPanel eyebrow="05 — Assessment Summary" title="A term of marksheets, in three sentences."><AssessmentSummaryDemo /></IntelPanel>
      <IntelPanel eyebrow="06 — Smart Announcements" title="Draft in the right tone, review before sending."><SmartAnnouncementsDemo /></IntelPanel>
    </div>
  );
}
