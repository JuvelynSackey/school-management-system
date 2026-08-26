import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listTeachers, createTeacher, updateTeacher } from '../../api/teachers.api';
import { listClasses } from '../../api/classes.api';
import { listSubjectsForClass } from '../../api/subjects.api';
import Modal from '../../components/common/Modal';

const emptyForm = {
  email: '', staffNo: '', firstName: '', lastName: '', gender: '', phone: '', hireDate: '', qualification: '',
};

const emptyAssignmentRow = () => ({ classId: '', subjectId: '' });

export default function TeacherList() {
  const { data: teachers, isLoading, error, reload } = useApiResource(listTeachers);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [classes, setClasses] = useState([]);
  const [homeroomClassId, setHomeroomClassId] = useState('');
  const [assignmentRows, setAssignmentRows] = useState([]);
  const [subjectsByClassId, setSubjectsByClassId] = useState({});

  useEffect(() => { listClasses().then(setClasses).catch(() => setClasses([])); }, []);

  const loadSubjectsForClass = (classId) => {
    if (!classId || subjectsByClassId[classId]) return;
    listSubjectsForClass(classId)
      .then((links) => setSubjectsByClassId((prev) => ({ ...prev, [classId]: links.map((l) => l.subject) })))
      .catch(() => setSubjectsByClassId((prev) => ({ ...prev, [classId]: [] })));
  };

  const updateAssignmentRow = (index, field, value) => {
    setAssignmentRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      // Changing the class invalidates whatever subject was picked for the
      // old class — a subject id from one class's curriculum is meaningless
      // once the row points at a different class.
      const next = { ...row, [field]: value };
      if (field === 'classId') next.subjectId = '';
      return next;
    }));
    if (field === 'classId') loadSubjectsForClass(value);
  };

  const openNew = () => {
    setForm(emptyForm);
    setFormError('');
    setHomeroomClassId('');
    setAssignmentRows([]);
    setEditing('new');
  };
  const openEdit = (teacher) => {
    setForm({
      email: teacher.user?.email || '',
      staffNo: teacher.staffNo,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      gender: teacher.gender || '',
      phone: teacher.phone || '',
      hireDate: teacher.hireDate || '',
      qualification: teacher.qualification || '',
      status: teacher.status,
    });
    setFormError('');
    setEditing(teacher);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        const subjectAssignments = assignmentRows
          .filter((row) => row.classId && row.subjectId)
          .map((row) => ({ classId: row.classId, subjectId: row.subjectId }));
        const created = await createTeacher({
          ...form,
          homeroomClassId: homeroomClassId || null,
          subjectAssignments,
        });
        close();
        setCreatedCredentials({ email: created.user.email, password: created.tempPassword });
      } else {
        const { email, ...updatable } = form;
        await updateTeacher(editing.id, updatable);
        close();
      }
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save teacher.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (teacher) => {
    const status = teacher.status === 'active' ? 'inactive' : 'active';
    await updateTeacher(teacher.id, { status });
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Teachers</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Teacher</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Name</th><th>Staff No.</th><th>Email</th><th>Phone</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td>{teacher.firstName} {teacher.lastName}</td>
                  <td>{teacher.staffNo}</td>
                  <td>{teacher.user?.email}</td>
                  <td>{teacher.phone || '—'}</td>
                  <td>
                    {teacher.status === 'active'
                      ? <span className="badge badge-success">Active</span>
                      : <span className="badge badge-neutral">Inactive</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(teacher)}>Edit</button>
                      <button type="button" className="link-btn" onClick={() => handleToggleStatus(teacher)}>
                        {teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && <tr><td colSpan={6} className="muted">No teachers yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Teacher' : 'Edit Teacher'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            {editing === 'new' && (
              <label className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
            )}
            <label className="field">
              <span>Staff Number</span>
              <input value={form.staffNo} onChange={(e) => setForm({ ...form, staffNo: e.target.value })} required />
            </label>
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
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="field">
              <span>Hire Date</span>
              <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
            </label>
            <label className="field">
              <span>Qualification</span>
              <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
            </label>

            {editing === 'new' && (
              <>
                <label className="field">
                  <span>Homeroom Class (optional)</span>
                  <select value={homeroomClassId} onChange={(e) => setHomeroomClassId(e.target.value)}>
                    <option value="">— None —</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                  </select>
                  <small className="muted">Makes this teacher the Class Teacher (Form Tutor) — full access to that class&apos;s attendance, remarks, and every subject.</small>
                </label>

                <div className="field">
                  <span>Subject Assignments (optional)</span>
                  {assignmentRows.map((row, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <select
                        value={row.classId}
                        onChange={(e) => updateAssignmentRow(index, 'classId', e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">Select class...</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                      </select>
                      <select
                        value={row.subjectId}
                        onChange={(e) => updateAssignmentRow(index, 'subjectId', e.target.value)}
                        disabled={!row.classId}
                        style={{ flex: 1 }}
                      >
                        <option value="">Select subject...</option>
                        {(subjectsByClassId[row.classId] || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className="link-btn danger"
                        onClick={() => setAssignmentRows((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn-secondary" onClick={() => setAssignmentRows((prev) => [...prev, emptyAssignmentRow()])}>
                    + Add Subject Assignment
                  </button>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {createdCredentials && (
        <Modal title="Teacher account created" onClose={() => setCreatedCredentials(null)}>
          <p>Share these login details with the teacher. The password won&apos;t be shown again.</p>
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
