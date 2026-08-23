import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Hero3D from '../../components/landing/Hero3D';
import Reveal from '../../components/landing/Reveal';
import TiltCard from '../../components/landing/TiltCard';
import LoginModal from '../../components/auth/LoginModal';

const FEATURE_ICONS = {
  attendance: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <path d="M8.5 14.5l2 2 4-4.5" />
    </svg>
  ),
  results: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20V13M11 20V7M17 20V11" />
      <path d="M3 20h18" />
    </svg>
  ),
  fees: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  announcements: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4a2 2 0 0 0 2 2h1l3 5V3l-3 5H5a2 2 0 0 0-2 2Z" />
      <path d="M13 8.5a4 4 0 0 1 0 7" />
      <path d="M17 6a8 8 0 0 1 0 12" />
    </svg>
  ),
  people: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M14.5 14.2c2.6.4 4.5 2.7 4.5 5.3" />
    </svg>
  ),
  classes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5c-1.8-1.3-4.3-2-7-2v13c2.7 0 5.2.7 7 2" />
      <path d="M12 6.5c1.8-1.3 4.3-2 7-2v13c-2.7 0-5.2.7-7 2" />
      <path d="M12 6.5v13" />
    </svg>
  ),
  verify: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l7 3v5.5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6.5l7-3Z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  ),
  multiSchool: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="7" height="10.5" rx="1" />
      <rect x="14" y="5" width="7" height="15.5" rx="1" />
      <path d="M6 14h1M6 17h1M17.5 9h1M17.5 12h1M17.5 15h1" />
    </svg>
  ),
};

const FEATURES = [
  { icon: 'attendance', title: 'Attendance', desc: 'Take daily attendance per class and track patterns over a term.' },
  { icon: 'results', title: 'Results & Report Cards', desc: 'NaCCA-aligned scoring, auto-computed grades and positions, PDF report cards.' },
  { icon: 'fees', title: 'Fees & Payments', desc: 'Assign fee structures, record payments, and issue digital receipts.' },
  { icon: 'announcements', title: 'Announcements', desc: 'Send class or school-wide notices, plus fee reminders that reach parents.' },
  { icon: 'people', title: 'Student & Guardian Records', desc: 'One record per pupil, with linked guardians so siblings share one contact.' },
  { icon: 'classes', title: 'Classes & Subjects', desc: 'Organize classes by stage — Creche through JHS — with subject assignments.' },
  { icon: 'verify', title: 'Document Verification', desc: 'Every report card and receipt carries a QR code anyone can scan to confirm it’s genuine.' },
  { icon: 'multiSchool', title: 'Multi-School Ready', desc: 'One platform, many schools — each with its own data, staff, and pupils, fully separated.' },
];

const INTELLIGENCE_ICONS = {
  remark: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l1.8 4.6 4.7.6-3.5 3.3 1 4.6-4-2.4-4 2.4 1-4.6-3.5-3.3 4.7-.6L12 2.5Z" />
    </svg>
  ),
  anomaly: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18l4-8 3 4 3-6 3 4 3-6" />
    </svg>
  ),
  insights: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20V13M11 20V7M17 20V11" /><path d="M3 20h18" />
    </svg>
  ),
  warning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l9.5 16.5H2.5L12 3.5Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  ask: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4a2 2 0 0 0 2 2h1l3 5V3l-3 5H5a2 2 0 0 0-2 2Z" /><path d="M13 8.5a4 4 0 0 1 0 7" />
    </svg>
  ),
};

const INTELLIGENCE_FEATURES = [
  { icon: 'remark', title: 'Remark Assistant', desc: 'Suggests report-card remarks from a student’s own term data — a teacher always reviews, edits, or writes their own.' },
  { icon: 'anomaly', title: 'Anomaly Detection', desc: 'Flags a sharp score drop or a class/exam score mismatch before an admin approves — a nudge to double-check, not a block.' },
  { icon: 'insights', title: 'Performance Insights', desc: 'A plain-language read on a student’s multi-term trend, alongside the numbers already on their profile.' },
  { icon: 'warning', title: 'Early-Warning', desc: 'Surfaces students who may need academic attention — never a diagnosis, never automatic, always a human decision next.' },
  { icon: 'ask', title: 'Ask JesManage', desc: 'Admins ask a school question in plain English and get a straight answer, read-only, from the school’s own real data.' },
];

const ROLES = [
  {
    title: 'Admins',
    tagline: 'Everything under control.',
    points: ['Full oversight of every class and pupil', 'Review, approve, and publish report cards', 'Track fee collection and outstanding balances', 'Manage students, teachers, classes, and subjects'],
  },
  {
    title: 'Teachers',
    tagline: 'Spend less time on paperwork.',
    points: ['Record attendance for assigned classes', 'Enter subject scores with auto-computed grades', 'Submit each subject for admin review'],
  },
  {
    title: 'Students',
    tagline: 'Your academic information in one place.',
    points: ['View approved results, once released', 'Download published report cards', 'Check attendance and school announcements'],
  },
  {
    title: 'Parents',
    tagline: "Stay informed about your child's progress.",
    points: ["View each child's approved results and attendance", 'Download published report cards', 'Check fee balances and payment history'],
  },
];

const HOW_IT_WORKS = [
  { title: 'Register', desc: 'Admins add students, teachers, and classes to the system.' },
  { title: 'Record', desc: 'Teachers take daily attendance and enter subject scores.' },
  { title: 'Submit', desc: "Teachers submit each subject's scores for admin review." },
  { title: 'Approve', desc: 'Admins review and approve — or send scores back with a reason.' },
  { title: 'Generate & Lock', desc: 'Once every subject is approved, report cards are generated and locked.' },
  { title: 'Publish & Download', desc: 'Admins publish finished report cards for parents and students to download.' },
];

const FAQS = [
  {
    q: 'Can teachers change marks after submitting them?',
    a: "No — once a subject's scores are submitted, they're locked until an admin approves them, or sends them back for correction.",
  },
  {
    q: 'Can administrators print all report cards for a class at once?',
    a: "Yes. Once a class's reports are locked, admins can download every pupil's report card as one combined PDF.",
  },
  {
    q: 'Can parents download report cards?',
    a: "Yes — once the school has published them. Not before, and each PDF carries a QR code that verifies it's genuine.",
  },
  {
    q: "Can students or parents see results before they're approved?",
    a: 'No. Students and parents only see a subject\'s scores once an admin has approved them — in-progress scores stay visible to staff only.',
  },
  {
    q: "Can a teacher enter results for a class they're not assigned to?",
    a: 'No — teachers can only record attendance and scores for classes they are assigned to teach.',
  },
  {
    q: 'Does the system track school fees?',
    a: 'Yes. Fees, payments, and outstanding balances are tracked per student and per term, with a digital receipt for every payment.',
  },
];

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="faq-list">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className={`faq-item${isOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="faq-question"
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span className="faq-chevron">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <p className="faq-answer">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <MotionConfig reducedMotion="user">
    <div className="landing-page">
      <nav className={`landing-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="landing-nav-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <div className="landing-nav-links">
          <button type="button" onClick={() => scrollTo('home')}>Home</button>
          <button type="button" onClick={() => scrollTo('features')}>Features</button>
          <button type="button" onClick={() => scrollTo('how-it-works')}>How It Works</button>
          <button type="button" onClick={() => scrollTo('intelligence')}>Intelligence</button>
          <button type="button" onClick={() => scrollTo('roles')}>Roles</button>
          <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
          {!isAuthenticated && <button type="button" onClick={() => navigate('/register-school')}>Register Your School</button>}
        </div>
        <button
          type="button"
          className="landing-nav-cta"
          onClick={() => (isAuthenticated ? navigate('/dashboard') : setLoginOpen(true))}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Login'}
        </button>
      </nav>

      <header id="home" className="landing-hero">
        <div className="landing-hero-text">
          <Reveal as="h1" delay={0}>Run Your Whole School <span>From One Place.</span></Reveal>
          <Reveal as="p" delay={120}>
            JesManage brings attendance, NaCCA-aligned results, fees, and parent
            announcements into one system built for Creche-to-Basic-9 schools.
          </Reveal>
          <Reveal className="landing-hero-ctas" delay={240}>
            <button type="button" className="landing-btn-primary" onClick={() => setLoginOpen(true)}>Login</button>
            <button type="button" className="landing-btn-secondary" onClick={() => navigate('/register-school')}>Register Your School</button>
            <button type="button" className="landing-btn-secondary" onClick={() => scrollTo('features')}>See Features</button>
          </Reveal>
          <Reveal className="landing-badges" delay={360}>
            <span className="landing-badge">NaCCA-aligned grading</span>
            <span className="landing-badge">Digital fee receipts</span>
            <span className="landing-badge">QR-verified documents</span>
          </Reveal>
          <Reveal className="landing-strip" delay={440}>
            Students <span>•</span> Teachers <span>•</span> Attendance <span>•</span> Results <span>•</span> Fees <span>•</span> Report Cards <span>•</span> Intelligence
          </Reveal>
        </div>
        <Reveal className="landing-hero-illustration" delay={150}>
          <div className="landing-hero-3d">
            <Hero3D />
          </div>
        </Reveal>
      </header>

      <section id="features" className="landing-section">
        <Reveal as="h2">Everything You Need to Run Your School</Reveal>
        <div className="landing-feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <TiltCard className="landing-feature-card">
                <span className="quick-action-icon landing-feature-icon">{FEATURE_ICONS[f.icon]}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="landing-section landing-section-alt">
        <Reveal as="h2">How It Works</Reveal>
        <Reveal as="p" className="landing-section-subtitle">
          From admission to a published report card — the real workflow behind every result.
        </Reveal>
        <div className="how-it-works-grid">
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.title} className="how-step" delay={i * 80}>
              <span className="how-step-number">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="intelligence" className="landing-section">
        <Reveal as="h2">Meet JesManage Intelligence</Reveal>
        <Reveal as="p" className="landing-section-subtitle">
          Turn the results, attendance, and fee data a school already has into a second opinion —
          never a decision. Every suggestion is reviewed, edited, or dismissed by a real person before it counts.
        </Reveal>
        <div className="landing-feature-grid">
          {INTELLIGENCE_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <TiltCard className="landing-feature-card">
                <span className="quick-action-icon landing-feature-icon">{INTELLIGENCE_ICONS[f.icon]}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </TiltCard>
            </Reveal>
          ))}
          <Reveal delay={INTELLIGENCE_FEATURES.length * 70}>
            <TiltCard className="landing-feature-card">
              <span className="quick-action-icon landing-feature-icon">✓</span>
              <h3>AI assists. Staff decide.</h3>
              <p>A school switches Intelligence on with one setting. Until then, everything works exactly the same — just without the extra insight.</p>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      <section id="roles" className="landing-section landing-section-alt">
        <Reveal as="h2">Built for Every Role</Reveal>
        <div className="landing-roles-grid">
          {ROLES.map((r, i) => (
            <Reveal key={r.title} delay={i * 90}>
              <TiltCard className="landing-role-card" maxTilt={6}>
                <h3>{r.title}</h3>
                <p className="landing-role-tagline">{r.tagline}</p>
                <ul>
                  {r.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="landing-section">
        <Reveal as="h2">Frequently Asked Questions</Reveal>
        <Reveal className="faq-wrap">
          <FaqAccordion />
        </Reveal>
      </section>

      <section className="landing-final-cta">
        <Reveal as="h2">Ready to simplify school management?</Reveal>
        <Reveal as="p">Manage students, teachers, attendance, results, fees, and report cards from one platform.</Reveal>
        <Reveal className="landing-hero-ctas">
          <button type="button" className="landing-btn-primary" onClick={() => setLoginOpen(true)}>Login</button>
        </Reveal>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="landing-nav-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <p>Built for Ghanaian Creche-to-Basic-9 private schools.</p>
        <button type="button" className="landing-footer-login" onClick={() => setLoginOpen(true)}>Login</button>
        <p className="landing-copyright">&copy; {new Date().getFullYear()} JesManage.</p>
      </footer>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => navigate('/dashboard')}
      />
    </div>
    </MotionConfig>
  );
}
