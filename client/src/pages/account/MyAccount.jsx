import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateMe, changePassword } from '../../api/auth.api';
import { getDashboard } from '../../api/dashboard.api';

export default function MyAccount() {
  const { user, setUser } = useAuth();
  const [teachingResponsibilities, setTeachingResponsibilities] = useState(null);

  useEffect(() => {
    if (user?.role !== 'teacher') return;
    getDashboard().then((data) => setTeachingResponsibilities(data.teachingResponsibilities || [])).catch(() => setTeachingResponsibilities([]));
  }, [user?.role]);

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

      {user?.role === 'teacher' && (
        <div className="panel" style={{ maxWidth: 480, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>Staff Details</h3>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            Set by your school&apos;s admin — contact them to update these.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
            <div><strong>Staff Number:</strong> {user.staffNo || '—'}</div>
            <div><strong>Staff Phone:</strong> {user.staffPhone || user.phone || '—'}</div>
            <div><strong>Qualification:</strong> {user.qualification || '—'}</div>
            <div><strong>Gender:</strong> {user.gender || '—'}</div>
          </div>
        </div>
      )}

      {user?.role === 'teacher' && (
        <div className="panel" style={{ maxWidth: 480, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 12px' }}>My Teaching Responsibilities</h3>
          {teachingResponsibilities === null && <p className="muted" style={{ fontSize: 13 }}>Loading...</p>}
          {teachingResponsibilities?.length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>No class or subject assignments yet — ask an admin to assign you one.</p>
          )}
          {teachingResponsibilities?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {teachingResponsibilities.map((r) => (
                <div key={r.classId}>
                  <div style={{ fontSize: 13.5 }}>
                    {r.isHomeroom && <span className="badge badge-success" style={{ marginRight: 6 }}>🏠 Homeroom</span>}
                    <strong>{r.className}</strong>
                  </div>
                  {r.subjects.length > 0 && (
                    <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>
                      📘 {r.subjects.map((s) => s.subjectName).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
