import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminAuth } from './SuperAdminAuthContext';

export default function SuperAdminLogin() {
  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/super-admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cosmic-auth-page">
      <div className="cosmic-orb cosmic-orb-purple" />
      <div className="cosmic-orb cosmic-orb-blue" />

      <div className="cosmic-card">
        <form onSubmit={handleSubmit}>
          <h1>Platform Admin</h1>
          <p className="cosmic-subtitle">Sign in to manage schools on JesManage</p>

          {error && <div className="alert-error">{error}</div>}

          <label className="cosmic-field">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={isSubmitting}
            />
          </label>

          <label className="cosmic-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>

          <button type="submit" className="cosmic-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  );
}
