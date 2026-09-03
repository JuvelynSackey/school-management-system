import Button from '../components/Button';

const HIGHLIGHTS = [
  { title: 'Fees in GH₵', desc: 'Fee structures, balances, and receipts tracked in Ghana cedis throughout — no currency conversion.' },
  { title: 'NaCCA-Aligned Grading', desc: 'Class Score (/50) + Exam Score (/50) — the assessment structure Ghanaian basic schools already use.' },
  { title: 'QR-Verified Documents', desc: 'Report cards carry a QR code anyone can scan to confirm they are genuine.' },
  { title: 'Strict Tenant Isolation', desc: 'Every school\'s data is scoped at the database query layer — one platform, many schools, never a mixed record.' },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Run Your School Smarter with <span className="text-indigo-700">JesManage.</span>
        </h1>
        <p className="max-w-2xl text-lg text-gray-600">
          Attendance, NaCCA-aligned results, fees, and parent communication — one platform built
          for Ghanaian private schools, from Creche to JHS 3.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button variant="primary" to="/demo">Explore Demo</Button>
          <Button variant="secondary" to="/register-school">Register Your School</Button>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">{h.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{h.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
