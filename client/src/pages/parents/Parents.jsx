import { useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listGuardians, createGuardianLogin } from '../../api/guardians.api';
import { useAuth } from '../../context/AuthContext';

const LOGIN_STATUS_LABEL = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'warning' },
};

function CreateLoginCell({ guardian, onCreated }) {
  const [isSaving, setIsSaving] = useState(false);
  const [createdPin, setCreatedPin] = useState(null);
  const [error, setError] = useState('');

  if (guardian.hasLogin) {
    return (
      <span className={`badge badge-${LOGIN_STATUS_LABEL[guardian.loginStatus]?.tone || 'neutral'}`}>
        {LOGIN_STATUS_LABEL[guardian.loginStatus]?.label || guardian.loginStatus}
      </span>
    );
  }

  if (createdPin) {
    return <span className="muted" style={{ fontSize: 12 }}>PIN: <strong>{createdPin}</strong> (won&apos;t be shown again)</span>;
  }

  const handleCreate = async () => {
    setIsSaving(true);
    setError('');
    try {
      const updated = await createGuardianLogin(guardian.id, {});
      onCreated(guardian.id, updated);
      setCreatedPin(updated.pin);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create login.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <span className="badge badge-neutral" style={{ marginRight: 6 }}>No Login</span>
      <button type="button" className="link-btn" onClick={handleCreate} disabled={isSaving}>
        {isSaving ? 'Creating...' : 'Create Login'}
      </button>
      {error && <div className="muted" style={{ fontSize: 11.5, color: 'var(--danger)' }}>{error}</div>}
    </div>
  );
}

export default function Parents() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: guardians, isLoading, error, setData } = useApiResource(listGuardians);

  const handleLoginCreated = (guardianId) => {
    setData((prev) => prev.map((g) => (g.id === guardianId ? { ...g, hasLogin: true, loginStatus: 'active' } : g)));
  };

  return (
    <div>
      <div className="toolbar"><h1>Parents &amp; Guardians</h1></div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Name</th><th>Contact</th><th>Relationship</th><th>Linked Students</th><th>Portal Login</th></tr>
            </thead>
            <tbody>
              {guardians.map((g) => (
                <tr key={g.id}>
                  <td>{g.fullName}</td>
                  <td>
                    <div>{g.phone}</div>
                    {g.email && <div className="muted" style={{ fontSize: 12 }}>{g.email}</div>}
                  </td>
                  <td>{g.relationship || '—'}</td>
                  <td style={{ whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {g.students.map((s) => (
                        <span key={s.studentId}>
                          {s.name}
                          {s.contactPriority === 'primary' && <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: 10 }}>Primary</span>}
                          {!s.isPickupAuthorized && <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 10 }}>No Pickup</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {isAdmin ? (
                      <CreateLoginCell guardian={g} onCreated={handleLoginCreated} />
                    ) : (
                      g.hasLogin ? (
                        <span className={`badge badge-${LOGIN_STATUS_LABEL[g.loginStatus]?.tone || 'neutral'}`}>
                          {LOGIN_STATUS_LABEL[g.loginStatus]?.label || g.loginStatus}
                        </span>
                      ) : (
                        <span className="badge badge-neutral">No Login</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {guardians.length === 0 && <tr><td colSpan={5} className="muted">No parents or guardians linked yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
