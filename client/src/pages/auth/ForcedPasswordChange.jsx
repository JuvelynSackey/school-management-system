import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';

// Shown instead of the normal app shell whenever the logged-in account still
// has mustChangePassword set — e.g. right after a Super-Admin bootstraps a
// School Admin with a generated temp password. ProtectedRoute redirects
// here for every route until this succeeds.
export default function ForcedPasswordChange() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await changePassword({ currentPassword, newPassword });
      setUser((u) => ({ ...u, mustChangePassword: false }));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="panel" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Set a New Password</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Welcome{user?.fullName ? `, ${user.fullName}` : ''}. For security, you need to set your own password before continuing.
        </p>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}
          <label className="field">
            <span>Temporary Password</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>New Password</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </label>
          <label className="field">
            <span>Confirm New Password</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
          </label>
          <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: '100%', marginTop: 8 }}>
            {isSaving ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
