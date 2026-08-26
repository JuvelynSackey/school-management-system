import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useApiResource from '../../hooks/useApiResource';
import {
  listAdmissions, createAdmission, updateAdmission, approveAdmission,
  rejectAdmission, enrollAdmission, deleteAdmission, getSuggestedAdmissionNo,
} from '../../api/admissions.api';
import { listClasses } from '../../api/classes.api';
import { lookupGuardianByPhone } from '../../api/guardians.api';
import Modal from '../../components/common/Modal';

const STATUS_BADGE = {
  Applied: 'badge-neutral',
  Approved: 'badge-success',
  Rejected: 'badge-danger',
  Enrolled: 'badge-success',
};

const emptyGuardian = (contactPriority) => ({
  contactPriority, phone: '', fullName: '', email: '', relationship: '', linkedInfo: null, lookupError: '',
});

const emptyForm = () => ({
  firstName: '', lastName: '', gender: '', dateOfBirth: '', address: '', desiredClassId: '',
  guardians: [emptyGuardian('primary')],
});

const today = () => new Date().toISOString().slice(0, 10);

export default function AdmissionsList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [classes, setClasses] = useState([]);

  const params = statusFilter ? { status: statusFilter } : {};
  const { data: admissions, isLoading, error, reload } = useApiResource(
    () => listAdmissions(params),
    [statusFilter],
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [enrolling, setEnrolling] = useState(null);
  const [enrollForm, setEnrollForm] = useState(null);
  const [enrollError, setEnrollError] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  const [createdCredentials, setCreatedCredentials] = useState(null);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const openNew = () => { setForm(emptyForm()); setFormError(''); setEditing('new'); };
  const openEdit = (admission) => {
    const guardians = (admission.guardians || []).map((g) => ({
      contactPriority: g.contactPriority || 'primary',
      phone: g.phone || '',
      fullName: g.fullName || '',
      email: g.email || '',
      relationship: g.relationship || '',
      linkedInfo: null,
      lookupError: '',
    }));
    setForm({
      firstName: admission.firstName,
      lastName: admission.lastName,
      gender: admission.gender || '',
      dateOfBirth: admission.dateOfBirth || '',
      address: admission.address || '',
      desiredClassId: admission.desiredClassId || '',
      guardians: guardians.length ? guardians : [emptyGuardian('primary')],
    });
    setFormError('');
    setEditing(admission);
  };
  const close = () => setEditing(null);

  const updateGuardian = (index, field, value) => {
    setForm((f) => ({
      ...f,
      guardians: f.guardians.map((g, i) => (i === index ? { ...g, [field]: value, ...(field === 'phone' ? { linkedInfo: null, lookupError: '' } : {}) } : g)),
    }));
  };
  const addSecondaryGuardian = () => setForm((f) => ({ ...f, guardians: [...f.guardians, emptyGuardian('secondary')] }));
  const removeGuardian = (index) => setForm((f) => ({ ...f, guardians: f.guardians.filter((_, i) => i !== index) }));

  const lookupGuardian = async (index) => {
    const phone = form.guardians[index].phone.trim();
    if (!phone) return;
    try {
      const found = await lookupGuardianByPhone(phone);
      if (found) {
        setForm((f) => ({
          ...f,
          guardians: f.guardians.map((g, i) => (i === index ? {
            ...g, fullName: found.fullName, email: found.email || '', relationship: found.relationship || '', linkedInfo: found, lookupError: '',
          } : g)),
        }));
      } else {
        setForm((f) => ({
          ...f,
          guardians: f.guardians.map((g, i) => (i === index ? { ...g, linkedInfo: null, lookupError: 'No existing guardian with this phone — fill in details to create one.' } : g)),
        }));
      }
    } catch {
      // ignore lookup failures, admin can just fill in the fields manually
    }
  };

  const canAddSecondary = form.guardians.length < 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        desiredClassId: form.desiredClassId || null,
        guardians: form.guardians
          .filter((g) => g.phone.trim())
          .map((g) => ({
            phone: g.phone.trim(),
            fullName: g.fullName || g.phone,
            email: g.email || null,
            relationship: g.relationship || null,
            contactPriority: g.contactPriority,
          })),
      };
      if (editing === 'new') {
        await createAdmission(payload);
      } else {
        await updateAdmission(editing.id, payload);
      }
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save application.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (admission) => {
    if (!window.confirm(`Approve ${admission.firstName} ${admission.lastName}'s application?`)) return;
    await approveAdmission(admission.id);
    reload();
  };

  const openReject = (admission) => { setRejecting(admission); setRejectionReason(''); setRejectError(''); };
  const closeReject = () => setRejecting(null);
  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await rejectAdmission(rejecting.id, rejectionReason);
      closeReject();
      reload();
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject application.');
    }
  };

  const openEnroll = async (admission) => {
    setEnrolling(admission);
    setEnrollError('');
    let suggested = '';
    try {
      const res = await getSuggestedAdmissionNo();
      suggested = res.suggested;
    } catch {
      // fine, admin can type their own
    }
    setEnrollForm({
      email: '',
      admissionNo: suggested,
      classId: admission.desiredClassId || '',
      admissionDate: today(),
    });
  };
  const closeEnroll = () => { setEnrolling(null); setEnrollForm(null); };
  const handleEnroll = async (e) => {
    e.preventDefault();
    setIsEnrolling(true);
    setEnrollError('');
    try {
      const payload = {
        ...enrollForm,
        classId: enrollForm.classId || null,
        admissionDate: enrollForm.admissionDate || null,
      };
      const result = await enrollAdmission(enrolling.id, payload);
      closeEnroll();
      reload();
      setCreatedCredentials({ email: enrollForm.email, password: result.tempPassword });
    } catch (err) {
      setEnrollError(err.response?.data?.message || 'Failed to enroll applicant.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDelete = async (admission) => {
    if (!window.confirm(`Permanently delete the application for "${admission.firstName} ${admission.lastName}"?`)) return;
    await deleteAdmission(admission.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Admissions</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Application</button>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Applied">Applied</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Enrolled">Enrolled</option>
          </select>
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Name</th><th>Desired Class</th><th>Status</th><th>Applied</th><th /></tr>
            </thead>
            <tbody>
              {admissions.map((admission) => (
                <tr key={admission.id}>
                  <td>{admission.firstName} {admission.lastName}</td>
                  <td>{admission.desiredClass ? `${admission.desiredClass.name} ${admission.desiredClass.section || ''}` : '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[admission.status]}`}>{admission.status}</span></td>
                  <td>{admission.createdAt ? new Date(admission.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="row-actions">
                      {admission.status === 'Applied' && (
                        <>
                          <button type="button" className="link-btn" onClick={() => openEdit(admission)}>Edit</button>
                          <button type="button" className="link-btn" onClick={() => handleApprove(admission)}>Approve</button>
                          <button type="button" className="link-btn danger" onClick={() => openReject(admission)}>Reject</button>
                        </>
                      )}
                      {admission.status === 'Approved' && (
                        <>
                          <button type="button" className="link-btn" onClick={() => openEnroll(admission)}>Enroll</button>
                          <button type="button" className="link-btn danger" onClick={() => openReject(admission)}>Reject</button>
                        </>
                      )}
                      {admission.status === 'Rejected' && (
                        <>
                          {admission.rejectionReason && <span className="muted" style={{ fontSize: 13 }}>{admission.rejectionReason}</span>}
                          <button type="button" className="link-btn danger" onClick={() => handleDelete(admission)}>Delete</button>
                        </>
                      )}
                      {admission.status === 'Enrolled' && admission.enrolledStudentId && (
                        <button type="button" className="link-btn" onClick={() => navigate(`/students/${admission.enrolledStudentId}`)}>View Student</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {admissions.length === 0 && <tr><td colSpan={5} className="muted">No applications found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Application' : 'Edit Application'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>First Name</span>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </label>
            <label className="field">
              <span>Last Name</span>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </label>
            <label className="field">
              <span>Gender</span>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label className="field">
              <span>Date of Birth</span>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </label>
            <label className="field">
              <span>Desired Class</span>
              <select value={form.desiredClassId} onChange={(e) => setForm({ ...form, desiredClassId: e.target.value })}>
                <option value="">Undecided</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Address</span>
              <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Guardians</h3>
            {form.guardians.map((g, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className="panel" style={{ marginBottom: 12, padding: 14 }}>
                <div className="toolbar" style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: 13, textTransform: 'capitalize' }}>{g.contactPriority} guardian</strong>
                  {g.contactPriority === 'secondary' && (
                    <button type="button" className="link-btn danger" onClick={() => removeGuardian(index)}>Remove</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="Phone number"
                    value={g.phone}
                    onChange={(e) => updateGuardian(index, 'phone', e.target.value)}
                    style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                  />
                  <button type="button" className="btn-secondary" onClick={() => lookupGuardian(index)}>Look up</button>
                </div>
                {g.linkedInfo && (
                  <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                    Linking to existing guardian: <strong>{g.linkedInfo.fullName}</strong>
                  </p>
                )}
                {g.lookupError && <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{g.lookupError}</p>}
                <input
                  placeholder="Full name"
                  value={g.fullName}
                  onChange={(e) => updateGuardian(index, 'fullName', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8 }}
                />
                <input
                  placeholder="Email (optional)"
                  type="email"
                  value={g.email}
                  onChange={(e) => updateGuardian(index, 'email', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8 }}
                />
                <input
                  placeholder="Relationship (e.g. Mother, Father, Aunt)"
                  value={g.relationship}
                  onChange={(e) => updateGuardian(index, 'relationship', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                />
              </div>
            ))}
            {canAddSecondary && (
              <button type="button" className="btn-secondary" style={{ marginBottom: 16 }} onClick={addSecondaryGuardian}>+ Add secondary guardian</button>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {rejecting && (
        <Modal title="Reject Application" onClose={closeReject}>
          <form onSubmit={handleReject}>
            {rejectError && <div className="alert-error">{rejectError}</div>}
            <p>Rejecting the application for <strong>{rejecting.firstName} {rejecting.lastName}</strong>.</p>
            <label className="field">
              <span>Reason</span>
              <textarea rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeReject}>Cancel</button>
              <button type="submit" className="btn-primary">Reject</button>
            </div>
          </form>
        </Modal>
      )}

      {enrolling && enrollForm && (
        <Modal title="Enroll Applicant" onClose={closeEnroll}>
          <form onSubmit={handleEnroll}>
            {enrollError && <div className="alert-error">{enrollError}</div>}
            <p>Creating a student account and login for <strong>{enrolling.firstName} {enrolling.lastName}</strong>.</p>
            <label className="field">
              <span>Email</span>
              <input type="email" value={enrollForm.email} onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })} required />
            </label>
            <label className="field">
              <span>Admission Number</span>
              <input value={enrollForm.admissionNo} onChange={(e) => setEnrollForm({ ...enrollForm, admissionNo: e.target.value })} required />
            </label>
            <label className="field">
              <span>Class</span>
              <select value={enrollForm.classId} onChange={(e) => setEnrollForm({ ...enrollForm, classId: e.target.value })}>
                <option value="">Unassigned</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Admission Date</span>
              <input type="date" value={enrollForm.admissionDate} onChange={(e) => setEnrollForm({ ...enrollForm, admissionDate: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeEnroll}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isEnrolling}>{isEnrolling ? 'Enrolling...' : 'Enroll'}</button>
            </div>
          </form>
        </Modal>
      )}

      {createdCredentials && (
        <Modal title="Student account created" onClose={() => setCreatedCredentials(null)}>
          <p>Share these login details with the student/guardian. The password won&apos;t be shown again.</p>
          <div className="panel" style={{ marginTop: 12 }}>
            <p><strong>Email:</strong> {createdCredentials.email}</p>
            <p><strong>Temporary password:</strong> {createdCredentials.password}</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={() => setCreatedCredentials(null)}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
