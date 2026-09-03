import { useState } from 'react';

// Mirrors AnnouncementComposer.jsx's real targetType shape. Local state only —
// "Stage Announcement" never calls any API; it only flips a staged/sent-look
// UI state so a visitor can see the full flow without anything leaving the browser.
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
    <div className="demo-announce panel">
      <h4 style={{ marginTop: 0 }}>Compose an Announcement</h4>
      <div className="demo-marksheet-controls">
        <label htmlFor="demo-announce-audience">Audience</label>
        <select
          id="demo-announce-audience" value={audience}
          onChange={(e) => { setAudience(e.target.value); setStaged(false); }}
        >
          {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <textarea
        rows={3} value={message} style={{ width: '100%', marginTop: 10 }}
        onChange={(e) => { setMessage(e.target.value); setStaged(false); }}
      />
      <div className="demo-announce-actions">
        <button type="button" className="btn-primary" onClick={() => setStaged(true)}>Stage Announcement</button>
        {staged && <span className="badge badge-success">Ready to send — would reach {active.count} recipient(s)</span>}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        This is a preview only. No message is sent from the demo — the real app delivers in-app always, and by
        email once a school has configured a provider.
      </p>
    </div>
  );
}
