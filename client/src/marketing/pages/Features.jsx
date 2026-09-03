import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';

const SCORES = [
  { subject: 'Mathematics', cls: 44, exam: 42, total: 86, grade: 'A1' },
  { subject: 'English Language', cls: 40, exam: 38, total: 78, grade: 'B2' },
  { subject: 'Integrated Science', cls: 41, exam: 40, total: 81, grade: 'A1' },
];

function AcademicSection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16">
      <Reveal>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">01 — Academic Management</span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Results, grading, and terminal reports — connected end to end.
        </h2>
        <ul className="mt-6 flex flex-col gap-2.5 text-sm text-gray-600 dark:text-gray-400">
          {['Results & Marksheet Management', 'Configurable Grading Schemes', 'Terminal Reports & Report Cards', 'Subjects & Classes', 'Attendance'].map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />{f}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Score Entry</p>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="text-gray-400"><th className="whitespace-normal py-1.5 font-medium">Subject</th><th className="whitespace-normal py-1.5 text-right font-medium">Class /50</th><th className="whitespace-normal py-1.5 text-right font-medium">Exam /50</th><th className="whitespace-normal py-1.5 text-right font-medium">Grade</th></tr>
          </thead>
          <tbody>
            {SCORES.map((s) => (
              <tr key={s.subject} className="border-t border-gray-100 dark:border-gray-800">
                <td className="whitespace-normal py-2 text-gray-700 dark:text-gray-300">{s.subject}</td>
                <td className="whitespace-normal py-2 text-right text-gray-700 dark:text-gray-300">{s.cls}</td>
                <td className="whitespace-normal py-2 text-right text-gray-700 dark:text-gray-300">{s.exam}</td>
                <td className="whitespace-normal py-2 text-right font-semibold text-cyan-700 dark:text-cyan-400">{s.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </section>
  );
}

// Tailwind's content scanner needs literal class strings — a template
// literal like `bg-${color}-50` is invisible to it and would silently
// generate no CSS at all, so the status colors are a lookup table instead.
const STATUS_CLASSES = {
  Paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  Partial: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Outstanding: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
};

const FEES = [
  { student: 'Kofi Owusu', status: 'Paid' },
  { student: 'Yaw Asante', status: 'Partial' },
  { student: 'Akosua Boateng', status: 'Outstanding' },
];

function FinancialSection() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-900 dark:bg-gray-900/40">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal delay={120} className="order-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 lg:order-1">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">Fee Status</p>
          <div className="flex flex-col gap-2">
            {FEES.map((f) => (
              <div key={f.student} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-900">
                <span className="text-gray-700 dark:text-gray-300">{f.student}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[f.status]}`}>{f.status}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">02 — Financial Management</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Fees tracked in GH₵, from structure to receipt.
          </h2>
          <ul className="mt-6 flex flex-col gap-2.5 text-sm text-gray-600 dark:text-gray-400">
            {['Fee Structures', 'Payments', 'Arrears', 'Digital Receipts', 'Feeding / Canteen Charges'].map((f) => (
              <li key={f} className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />{f}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

const PORTAL_ROLES = [
  { role: 'Students', icon: '🎓', has: 'Managed by admins & teachers' },
  { role: 'Teachers', icon: '🧑‍🏫', has: 'Managed by admins' },
  { role: 'Parents', icon: '👪', has: 'Own portal access' },
  { role: 'Students (Portal)', icon: '📱', has: 'Own portal access' },
];

function PeopleSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="03 — People & Portals" title="Every person in the school, one system." align="left" className="mx-0 items-start text-left" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PORTAL_ROLES.map((p, i) => (
          <Reveal key={p.role} delay={i * 80} className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
            <span className="text-3xl" role="img" aria-hidden="true">{p.icon}</span>
            <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{p.role}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{p.has}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CommunicationSection() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-900 dark:bg-gray-900/40">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <SectionHeading eyebrow="04 — Communication" title="Targeted messages, with a paper trail." />
        <Reveal delay={120} className="mx-auto mt-10 max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Announcement</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">To: Basic 5A Parents</p>
          <p className="mt-1 text-sm italic text-gray-500 dark:text-gray-500">&quot;Term 2 closes Friday 12th December...&quot;</p>
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Logged to audit trail
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const DOCS = ['Report Cards', 'QR Verification', 'WAEC Export', 'Student ID Cards'];

function DocumentsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="05 — Documents" title="Documents anyone can verify." />
      <div className="mx-auto mt-12 flex max-w-2xl flex-wrap justify-center gap-3">
        {DOCS.map((d, i) => (
          <Reveal key={d} delay={i * 70} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-cyan-50 text-[9px] font-bold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400">QR</span>
            {d}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default function Features() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 pb-4 pt-16 text-center sm:px-6 sm:pt-20">
        <Reveal as="h1" className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Everything your school needs. One connected system.
        </Reveal>
      </section>
      <AcademicSection />
      <FinancialSection />
      <PeopleSection />
      <CommunicationSection />
      <DocumentsSection />
    </div>
  );
}
