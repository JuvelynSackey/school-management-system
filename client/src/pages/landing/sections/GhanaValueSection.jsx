import Reveal from '../../../components/landing/Reveal';
import TiltCard from '../../../components/landing/TiltCard';

const ICONS = {
  cedi: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4v16M15 4v16M5 9.5h14M5 14.5h14" />
    </svg>
  ),
  split: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="8" height="14" rx="1.5" />
      <rect x="13" y="5" width="8" height="14" rx="1.5" />
      <path d="M7 9.5v5M17 9.5v5" />
    </svg>
  ),
  ladder: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V3M18 21V3M6 6h12M6 11h12M6 16h12" />
    </svg>
  ),
  offline: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8.5a16 16 0 0 1 6.3-3.4M15.7 5.1A16 16 0 0 1 22 8.5M5.5 12.5a11 11 0 0 1 4-2.3M14.5 10.2a11 11 0 0 1 4 2.3M9 16.3a5.5 5.5 0 0 1 6 0" />
      <circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M2.5 2.5l19 19" />
    </svg>
  ),
  printer: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6" />
      <rect x="3" y="9" width="18" height="8" rx="1.5" />
      <path d="M6 14h12v7H6z" />
    </svg>
  ),
  portals: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M14.5 14.2c2.6.4 4.5 2.7 4.5 5.3" />
    </svg>
  ),
  isolation: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l7 3v5.5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6.5l7-3Z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  ),
};

// Every claim here is a real, already-shipped feature — no regulatory
// claims, no "NaCCA-approved" language (this app follows the 50/50
// structure NaCCA schools already use; it isn't itself certified by
// anyone), matching the brief's own instruction to avoid unverifiable claims.
const GHANA_VALUES = [
  { icon: 'cedi', title: 'Fees in GH₵', desc: 'Fee structures, balances, and receipts are tracked in Ghana cedis throughout — no currency conversion, ever.' },
  { icon: 'split', title: '50/50 Assessment', desc: 'Class Score (/50) + Exam Score (/50) = Total (/100), the structure Ghanaian basic schools already grade by — configurable per school, decomposable into sub-assessments if a school wants that detail.' },
  { icon: 'ladder', title: 'Creche to JHS 3', desc: "Classes follow the real basic-education ladder — Creche, Nursery, KG, Basic 1-6, JHS 1-3 — not a generic freeform list." },
  { icon: 'offline', title: 'Offline Score Entry', desc: 'A dropped connection at a rural school is normal, not a blocker — scores queue locally and sync once back online.' },
  { icon: 'printer', title: 'Printable Reports', desc: 'Every report card and receipt is built for the printer schools actually have, with a QR code confirming it\'s genuine.' },
  { icon: 'portals', title: 'Parent & Student Portals', desc: 'Guardians and students see their own approved results, attendance, and fee balance — nothing more.' },
  { icon: 'isolation', title: 'School-Level Isolation', desc: 'Every school\'s data is scoped at the database query layer — one platform, many schools, never a mixed record.' },
];

export default function GhanaValueSection() {
  return (
    <section id="ghana" className="landing-section">
      <Reveal as="h2">Built for the Way Schools Operate in Ghana</Reveal>
      <Reveal as="p" className="landing-section-subtitle">
        Not a generic school platform with a currency symbol swapped in.
      </Reveal>
      <div className="landing-feature-grid">
        {GHANA_VALUES.map((v, i) => (
          <Reveal key={v.title} delay={i * 60}>
            <TiltCard className="landing-feature-card">
              <span className="quick-action-icon landing-feature-icon">{ICONS[v.icon]}</span>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
