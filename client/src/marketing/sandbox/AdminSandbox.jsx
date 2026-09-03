import { useState } from 'react';
import DemoMarksheet from './DemoMarksheet';
import DemoAnnouncementComposer from './DemoAnnouncementComposer';
import { DEMO_ADMIN_STATS } from './demoData';

const formatCedis = (n) => `GH₵ ${Number(n).toLocaleString('en-GH')}`;

const STATS = [
  { label: 'Students', value: DEMO_ADMIN_STATS.students },
  { label: 'Attendance Today', value: `${DEMO_ADMIN_STATS.attendanceRate}%` },
  { label: 'Fees Collected', value: formatCedis(DEMO_ADMIN_STATS.feesCollected) },
  { label: 'Fees Outstanding', value: formatCedis(DEMO_ADMIN_STATS.feesOutstanding) },
];

const TOOLS = [
  { value: 'results', label: 'Enter Results' },
  { value: 'announce', label: 'Send Announcement' },
];

export default function AdminSandbox() {
  const [tool, setTool] = useState('results');

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Good morning, Admin</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Legend International School &middot; Term 2, 2025/2026</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.value} type="button" onClick={() => setTool(t.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tool === t.value ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tool === 'results' && <DemoMarksheet />}
        {tool === 'announce' && <DemoAnnouncementComposer />}
      </div>
    </div>
  );
}
