import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function SchoolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M5 10.5V16c0 1.5 3 3 7 3s7-1.5 7-3v-5.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3 6.5l9 6.5 9-6.5" />
    </svg>
  );
}

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

// Shared by the dedicated /login page and LoginModal (opened from the
// landing page) — same fields/behavior, the host decides what happens
// after a successful login via onSuccess.
export default function LoginForm({ onSuccess, defaultSchoolCode = '' }) {
  const { login } = useAuth();
  const [schoolCode, setSchoolCode] = useState(defaultSchoolCode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(schoolCode, identifier, password, remember);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Welcome Back 👋</h1>
      <p className="cosmic-subtitle">Sign in to continue to your dashboard</p>

      {error && <div className="alert-error">{error}</div>}

      <label className="cosmic-field cosmic-field--icon-left">
        <input
          type="text"
          placeholder="School Code"
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value)}
          required
          autoFocus={!defaultSchoolCode}
          disabled={isSubmitting}
        />
        <span className="cosmic-field-badge cosmic-field-badge--left"><SchoolIcon /></span>
      </label>

      <label className="cosmic-field cosmic-field--icon-left">
        <input
          type="text"
          placeholder="Email or Phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoFocus={Boolean(defaultSchoolCode)}
          disabled={isSubmitting}
        />
        <span className="cosmic-field-badge cosmic-field-badge--left"><MailIcon /></span>
      </label>

      <label className="cosmic-field cosmic-field--icon-right">
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isSubmitting}
        />
        <button
          type="button"
          className="cosmic-field-badge cosmic-field-badge--right"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={showPassword} />
        </button>
      </label>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="cosmic-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Remember Me</span>
        </label>
        <Link to={`/forgot-password${schoolCode ? `?school=${encodeURIComponent(schoolCode)}` : ''}`} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5 }}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" className="cosmic-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'LOGIN'}
      </button>
    </form>
  );
}
