import useApiResource from '../../hooks/useApiResource';
import { listGuardians } from '../../api/guardians.api';

const LOGIN_STATUS_LABEL = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'warning' },
};

export default function Parents() {
  const { data: guardians, isLoading, error } = useApiResource(listGuardians);

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
                    {g.hasLogin ? (
                      <span className={`badge badge-${LOGIN_STATUS_LABEL[g.loginStatus]?.tone || 'neutral'}`}>
                        {LOGIN_STATUS_LABEL[g.loginStatus]?.label || g.loginStatus}
                      </span>
                    ) : (
                      <span className="badge badge-neutral">No Login</span>
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
