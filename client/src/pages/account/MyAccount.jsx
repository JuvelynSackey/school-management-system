import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateMe, changePassword } from '../../api/auth.api';

export default function MyAccount() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const updated = await updateMe({ fullName, phone: phone || null });
      setUser((u) => ({ ...u, ...updated }));
      setProfileSuccess('Saved.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSavingPassword(true);
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
      setIsSavingPassword(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>My Account</h1>
      </div>

      <div className="panel" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Profile</h3>
        <form onSubmit={handleProfileSubmit}>
          {profileError && <div className="alert-error">{profileError}</div>}
          {profileSuccess && <p className="muted" style={{ fontSize: 13 }}>{profileSuccess}</p>}
          <label className="field">
            <span>
              Email
              {user?.role === 'admin' && (
                user?.emailVerified
                  ? <span className="badge badge-success" style={{ marginLeft: 8, fontSize: 11 }}>Verified</span>
                  : <span className="badge badge-warning" style={{ marginLeft: 8, fontSize: 11 }}>Not verified</span>
              )}
            </span>
            <input value={user?.email || ''} disabled />
          </label>
          <label className="field">
            <span>Full Name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Add a phone number to log in with it"
            />
          </label>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="btn-primary" disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ maxWidth: 480 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Change Password</h3>
        <form onSubmit={handlePasswordSubmit}>
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
            <button type="submit" className="btn-primary" disabled={isSavingPassword}>{isSavingPassword ? 'Saving...' : 'Change Password'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
