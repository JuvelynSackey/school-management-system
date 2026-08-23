import { useState } from 'react';
import { useSuperAdminAuth } from './SuperAdminAuthContext';
import { changePassword } from './api';

export default function MyAccount() {
  const { superAdmin } = useSuperAdminAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess('Password changed.');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>My Account</h1>
      </div>

      <div className="panel" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Profile</h3>
        <label className="field">
          <span>Email</span>
          <input value={superAdmin?.email || ''} disabled />
        </label>
        <label className="field">
          <span>Full Name</span>
          <input value={superAdmin?.fullName || ''} disabled />
        </label>
      </div>

      <div className="panel" style={{ maxWidth: 480 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Change Password</h3>
        <form onSubmit={handleSubmit}>
          {passwordError && <div className="alert-error">{passwordError}</div>}
          {passwordSuccess && <p className="muted" style={{ fontSize: 13 }}>{passwordSuccess}</p>}
          <label className="field">
            <span>Current Password</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label className="field">
            <span>New Password</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </label>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Change Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
