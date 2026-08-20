import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { forgotPassword } from '../../api/auth.api';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [schoolCode, setSchoolCode] = useState(searchParams.get('school') || '');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await forgotPassword(schoolCode, identifier);
      setMessage(result.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cosmic-auth-page">
      <div className="cosmic-orb cosmic-orb-purple" />
      <div className="cosmic-orb cosmic-orb-blue" />

      <div className="cosmic-card">
        {message ? (
          <>
            <h1>Check Your Email</h1>
            <p className="cosmic-subtitle" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>{message}</p>
            <Link to="/login" className="cosmic-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to Login</Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1>Forgot Password?</h1>
            <p className="cosmic-subtitle">Enter your school code and email or phone to get a reset link</p>

            {error && <div className="alert-error">{error}</div>}

            <label className="cosmic-field">
              <input
                type="text"
                placeholder="School Code"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="cosmic-field">
              <input
                type="text"
                placeholder="Email or Phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </label>

            <button type="submit" className="cosmic-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
