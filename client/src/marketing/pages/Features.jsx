import Card from '../components/Card';

const iconProps = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const FEATURES = [
  {
    title: 'NaCCA-Aligned Grading',
    description: 'Class Score (/50) + Exam Score (/50) = Total (/100) — the assessment structure Ghanaian basic schools already grade by.',
    icon: (
      <svg {...iconProps}><path d="M9 4v16M15 4v16M5 9.5h14M5 14.5h14" /></svg>
    ),
  },
  {
    title: 'QR-Verified Documents',
    description: 'Every report card carries a QR code anyone can scan to confirm it is genuine and hasn\'t been altered.',
    icon: (
      <svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM19 14v3M14 19h3v2h-3z" /></svg>
    ),
  },
  {
    title: 'Digital Fee Receipts',
    description: 'Fee structures, balances, and payments tracked in GH₵ throughout, with a printable receipt for every payment.',
    icon: (
      <svg {...iconProps}><path d="M9 4v16M15 4v16M5 9.5h14M5 14.5h14" /></svg>
    ),
  },
  {
    title: 'Attendance Tracking',
    description: 'Teachers record daily attendance per class, feeding straight into each student\'s term report.',
    icon: (
      <svg {...iconProps}><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 2.5v4M16 2.5v4" /><path d="M8.5 14.5l2 2 4-4.5" /></svg>
    ),
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-gray-900">Everything Your School Needs</h1>
        <p className="mt-3 text-gray-600">Built around how Ghanaian private schools actually run day to day.</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Card key={f.title} icon={f.icon} title={f.title} description={f.description} />
        ))}
      </div>
    </section>
  );
}
