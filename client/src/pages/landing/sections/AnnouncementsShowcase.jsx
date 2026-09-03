import { useState } from 'react';
import Reveal from '../../../components/landing/Reveal';
import TiltCard from '../../../components/landing/TiltCard';

// Mirrors AnnouncementComposer.jsx's real targetType options exactly — this is
// a static preview, not wired to the announcements API, and never sends anything.
const AUDIENCES = [
  { value: 'school', label: 'Whole School', count: 612 },
  { value: 'class', label: 'A Specific Class', count: 32 },
  { value: 'all_teachers', label: 'All Teachers', count: 24 },
  { value: 'all_parents', label: 'All Parents', count: 540 },
];

export default function AnnouncementsShowcase() {
  const [audience, setAudience] = useState('school');
  const active = AUDIENCES.find((a) => a.value === audience);

  return (
    <section id="announcements" className="landing-section">
      <Reveal as="h2">Reach the Right People, Not Everyone</Reveal>
      <Reveal as="p" className="landing-section-subtitle">
        Target the whole school, one class, or a single guardian — delivered in-app always,
        by email when a school has configured it. Try the audience selector below.
      </Reveal>
      <Reveal>
        <TiltCard className="announce-showcase-card">
          <div className="announce-showcase-field">
            <label htmlFor="announce-audience">Audience</label>
            <select id="announce-audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="announce-showcase-field">
            <label htmlFor="announce-message">Message</label>
            <textarea id="announce-message" rows={3} readOnly value="Reminder: Term 2 closes Friday 12th December. Please ensure all outstanding fees are settled before the final week." />
          </div>
          <div className="announce-showcase-preview">
            <span>Preview only — nothing is sent from this page.</span>
            <strong>Would reach {active.count} recipient(s) via in-app notification</strong>
          </div>
        </TiltCard>
      </Reveal>
    </section>
  );
}
