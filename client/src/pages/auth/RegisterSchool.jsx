import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerSchool } from '../../api/schools.api';

// Same icon/behavior as LoginForm.jsx's password toggle — duplicated
// rather than shared since every auth-page icon in this app is a small
// local component (SchoolIcon/MailIcon there, this one here), not a
// shared icon library.
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.7A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.6 15.6 0 0 1-3.3 4.1M7 6.8C4.3 8.5 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.3 0 2.5-.3 3.5-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const emptyForm = {
  schoolName: '', slug: '', adminFullName: '', adminEmail: '', adminPhone: '', password: '',
};

export default function RegisterSchool() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleNameChange = (schoolName) => setForm((f) => ({ ...f, schoolName, slug: slugify(schoolName) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await registerSchool(form);
      setSubmitted(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cosmic-auth-page">
      <div className="cosmic-orb cosmic-orb-purple" />
      <div className="cosmic-orb cosmic-orb-blue" />
      <div className="cosmic-orb cosmic-orb-orange" />

      <div className="cosmic-card" style={{ maxWidth: 440 }}>
        {submitted ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Registration Submitted</h2>
            <p>
              <strong>{submitted.name}</strong> (login code <code>{submitted.slug}</code>) is now
              awaiting review by a JesManage platform administrator. You&apos;ll be able to log in
              once it&apos;s approved.
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              We also sent a verification email to your admin address — you can verify it any time
              before or after approval.
            </p>
            <Link className="btn-primary" to="/login" style={{ display: 'inline-block', textAlign: 'center', marginTop: 8 }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ marginTop: 0 }}>Register Your School</h2>
            {error && <div className="alert-error">{error}</div>}
            <label className="field">
              <span>School Name</span>
              <input value={form.schoolName} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Kings Prep Academy" required />
            </label>
            <label className="field">
              <span>Login Code</span>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. kings-prep" required autoComplete="off" />
            </label>
            <label className="field">
              <span>Your Full Name</span>
              <input value={form.adminFullName} onChange={(e) => setForm({ ...form, adminFullName: e.target.value })} required />
            </label>
            <label className="field">
              <span>Your Email</span>
              <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
            </label>
            <label className="field">
              <span>Phone (optional)</span>
              <input value={form.adminPhone} onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} />
            </label>
            <label className="field">
              <span>Password</span>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', display: 'flex',
                  }}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </label>
            <p className="muted" style={{ fontSize: 13 }}>
              A platform administrator reviews every new school before it can log in — this usually
              takes a short while, not instantly.
            </p>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? 'Submitting...' : 'Register School'}
            </button>
            <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 12 }}>
              Already registered? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
