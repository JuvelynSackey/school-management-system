import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePageTransition } from '../../context/PageTransitionContext';
import HeroIllustration from '../../components/landing/HeroIllustration';
import Reveal from '../../components/landing/Reveal';

function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3 L22 8 L12 13 L2 8 Z" fill="var(--landing-gold)" />
      <path d="M6 10.5 V16 C6 18 8.5 19.5 12 19.5 C15.5 19.5 18 18 18 16 V10.5" stroke="var(--landing-gold)" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

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
};

const FEATURES = [
  { icon: 'attendance', title: 'Attendance', desc: 'Take daily attendance per class and track patterns over a term.' },
  { icon: 'results', title: 'Results & Report Cards', desc: 'NaCCA-aligned scoring, auto-computed grades and positions, PDF report cards.' },
  { icon: 'fees', title: 'Fees & Payments', desc: 'Assign fee structures, record payments, and issue digital receipts.' },
  { icon: 'announcements', title: 'Announcements', desc: 'Send class or school-wide notices, plus fee reminders that reach parents.' },
  { icon: 'people', title: 'Student & Guardian Records', desc: 'One record per pupil, with linked guardians so siblings share one contact.' },
  { icon: 'classes', title: 'Classes & Subjects', desc: 'Organize classes by stage — Creche through JHS — with subject assignments.' },
];

const ROLES = [
  { title: 'Admins', points: ['Full oversight of every class and pupil', 'Approve and lock terminal reports', 'Track fee collection school-wide'] },
  { title: 'Teachers', points: ['Record attendance for their classes', 'Enter and submit subject scores', 'See their homeroom at a glance'] },
  { title: 'Students & Guardians', points: ['View report cards and positions', 'Check fee balances and receipts', 'Get school and class announcements'] },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { goTo } = usePageTransition();
  const [scrolled, setScrolled] = useState(false);

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
    <div className="landing-page">
      <nav className={`landing-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="landing-nav-brand">
          <LogoMark />
          <span>School Manager</span>
        </div>
        <div className="landing-nav-links">
          <button type="button" onClick={() => scrollTo('home')}>Home</button>
          <button type="button" onClick={() => scrollTo('features')}>Features</button>
          <button type="button" onClick={() => scrollTo('roles')}>Roles</button>
          <button type="button" onClick={() => scrollTo('contact')}>Contact</button>
        </div>
        <button
          type="button"
          className="landing-nav-cta"
          onClick={(e) => (isAuthenticated ? navigate('/dashboard') : goTo('/login', e))}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Login'}
        </button>
      </nav>

      <header id="home" className="landing-hero">
        <div className="landing-hero-text">
          <Reveal as="h1" delay={0}>Run Your Whole School <span>From One Place.</span></Reveal>
          <Reveal as="p" delay={120}>
            School Manager brings attendance, NaCCA-aligned results, fees, and parent
            announcements into one system built for Creche-to-Basic-9 schools.
          </Reveal>
          <Reveal className="landing-hero-ctas" delay={240}>
            <button type="button" className="landing-btn-primary" onClick={(e) => goTo('/login', e)}>Login</button>
            <button type="button" className="landing-btn-secondary" onClick={() => scrollTo('features')}>See Features</button>
          </Reveal>
          <Reveal className="landing-badges" delay={360}>
            <span className="landing-badge">NaCCA-aligned grading</span>
            <span className="landing-badge">Digital fee receipts</span>
            <span className="landing-badge">Parent SMS alerts</span>
          </Reveal>
        </div>
        <Reveal className="landing-hero-illustration landing-reveal-side" delay={150}>
          <HeroIllustration />
        </Reveal>
      </header>

      <section id="features" className="landing-section">
        <Reveal as="h2">Everything You Need to Run Your School</Reveal>
        <div className="landing-feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} className="landing-feature-card" delay={i * 70}>
              <span className="quick-action-icon landing-feature-icon">{FEATURE_ICONS[f.icon]}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="roles" className="landing-section landing-section-alt">
        <Reveal as="h2">Built for Every Role</Reveal>
        <div className="landing-roles-grid">
          {ROLES.map((r, i) => (
            <Reveal key={r.title} className="landing-role-card" delay={i * 90}>
              <h3>{r.title}</h3>
              <ul>
                {r.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="landing-nav-brand">
          <LogoMark />
          <span>School Manager</span>
        </div>
        <p>Built for Ghanaian Creche-to-Basic-9 private schools.</p>
        <button type="button" className="landing-footer-login" onClick={(e) => goTo('/login', e)}>Login</button>
        <p className="landing-copyright">&copy; {new Date().getFullYear()} School Manager.</p>
      </footer>
    </div>
  );
}
