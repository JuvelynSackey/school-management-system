import { useState } from 'react';

// Mirrors AnnouncementComposer.jsx's real targetType shape. Local state
// only — "Stage Announcement" never calls any API.
const AUDIENCES = [
  { value: 'school', label: 'Whole School', count: 612 },
  { value: 'class', label: 'A Specific Class', count: 32 },
  { value: 'all_teachers', label: 'All Teachers', count: 24 },
  { value: 'all_parents', label: 'All Parents', count: 540 },
];

export default function DemoAnnouncementComposer() {
  const [audience, setAudience] = useState('school');
  const [message, setMessage] = useState('Reminder: Term 2 closes Friday 12th December. Please ensure all outstanding fees are settled before the final week.');
  const [staged, setStaged] = useState(false);
  const active = AUDIENCES.find((a) => a.value === audience);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h4 className="font-semibold text-gray-900 dark:text-white">Compose an Announcement</h4>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="demo-announce-audience" className="text-xs font-semibold text-gray-500 dark:text-gray-400">Audience</label>
        <select
          id="demo-announce-audience" value={audience}
          onChange={(e) => { setAudience(e.target.value); setStaged(false); }}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <textarea
        rows={3} value={message}
        onChange={(e) => { setMessage(e.target.value); setStaged(false); }}
        className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button" onClick={() => setStaged(true)}
          className="rounded-full bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-800"
        >
          Stage Announcement
        </button>
        {staged && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            Ready to send — would reach {active.count} recipient(s)
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-400">
        This is a preview only. No message is sent from the demo — the real app delivers in-app always, and by
        email once a school has configured a provider.
      </p>
    </div>
  );
}
