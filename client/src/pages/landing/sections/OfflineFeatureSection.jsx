import Reveal from '../../../components/landing/Reveal';

// The real mechanism (offlineStore.js's localStorage write-queue,
// ResultsEntry.jsx's registerFlushHandler, the RESULT_LOCKED conflict
// code from results.controller.js's recordBulk) — not a generic offline
// explainer. Authoritative actions stay online-only, called out explicitly
// per the brief's own instruction not to overstate what offline mode covers.
const OFFLINE_STEPS = [
  'Online', 'Teacher enters scores', 'Connection lost', 'Scores queue locally',
  'Connection restored', 'Automatic sync', 'Conflict flagged if already approved',
];

export default function OfflineFeatureSection() {
  return (
    <section id="offline" className="landing-section">
      <Reveal as="h2">No Internet? Keep Recording.</Reveal>
      <Reveal as="p" className="landing-section-subtitle">
        A dropped connection mid-lesson doesn't lose a teacher's work.
      </Reveal>
      <Reveal className="migration-flow">
        {OFFLINE_STEPS.map((step, i) => (
          <span key={step} style={{ display: 'contents' }}>
            <span className="migration-flow-node">{step}</span>
            {i < OFFLINE_STEPS.length - 1 && <span className="migration-flow-arrow" aria-hidden="true">→</span>}
          </span>
        ))}
      </Reveal>
      <Reveal as="p" className="landing-section-subtitle" style={{ marginTop: 0 }}>
        Scores entered offline are queued in the browser and replayed automatically once the connection returns.
        If that subject's results were already approved while the teacher was offline, the sync is stopped and
        flagged for an admin rather than silently overwriting an approved record. Authoritative actions —
        approving, locking, and publishing a report card — always require a live connection.
      </Reveal>
    </section>
  );
}
