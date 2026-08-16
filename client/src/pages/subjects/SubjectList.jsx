import { useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listSubjects, createSubject, updateSubject, deleteSubject } from '../../api/subjects.api';
import Modal from '../../components/common/Modal';

const emptyForm = { name: '', code: '', description: '' };

export default function SubjectList() {
  const { data: subjects, isLoading, error, reload } = useApiResource(listSubjects);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => { setForm(emptyForm); setFormError(''); setEditing('new'); };
  const openEdit = (subject) => {
    setForm({ name: subject.name, code: subject.code || '', description: subject.description || '' });
    setFormError('');
    setEditing(subject);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await createSubject(form);
      } else {
        await updateSubject(editing.id, form);
      }
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save subject.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Delete subject "${subject.name}"?`)) return;
    await deleteSubject(subject.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Subjects</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Subject</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Description</th><th /></tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td>{subject.name}</td>
                  <td>{subject.code || '—'}</td>
                  <td>{subject.description || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(subject)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(subject)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && <tr><td colSpan={4} className="muted">No subjects yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Subject' : 'Edit Subject'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Code</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH101" />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
