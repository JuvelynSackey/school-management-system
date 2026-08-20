import { useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import {
  listSchoolAdmins, setSchoolAdminStatus, resetSchoolAdminPassword,
  listSuperAdmins, createSuperAdmin, setSuperAdminStatus,
} from './api';
import { useSuperAdminAuth } from './SuperAdminAuthContext';
import Modal from '../components/common/Modal';

const emptyForm = { fullName: '', email: '', password: '' };

export default function PlatformUsersPage() {
  const { superAdmin } = useSuperAdminAuth();
  const { data: schoolAdmins, isLoading: loadingAdmins, error: adminsError, reload: reloadAdmins } = useApiResource(listSchoolAdmins);
  const { data: superAdmins, isLoading: loadingSuperAdmins, error: superAdminsError, reload: reloadSuperAdmins } = useApiResource(listSuperAdmins);

  const [resetResult, setResetResult] = useState(null);
  const [newSaModal, setNewSaModal] = useState(false);
  const [newSaForm, setNewSaForm] = useState(emptyForm);
  const [newSaError, setNewSaError] = useState('');
  const [isCreatingSa, setIsCreatingSa] = useState(false);

  const toggleAdminStatus = async (admin) => {
    const next = admin.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${next === 'inactive' ? 'Suspend' : 'Reactivate'} ${admin.fullName}'s account?`)) return;
    await setSchoolAdminStatus(admin.id, next);
    reloadAdmins();
  };

  const handleResetPassword = async (admin) => {
    if (!window.confirm(`Reset the password for ${admin.fullName}? They will need the new temporary password to log in.`)) return;
    const result = await resetSchoolAdminPassword(admin.id);
    setResetResult(result);
  };

  const toggleSuperAdminStatus = async (admin) => {
    const next = admin.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${next === 'inactive' ? 'Suspend' : 'Reactivate'} ${admin.fullName}'s super-admin account?`)) return;
    try {
      await setSuperAdminStatus(admin.id, next);
      reloadSuperAdmins();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const openNewSa = () => { setNewSaForm(emptyForm); setNewSaError(''); setNewSaModal(true); };
  const closeNewSa = () => setNewSaModal(false);
  const handleCreateSa = async (e) => {
    e.preventDefault();
    setIsCreatingSa(true);
    setNewSaError('');
    try {
      await createSuperAdmin(newSaForm);
      closeNewSa();
      reloadSuperAdmins();
    } catch (err) {
      setNewSaError(err.response?.data?.message || 'Failed to create super admin.');
    } finally {
      setIsCreatingSa(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Platform Users</h1></div>

      <div className="panel">
        <h2>School Admins</h2>
        {loadingAdmins && <p className="muted">Loading...</p>}
        {adminsError && <div className="alert-error">{adminsError}</div>}
        {!loadingAdmins && !adminsError && (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>School</th><th>Status</th><th /></tr></thead>
            <tbody>
              {schoolAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.fullName}</td>
                  <td>{admin.email}</td>
                  <td>{admin.school?.name || '—'}</td>
                  <td><span className={`badge ${admin.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{admin.status}</span></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => toggleAdminStatus(admin)}>
                        {admin.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button type="button" className="link-btn" onClick={() => handleResetPassword(admin)}>Reset Password</button>
                    </div>
                  </td>
                </tr>
              ))}
              {schoolAdmins.length === 0 && <tr><td colSpan={5} className="muted">No school admins found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Super Admins</h2>
          <button type="button" className="btn-primary" onClick={openNewSa}>New Super Admin</button>
        </div>
        {loadingSuperAdmins && <p className="muted">Loading...</p>}
        {superAdminsError && <div className="alert-error">{superAdminsError}</div>}
        {!loadingSuperAdmins && !superAdminsError && (
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th /></tr></thead>
            <tbody>
              {superAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.fullName}</td>
                  <td>{admin.email}</td>
                  <td><span className={`badge ${admin.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{admin.status}</span></td>
                  <td>
                    {admin.id !== superAdmin?.id ? (
                      <button type="button" className="link-btn" onClick={() => toggleSuperAdminStatus(admin)}>
                        {admin.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    ) : <span className="muted" style={{ fontSize: 13 }}>You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {newSaModal && (
        <Modal title="New Super Admin" onClose={closeNewSa}>
          <form onSubmit={handleCreateSa}>
            {newSaError && <div className="alert-error">{newSaError}</div>}
            <label className="field">
              <span>Full Name</span>
              <input value={newSaForm.fullName} onChange={(e) => setNewSaForm({ ...newSaForm, fullName: e.target.value })} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={newSaForm.email} onChange={(e) => setNewSaForm({ ...newSaForm, email: e.target.value })} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="text" value={newSaForm.password} onChange={(e) => setNewSaForm({ ...newSaForm, password: e.target.value })} minLength={8} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeNewSa}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isCreatingSa}>{isCreatingSa ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}

      {resetResult && (
        <Modal title="Password Reset" onClose={() => setResetResult(null)}>
          <p>Share this temporary password with {resetResult.email}. It won&apos;t be shown again.</p>
          <div className="panel" style={{ marginTop: 12 }}>
            <p><strong>Email:</strong> {resetResult.email}</p>
            <p><strong>Temporary password:</strong> {resetResult.tempPassword}</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={() => setResetResult(null)}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
