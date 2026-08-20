import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth.api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const schoolCode = searchParams.get('schoolCode') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(schoolCode, token, newPassword);
      navigate('/login', { state: { passwordResetSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!schoolCode || !token) {
    return (
      <div className="cosmic-auth-page">
        <div className="cosmic-orb cosmic-orb-purple" />
        <div className="cosmic-orb cosmic-orb-blue" />
        <div className="cosmic-card">
          <h1>Invalid Link</h1>
          <p className="cosmic-subtitle" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>
            This reset link is missing information. Please request a new one.
          </p>
          <Link to="/forgot-password" className="cosmic-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cosmic-auth-page">
      <div className="cosmic-orb cosmic-orb-purple" />
      <div className="cosmic-orb cosmic-orb-blue" />

      <div className="cosmic-card">
        <form onSubmit={handleSubmit}>
          <h1>Reset Password</h1>
          <p className="cosmic-subtitle">Choose a new password for your account</p>

          {error && <div className="alert-error">{error}</div>}

          <label className="cosmic-field">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>

          <label className="cosmic-field">
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>

          <button type="submit" className="cosmic-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
