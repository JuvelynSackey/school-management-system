import { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerSchool } from '../../api/schools.api';

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const emptyForm = {
  schoolName: '', slug: '', adminFullName: '', adminEmail: '', adminPhone: '', password: '',
};

export default function RegisterSchool() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

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
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="e.g. kings-prep" required />
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
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
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
