import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useApiResource from '../../hooks/useApiResource';
import {
  listStudents, createStudent, updateStudent, deleteStudent, downloadIdCardsPdf, getWaecExportPreview, downloadWaecExport,
} from '../../api/students.api';
import { listClasses } from '../../api/classes.api';
import { lookupGuardianByPhone } from '../../api/guardians.api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';

const SAFETY_NOTE_TYPES = ['pickup', 'medical', 'other'];

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
  transferred: 'Transferred',
  withdrawn: 'Withdrawn',
  graduated: 'Graduated',
};
const STATUS_BADGE_TONE = {
  active: 'success',
  inactive: 'warning',
  archived: 'neutral',
  transferred: 'neutral',
  withdrawn: 'neutral',
  graduated: 'success',
};

const emptyGuardian = (contactPriority) => ({
  contactPriority, phone: '', fullName: '', email: '', relationship: '', occupation: '', whatsappNumber: '', whatsappSameAsPhone: true, linkedInfo: null, lookupError: '',
});

const emptyForm = () => ({
  email: '', admissionNo: '', firstName: '', lastName: '', gender: '', dateOfBirth: '', classId: '',
  address: '', admissionDate: '', category: '', programme: '', waecIndexNumber: '',
  nationality: 'Ghanaian', religion: '', hometownRegion: '', primaryLanguage: '',
  guardians: [emptyGuardian('primary')],
  safetyNotes: [],
});

const GHANAIAN_LANGUAGES = ['English', 'Twi', 'Fante', 'Ewe', 'Ga', 'Dagbani', 'Dagaare', 'Hausa', 'Nzema', 'Gonja'];

export default function StudentList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classes, setClasses] = useState([]);

  const params = {
    ...(search ? { search } : {}),
    ...(classFilter ? { classId: classFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };
  const { data: students, isLoading, error, reload } = useApiResource(
    () => listStudents(params),
    [search, classFilter, statusFilter],
  );

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [isPrintingCards, setIsPrintingCards] = useState(false);
  const [printError, setPrintError] = useState('');
  const [isCheckingWaec, setIsCheckingWaec] = useState(false);
  const [waecIssues, setWaecIssues] = useState(null); // null = no check run yet / dismissed

  const handlePrintIdCards = async () => {
    setIsPrintingCards(true);
    setPrintError('');
    try {
      const className = classes.find((c) => c.id === classFilter)?.name || 'class';
      await downloadIdCardsPdf(classFilter, `id-cards-${className}.pdf`);
    } catch (err) {
      setPrintError(err.response?.data?.message || 'Failed to generate ID cards.');
    } finally {
      setIsPrintingCards(false);
    }
  };

  const handleWaecExport = async () => {
    setIsCheckingWaec(true);
    setPrintError('');
    try {
      const preview = await getWaecExportPreview(classFilter);
      if (!preview.ready) {
        setWaecIssues(preview.issues);
        return;
      }
      const className = classes.find((c) => c.id === classFilter)?.name || 'class';
      await downloadWaecExport(classFilter, `waec-candidates-${className}.csv`);
    } catch (err) {
      setPrintError(err.response?.data?.message || 'Failed to check or export WAEC candidate data.');
    } finally {
      setIsCheckingWaec(false);
    }
  };

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const openNew = () => { setForm(emptyForm()); setFormError(''); setEditing('new'); };
  const openEdit = (student) => {
    const guardians = (student.guardians || []).map((g) => ({
      contactPriority: g.contactPriority || 'primary',
      phone: g.phone,
      fullName: g.fullName,
      email: g.email || '',
      relationship: g.relationship || '',
      occupation: g.occupation || '',
      whatsappNumber: g.whatsappNumber || '',
      whatsappSameAsPhone: !g.whatsappNumber || g.whatsappNumber === g.phone,
      linkedInfo: g,
      lookupError: '',
    }));
    setForm({
      email: student.user?.email || '',
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth || '',
      classId: student.classId || '',
      address: student.address || '',
      admissionDate: student.admissionDate || '',
      category: student.category || '',
      programme: student.programme || '',
      waecIndexNumber: student.waecIndexNumber || '',
      nationality: student.nationality || 'Ghanaian',
      religion: student.religion || '',
      hometownRegion: student.hometownRegion || '',
      primaryLanguage: student.primaryLanguage || '',
      guardians: guardians.length ? guardians : [emptyGuardian('primary')],
      safetyNotes: (student.safetyNotes || []).map((n) => ({ type: n.type, note: n.note })),
    });
    setFormError('');
    setEditing(student);
  };
  const close = () => setEditing(null);

  // --- Guardians ---
  const updateGuardian = (index, field, value) => {
    setForm((f) => ({
      ...f,
      guardians: f.guardians.map((g, i) => {
        if (i !== index) return g;
        const next = { ...g, [field]: value };
        if (field === 'phone') {
          Object.assign(next, { linkedInfo: null, lookupError: '' });
          if (g.whatsappSameAsPhone) next.whatsappNumber = value;
        }
        if (field === 'whatsappSameAsPhone') next.whatsappNumber = value ? g.phone : g.whatsappNumber;
        return next;
      }),
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
        updateGuardian(index, 'fullName', found.fullName);
        updateGuardian(index, 'email', found.email || '');
        updateGuardian(index, 'relationship', found.relationship || '');
        setForm((f) => ({
          ...f,
          guardians: f.guardians.map((g, i) => (i === index ? { ...g, linkedInfo: found, lookupError: '' } : g)),
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

  // --- Safety notes ---
  const addSafetyNote = () => setForm((f) => ({ ...f, safetyNotes: [...f.safetyNotes, { type: 'other', note: '' }] }));
  const updateSafetyNote = (index, field, value) => {
    setForm((f) => ({ ...f, safetyNotes: f.safetyNotes.map((n, i) => (i === index ? { ...n, [field]: value } : n)) }));
  };
  const removeSafetyNote = (index) => setForm((f) => ({ ...f, safetyNotes: f.safetyNotes.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        classId: form.classId || null,
        guardians: form.guardians
          .filter((g) => g.phone.trim())
          .map((g) => ({
            phone: g.phone.trim(),
            fullName: g.fullName || g.phone,
            email: g.email || null,
            relationship: g.relationship || null,
            contactPriority: g.contactPriority,
            occupation: g.occupation || null,
            whatsappNumber: g.whatsappNumber || null,
          })),
        safetyNotes: form.safetyNotes.filter((n) => n.note.trim()),
      };
      if (editing === 'new') {
        const created = await createStudent(payload);
        close();
        setCreatedCredentials({
          email: created.user.email, admissionNo: created.admissionNo, password: created.tempPassword, provisionedLogins: created.provisionedLogins,
        });
      } else {
        const { email, ...updatable } = payload;
        await updateStudent(editing.id, updatable);
        close();
      }
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save student.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (student, nextStatus) => {
    if (nextStatus === student.status) return;
    if (!window.confirm(`Set ${student.firstName} ${student.lastName}'s status to "${STATUS_LABELS[nextStatus]}"?`)) return;
    await updateStudent(student.id, { status: nextStatus });
    reload();
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Permanently delete "${student.firstName} ${student.lastName}"? This also removes their login.`)) return;
    await deleteStudent(student.id);
    reload();
  };

  const canEdit = user?.role === 'admin';
  const canAddSecondary = form.guardians.length < 2;

  return (
    <div>
      <div className="toolbar">
        <h1>Students</h1>
        {canEdit && <button type="button" className="btn-primary" onClick={openNew}>New Student</button>}
      </div>

      <div className="panel">
        {printError && <div className="alert-error">{printError}</div>}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <input
            placeholder="Search by name or admission no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          {canEdit && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Active roster</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          )}
          {canEdit && classFilter && (
            <button type="button" className="btn-secondary" onClick={handlePrintIdCards} disabled={isPrintingCards}>
              {isPrintingCards ? 'Generating…' : 'Print ID Cards'}
            </button>
          )}
          {canEdit && classFilter && (
            <button type="button" className="btn-secondary" onClick={handleWaecExport} disabled={isCheckingWaec}>
              {isCheckingWaec ? 'Checking…' : 'WAEC Export'}
            </button>
          )}
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Name</th><th>Admission No.</th><th>Class</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>{student.admissionNo}</td>
                  <td>{student.class ? `${student.class.name} ${student.class.section || ''}` : '—'}</td>
                  <td>
                    {canEdit ? (
                      <select
                        value={student.status}
                        onChange={(e) => handleStatusChange(student, e.target.value)}
                        className={`badge badge-${STATUS_BADGE_TONE[student.status]}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    ) : (
                      <span className={`badge badge-${STATUS_BADGE_TONE[student.status]}`}>{STATUS_LABELS[student.status]}</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => navigate(`/students/${student.id}`)}>View</button>
                      {canEdit && <button type="button" className="link-btn" onClick={() => openEdit(student)}>Edit</button>}
                      {canEdit && <button type="button" className="link-btn danger" onClick={() => handleDelete(student)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={5} className="muted">No students found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Student' : 'Edit Student'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            {editing === 'new' && (
              <label className="field">
                <span>Email (optional)</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Leave blank to log in by Admission No. + PIN instead"
                />
              </label>
            )}
            <label className="field">
              <span>Admission Number</span>
              <input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} required />
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
              <span>Date of Birth</span>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </label>
            <label className="field">
              <span>Class</span>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">Unassigned</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Address</span>
              <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className="field">
              <span>Admission Date</span>
              <input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                <option value="Day">Day</option>
                <option value="Boarding">Boarding</option>
              </select>
            </label>
            <label className="field">
              <span>Programme</span>
              <input
                value={form.programme}
                onChange={(e) => setForm({ ...form, programme: e.target.value })}
                placeholder="e.g. General Science (SHS only)"
              />
            </label>
            {editing !== 'new' && (
              <label className="field">
                <span>WAEC/BECE Index Number</span>
                <input
                  value={form.waecIndexNumber}
                  onChange={(e) => setForm({ ...form, waecIndexNumber: e.target.value })}
                  placeholder="Assigned closer to candidate registration"
                  maxLength={20}
                />
              </label>
            )}

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Background</h3>
            <label className="field">
              <span>Nationality</span>
              <input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                maxLength={100}
              />
            </label>
            <label className="field">
              <span>Religion</span>
              <input
                value={form.religion}
                onChange={(e) => setForm({ ...form, religion: e.target.value })}
                maxLength={100}
              />
            </label>
            <label className="field">
              <span>Hometown / Region</span>
              <input
                value={form.hometownRegion}
                onChange={(e) => setForm({ ...form, hometownRegion: e.target.value })}
                placeholder="e.g. Cape Coast / Central Region"
                maxLength={150}
              />
            </label>
            <label className="field">
              <span>Primary Language Spoken at Home</span>
              <input
                list="ghanaian-languages"
                value={form.primaryLanguage}
                onChange={(e) => setForm({ ...form, primaryLanguage: e.target.value })}
                placeholder="e.g. Twi, Fante, Ewe, Ga"
                maxLength={100}
              />
              <datalist id="ghanaian-languages">
                {GHANAIAN_LANGUAGES.map((lang) => <option key={lang} value={lang} />)}
              </datalist>
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
                    required={g.contactPriority === 'primary'}
                  />
                  <button type="button" className="btn-secondary" onClick={() => lookupGuardian(index)}>Look up</button>
                </div>
                {g.linkedInfo && (
                  <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                    Linking to existing guardian: <strong>{g.linkedInfo.fullName}</strong>
                    {g.linkedInfo.students?.length > 0 && (
                      <> — already parent of: {g.linkedInfo.students.map((s) => `${s.firstName} ${s.lastName}`).join(', ')}</>
                    )}
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
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8 }}
                />
                <input
                  placeholder="Occupation"
                  value={g.occupation}
                  onChange={(e) => updateGuardian(index, 'occupation', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8 }}
                />
                <input
                  placeholder="WhatsApp number"
                  value={g.whatsappNumber}
                  onChange={(e) => updateGuardian(index, 'whatsappNumber', e.target.value)}
                  disabled={g.whatsappSameAsPhone}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <input
                    type="checkbox"
                    checked={g.whatsappSameAsPhone}
                    onChange={(e) => updateGuardian(index, 'whatsappSameAsPhone', e.target.checked)}
                  />
                  Same as phone number
                </label>
              </div>
            ))}
            {canAddSecondary && (
              <button type="button" className="btn-secondary" style={{ marginBottom: 16 }} onClick={addSecondaryGuardian}>+ Add secondary guardian</button>
            )}

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Safety Notes</h3>
            {form.safetyNotes.map((n, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={n.type} onChange={(e) => updateSafetyNote(index, 'type', e.target.value)} style={{ width: 110 }}>
                  {SAFETY_NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  placeholder="e.g. Authorized pick-up: Aunt Sarah"
                  value={n.note}
                  onChange={(e) => updateSafetyNote(index, 'note', e.target.value)}
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
                />
                <button type="button" className="link-btn danger" onClick={() => removeSafetyNote(index)}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" style={{ marginBottom: 16 }} onClick={addSafetyNote}>+ Add safety note</button>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {createdCredentials && (
        <Modal title="Student account created" onClose={() => setCreatedCredentials(null)}>
          <p>Share these login details with the student/guardian. The PIN won&apos;t be shown again.</p>
          <div className="panel" style={{ marginTop: 12 }}>
            <p><strong>Admission No.:</strong> {createdCredentials.admissionNo}</p>
            {createdCredentials.email && <p><strong>Email:</strong> {createdCredentials.email}</p>}
            <p><strong>PIN:</strong> {createdCredentials.password}</p>
          </div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            {createdCredentials.email
              ? 'They can log in with either the email above or their Admission No., plus this PIN.'
              : 'No email was set — they log in with their Admission No. and this PIN.'}
          </p>
          {createdCredentials.provisionedLogins?.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, margin: '16px 0 8px' }}>Parent/Guardian Portal Access</h3>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                New guardian contact(s) also got a portal login — share these too.
              </p>
              {createdCredentials.provisionedLogins.map((pl) => (
                <div key={pl.guardianId} className="panel" style={{ marginBottom: 8 }}>
                  <p style={{ margin: 0 }}><strong>{pl.fullName}</strong></p>
                  <p style={{ margin: '4px 0 0' }}>Phone: <strong>{pl.phone}</strong> &middot; PIN: <strong>{pl.pin}</strong></p>
                </div>
              ))}
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={() => setCreatedCredentials(null)}>Done</button>
          </div>
        </Modal>
      )}

      {waecIssues && (
        <Modal title="WAEC/BECE Export — Data Missing" onClose={() => setWaecIssues(null)}>
          <p className="muted" style={{ marginBottom: 12 }}>
            {waecIssues.length} candidate{waecIssues.length === 1 ? '' : 's'} in this class are missing required data.
            Fix these first, then try the export again.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {waecIssues.map((issue) => (
              <div key={issue.studentId} className="panel" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{issue.name} <span className="muted" style={{ fontWeight: 400 }}>({issue.admissionNo})</span></p>
                  <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Missing: {issue.missingFields.join(', ')}</p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => navigate(`/students/${issue.studentId}`)}>Fix</button>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setWaecIssues(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
