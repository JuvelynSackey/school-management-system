import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Reveal from '../../components/landing/Reveal';
import TiltCard from '../../components/landing/TiltCard';
import LoginModal from '../../components/auth/LoginModal';
import ScrollToTopButton from '../../components/common/ScrollToTopButton';

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
    tagline: 'Everything under control — including the fees.',
    points: [
      'Full oversight of every class, pupil, and fee structure',
      'Review, approve, and publish report cards',
      'Toggle showPositions to include or hide class rankings, per report card run',
      'Manage students, teachers, classes, subjects, and fee collection',
    ],
  },
  {
    title: 'Teachers',
    tagline: 'Spend less time on paperwork.',
    points: [
      'Record attendance for assigned classes only',
      'Enter Class Score (/50) + Exam Score (/50) — auto-totaled to /100 with the grade computed for you',
      'Submit each subject for admin review',
    ],
  },
  {
    title: 'Students',
    tagline: 'Your academic information in one place.',
    points: [
      'View approved results, once released',
      'Download published, QR-verified report cards',
      'JHS 3 (BECE) records are locked as terminal — no accidental promotion past Basic 9',
    ],
  },
  {
    title: 'Parents',
    tagline: "Stay informed about your child's progress.",
    points: [
      'Portal account auto-provisioned at admission, with a private 4-digit PIN',
      'One login links every child you have at the school',
      "View each child's approved results, attendance, and fee balance",
    ],
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

const PROBLEM_POINTS = [
  {
    title: 'Paper Overload',
    desc: 'Attendance registers, mark sheets, and fee ledgers scattered across notebooks and spreadsheets that only one person can update at a time.',
  },
  {
    title: 'Data Without Insight',
    desc: 'Scores get recorded, but turning a term of results into positions, grades, and a locked report card still means hours of manual computation.',
  },
  {
    title: 'Parent Visibility Gaps',
    desc: 'Parents find out about a fee balance or a falling grade only when they physically visit the school — or not at all.',
  },
];

// Real endpoints/files, not illustrative — /api/migration/* and
// migrationFieldAliases.js are the actual bulk-import pipeline this
// section describes.
const MIGRATION_FEATURES = [
  {
    title: 'Bulk CSV Import Pipeline',
    desc: 'Upload a legacy student or score export as CSV. Every row is processed independently and reported back with its own row number — success or a specific reason it failed — nothing silently dropped.',
    code: '/api/migration/*',
  },
  {
    title: 'Legacy Header Aliasing',
    desc: 'migrationFieldAliases.js maps whatever a school\'s old system called a column — "DOB", "Parent Phone", "Class Enrolled" — onto the fields JesManage actually expects, so exports don\'t need to be hand-edited first.',
    code: 'migrationFieldAliases.js',
  },
  {
    title: 'Historical Score Ingestion',
    desc: 'Imported results are tagged isMigrated: true, missing AcademicTerm rows are auto-provisioned, and an already-Approved ResultSheet is created for each — a historical score is final on arrival, not stuck awaiting review.',
    code: 'isMigrated: true',
  },
  {
    title: 'Ghana-Aware Data Cleansing',
    desc: 'Guardian phone numbers are normalized from +233 or 233-prefixed formats to a local 0-prefixed number, and a "hometown / region" string is fuzzy-matched against Ghana\'s 16 official administrative regions.',
    code: 'migrationCleansing.service.js',
  },
];

// The real dispatch path a question takes through server/src — not a
// simplified diagram. Every stage names the file that actually does it.
const PIPELINE_STEPS = [
  {
    title: 'Natural-Language Query',
    desc: 'A user types a plain-English question in the "Ask JesManage" panel — e.g. "How much do I owe in fees?"',
    code: 'AskJesManage.jsx',
  },
  {
    title: 'Intent Classifier',
    desc: 'The question is matched against a fixed, per-role list of supported intents — never translated into an arbitrary database query.',
    code: 'ai.service.js',
  },
  {
    title: 'Permission Guard',
    desc: "The classified intent is checked against the caller's role. A mismatch is a hard refusal — the request never reaches a data query.",
    code: 'assistantIntents.config.js',
  },
  {
    title: 'Pre-Approved Service Router',
    desc: 'Only one specific, already-tested function runs — e.g. a parent\'s fee question always resolves through their own linked children, never a request parameter.',
    code: 'aiQuery.service.js',
  },
  {
    title: 'Prose Synthesizer',
    desc: 'Query results are built as plain, hand-selected fields — no _id, password hash, or schoolId ever enters this step — then turned into a natural-language answer.',
    code: 'summarizeQueryResult()',
  },
];

// server/src/models/*.model.js — every one with a schoolId field is
// auto-scoped by tenantScopePlugin at the query layer, not by convention.
const ARCHITECTURE_GRID = [
  {
    value: 'schoolId',
    title: 'Strict Multi-Tenant Isolation',
    desc: 'Every one of 26 tenant-scoped models is auto-filtered by schoolId at the query layer — a stray query literally cannot reach another school\'s data.',
  },
  {
    value: 'AsyncLocalStorage',
    title: 'Context-Preserving Middleware',
    desc: 'tenantContext.js threads the active schoolId through every async operation — including bulk uploads and background jobs — with nothing to manually pass through.',
  },
  {
    value: 'AuditLog',
    title: 'Comprehensive Audit Trail',
    desc: 'Approvals, migrations, AI queries, and other sensitive actions are written to a per-school audit log, queryable by admins for accountability.',
  },
  {
    value: '323/323',
    title: 'Automated Test Verification',
    desc: 'Unit and integration coverage across every tenant boundary, role permission, and grading rule — re-run before every release.',
  },
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
          <button type="button" onClick={() => scrollTo('migration')}>Migration</button>
          <button type="button" onClick={() => scrollTo('roles')}>Roles</button>
          <button type="button" onClick={() => scrollTo('intelligence')}>Intelligence</button>
          <button type="button" onClick={() => scrollTo('architecture')}>Architecture</button>
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
            <span className="landing-badge">Strict Tenant Isolation</span>
            <span className="landing-badge">323/323 Automated Tests Passing</span>
            <span className="landing-badge">Intent-Gated AI Assistant</span>
          </Reveal>
          <Reveal className="landing-strip" delay={440}>
            Students <span>•</span> Teachers <span>•</span> Attendance <span>•</span> Results <span>•</span> Fees <span>•</span> Report Cards <span>•</span> Intelligence
          </Reveal>
        </div>
        <Reveal className="landing-hero-illustration" delay={150}>
          <TiltCard className="landing-dashboard-preview" maxTilt={7}>
            <div className="dp-titlebar">
              <span className="dp-dot" /><span className="dp-dot" /><span className="dp-dot" />
              <span className="dp-titlebar-label">JesManage — Dashboard</span>
            </div>
            <div className="dp-body">
              <div className="dp-nav-sliver">
                <span className="dp-nav-pill is-active" />
                <span className="dp-nav-pill" />
                <span className="dp-nav-pill" />
                <span className="dp-nav-pill" />
              </div>
              <div className="dp-main">
                <div className="dp-stat-row">
                  <div className="dp-stat-tile dp-stat-gold"><span className="dp-stat-num">482</span><span className="dp-stat-label">Students</span></div>
                  <div className="dp-stat-tile dp-stat-cyan"><span className="dp-stat-num">96%</span><span className="dp-stat-label">Attendance</span></div>
                  <div className="dp-stat-tile"><span className="dp-stat-num">GH₵12k</span><span className="dp-stat-label">Fees Collected</span></div>
                </div>
                <div className="dp-chart">
                  <span style={{ height: '40%' }} /><span style={{ height: '65%' }} /><span style={{ height: '52%' }} />
                  <span style={{ height: '80%' }} /><span style={{ height: '70%' }} /><span style={{ height: '90%' }} />
                </div>
                <div className="dp-rows">
                  <span className="dp-row" /><span className="dp-row" style={{ width: '70%' }} /><span className="dp-row" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </header>

      <section id="problem" className="landing-section">
        <Reveal as="h2">Your School Has the Data. JesManage Turns It Into Decisions.</Reveal>
        <div className="landing-problem-grid">
          {PROBLEM_POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 90} className="landing-problem-card">
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="landing-section landing-section-alt">
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

      <section id="migration" className="landing-section">
        <Reveal as="h2">The Legacy Data Migration Engine</Reveal>
        <Reveal as="p" className="landing-section-subtitle">
          Already keeping records in Excel or an old system? Bring them in — a school doesn't
          start from a blank slate.
        </Reveal>
        <Reveal className="migration-endpoint" as="span">/api/migration/*</Reveal>
        <div className="landing-feature-grid">
          {MIGRATION_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <TiltCard className="landing-feature-card">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <code className="landing-code-chip">{f.code}</code>
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
              <TiltCard className="landing-feature-card landing-feature-card--intelligence">
                <span className="quick-action-icon landing-feature-icon">{INTELLIGENCE_ICONS[f.icon]}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </TiltCard>
            </Reveal>
          ))}
          <Reveal delay={INTELLIGENCE_FEATURES.length * 70}>
            <TiltCard className="landing-feature-card landing-feature-card--intelligence">
              <span className="quick-action-icon landing-feature-icon">✓</span>
              <h3>AI assists. Staff decide.</h3>
              <p>A school switches Intelligence on with one setting. Until then, everything works exactly the same — just without the extra insight.</p>
            </TiltCard>
          </Reveal>
        </div>

        <Reveal as="h3" className="landing-subsection-heading">
          Ask JesManage: an Intent-Gated Pipeline, Not an Open Query
        </Reveal>
        <Reveal as="p" className="landing-section-subtitle">
          The model never touches the database. It only ever picks one of a fixed set of
          pre-approved questions — everything else is a hard refusal.
        </Reveal>
        <div className="pipeline-flow">
          {PIPELINE_STEPS.map((step, i) => (
            <Fragment key={step.title}>
              <Reveal delay={i * 90} className="pipeline-step">
                <span className="pipeline-step-num">{i + 1}</span>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
                <code className="landing-code-chip">{step.code}</code>
              </Reveal>
              {i < PIPELINE_STEPS.length - 1 && (
                <span className="pipeline-arrow" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              )}
            </Fragment>
          ))}
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

      <section id="architecture" className="landing-section landing-section-alt">
        <Reveal as="h2">Architectural Integrity &amp; Security</Reveal>
        <Reveal as="p" className="landing-section-subtitle">
          The same tenant boundary a demo relies on is the one every automated test checks, on
          every run.
        </Reveal>
        <div className="landing-arch-grid">
          {ARCHITECTURE_GRID.map((a, i) => (
            <Reveal key={a.title} delay={i * 80} className="landing-arch-card">
              <div className="landing-arch-value">{a.value}</div>
              <h3>{a.title}</h3>
              <p>{a.desc}</p>
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
      <ScrollToTopButton />
    </div>
    </MotionConfig>
  );
}
