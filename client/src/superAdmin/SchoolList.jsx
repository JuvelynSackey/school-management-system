import { useState } from 'react';
import useApiResource from '../hooks/useApiResource';
import {
  listSchools, createSchool, updateSchool, createSchoolAdmin, uploadSchoolLogo, updateSchoolBranding,
} from './api';
import Modal from '../components/common/Modal';

const emptyEditForm = { name: '', status: 'active' };
const emptyAdminForm = { fullName: '', email: '' };

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const CURRICULUM_TEMPLATES = [
  { value: 'full_basic', label: 'Full Basic', hint: 'Nursery 1–2, KG 1–2, Basic 1–6, JHS 1–3' },
  { value: 'primary_only', label: 'Primary Only', hint: 'Basic 1–6' },
  { value: 'jhs_only', label: 'JHS Only', hint: 'JHS 1–3' },
  { value: 'blank', label: 'Private Curriculum', hint: 'No classes/subjects seeded — build from scratch' },
];

export default function SchoolList() {
  const { data: schools, isLoading, error, reload } = useApiResource(listSchools);

  const [editModalSchool, setEditModalSchool] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editFormError, setEditFormError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);

  const [adminModalSchool, setAdminModalSchool] = useState(null);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminFormError, setAdminFormError] = useState('');
  const [adminResult, setAdminResult] = useState(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const openEditSchool = (school) => { setEditForm({ name: school.name, status: school.status }); setEditFormError(''); setEditModalSchool(school); };
  const closeEditModal = () => setEditModalSchool(null);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSavingEdit(true);
    setEditFormError('');
    try {
      await updateSchool(editModalSchool.id, editForm);
      closeEditModal();
      reload();
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'Failed to save school.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openAdminModal = (school) => {
    setAdminForm(emptyAdminForm);
    setAdminFormError('');
    setAdminResult(null);
    setAdminModalSchool(school);
  };
  const closeAdminModal = () => setAdminModalSchool(null);

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingAdmin(true);
    setAdminFormError('');
    try {
      const admin = await createSchoolAdmin(adminModalSchool.id, adminForm);
      setAdminResult(admin);
    } catch (err) {
      setAdminFormError(err.response?.data?.message || 'Failed to create admin.');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Schools</h1>
        <button type="button" className="btn-primary" onClick={() => setWizardOpen(true)}>New School</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>School</th><th>Login Code</th><th>Status</th><th>Students</th><th>Teachers</th><th>Admins</th><th /></tr></thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td><code>{school.slug}</code></td>
                  <td>{school.status}</td>
                  <td>{school.stats?.studentCount ?? '—'}</td>
                  <td>{school.stats?.teacherCount ?? '—'}</td>
                  <td>{school.stats?.adminCount ?? '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEditSchool(school)}>Edit</button>
                      <button type="button" className="link-btn" onClick={() => openAdminModal(school)}>Add Admin</button>
                    </div>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && <tr><td colSpan={7} className="muted">No schools yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editModalSchool && (
        <Modal title="Edit School" onClose={closeEditModal}>
          <form onSubmit={handleEditSubmit}>
            {editFormError && <div className="alert-error">{editFormError}</div>}
            <label className="field">
              <span>School Name</span>
              <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Status</span>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeEditModal}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSavingEdit}>{isSavingEdit ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {wizardOpen && (
        <OnboardingWizard
          onClose={() => setWizardOpen(false)}
          onDone={() => { setWizardOpen(false); reload(); }}
        />
      )}

      {adminModalSchool && (
        <Modal title={`Add Admin — ${adminModalSchool.name}`} onClose={closeAdminModal}>
          {adminResult ? (
            <AdminCreatedResult school={adminModalSchool} admin={adminResult} onDone={closeAdminModal} />
          ) : (
            <form onSubmit={handleAdminSubmit}>
              {adminFormError && <div className="alert-error">{adminFormError}</div>}
              <label className="field">
                <span>Full Name</span>
                <input value={adminForm.fullName} onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })} required />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required />
              </label>
              <p className="muted" style={{ fontSize: 13 }}>A temporary password is generated automatically and emailed to this address.</p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeAdminModal}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isCreatingAdmin}>{isCreatingAdmin ? 'Creating...' : 'Create Admin'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

function AdminCreatedResult({ school, admin, onDone }) {
  const [copied, setCopied] = useState(false);
  const loginLink = `${window.location.origin}/login?school=${school.slug}`;

  const copyPassword = async () => {
    await navigator.clipboard.writeText(admin.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p>Admin account created for <strong>{admin.fullName}</strong> ({admin.email}). A welcome email with these details was sent to them.</p>
      <p>Share this login link with the school:</p>
      <p><code>{loginLink}</code></p>
      <p>One-time temporary password (also emailed):</p>
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <code style={{ fontSize: 15 }}>{admin.tempPassword}</code>
        <button type="button" className="btn-secondary" onClick={copyPassword}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-primary" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}

function OnboardingWizard({ onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Step 1
  const [identityForm, setIdentityForm] = useState({ name: '', slug: '', curriculumTemplate: 'full_basic' });
  const [school, setSchool] = useState(null);
  const [seeded, setSeeded] = useState(null);

  // Step 2
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [brandingForm, setBrandingForm] = useState({ motto: '', primaryColor: '', secondaryColor: '' });

  // Step 4
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [adminResult, setAdminResult] = useState(null);

  const handleNameChange = (name) => setIdentityForm((f) => ({ ...f, name, slug: slugify(name) }));

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const created = await createSchool(identityForm);
      setSchool(created);
      setSeeded(created.seeded);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create school.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    setError('');
    try {
      if (logoFile) await uploadSchoolLogo(school.id, logoFile);
      await updateSchoolBranding(school.id, brandingForm);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save branding.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const admin = await createSchoolAdmin(school.id, adminForm);
      setAdminResult(admin);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin.');
    } finally {
      setIsSaving(false);
    }
  };

  const STEP_TITLES = { 1: 'New School — Identity', 2: 'New School — Branding', 3: 'New School — Confirmation', 4: 'New School — Initial Admin' };

  return (
    <Modal title={STEP_TITLES[step]} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleCreateSchool}>
          <label className="field">
            <span>School Name</span>
            <input value={identityForm.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Kings Prep Academy" required />
          </label>
          <label className="field">
            <span>Login Code</span>
            <input value={identityForm.slug} onChange={(e) => setIdentityForm({ ...identityForm, slug: e.target.value })} placeholder="e.g. kings-prep" required />
          </label>
          <label className="field">
            <span>Curriculum Template</span>
            {CURRICULUM_TEMPLATES.map((t) => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 400 }}>
                <input
                  type="radio"
                  name="curriculumTemplate"
                  checked={identityForm.curriculumTemplate === t.value}
                  onChange={() => setIdentityForm({ ...identityForm, curriculumTemplate: t.value })}
                />
                <span>{t.label} <span className="muted">— {t.hint}</span></span>
              </label>
            ))}
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create & Continue'}</button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div>
          <label className="field">
            <span>Logo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoChange} />
          </label>
          {logoPreview && <img src={logoPreview} alt="Logo preview" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 12 }} />}
          <label className="field">
            <span>Motto</span>
            <input value={brandingForm.motto} onChange={(e) => setBrandingForm({ ...brandingForm, motto: e.target.value })} placeholder="e.g. Excellence, Discipline, Integrity" />
          </label>
          <label className="field">
            <span>Primary Color</span>
            <input type="color" value={brandingForm.primaryColor || '#322c7c'} onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })} />
          </label>
          <label className="field">
            <span>Secondary Color</span>
            <input type="color" value={brandingForm.secondaryColor || '#f5c344'} onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setStep(3)}>Skip</button>
            <button type="button" className="btn-primary" onClick={handleSaveBranding} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save & Continue'}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p><strong>{school.name}</strong> was created with login code <code>{school.slug}</code>.</p>
          <p className="muted">
            {seeded?.classesCreated > 0
              ? `${seeded.classesCreated} classes and ${seeded.subjectsCreated} subjects were provisioned.`
              : 'No classes/subjects were seeded (Private Curriculum) — add them from the school\'s Classes/Subjects pages.'}
          </p>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onDone}>Finish Without Admin</button>
            <button type="button" className="btn-primary" onClick={() => setStep(4)}>Add Initial Admin</button>
          </div>
        </div>
      )}

      {step === 4 && (
        adminResult ? (
          <AdminCreatedResult school={school} admin={adminResult} onDone={onDone} />
        ) : (
          <form onSubmit={handleCreateAdmin}>
            <label className="field">
              <span>Full Name</span>
              <input value={adminForm.fullName} onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} required />
            </label>
            <p className="muted" style={{ fontSize: 13 }}>A temporary password is generated automatically and emailed to this address.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onDone}>Skip</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Admin'}</button>
            </div>
          </form>
        )
      )}
    </Modal>
  );
}
