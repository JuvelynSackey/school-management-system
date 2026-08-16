import { useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listTerms, createTerm, updateTerm, deleteTerm } from '../../api/terms.api';
import Modal from '../../components/common/Modal';

const emptyForm = { name: '', academicYear: '', termNumber: 1, startDate: '', endDate: '', isCurrent: false };

export default function TermList() {
  const { data: terms, isLoading, error, reload } = useApiResource(listTerms);
  const [editing, setEditing] = useState(null); // null | 'new' | term object
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => { setForm(emptyForm); setFormError(''); setEditing('new'); };
  const openEdit = (term) => {
    setForm({
      name: term.name,
      academicYear: term.academicYear,
      termNumber: term.termNumber,
      startDate: term.startDate || '',
      endDate: term.endDate || '',
      isCurrent: term.isCurrent,
    });
    setFormError('');
    setEditing(term);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = { ...form, termNumber: Number(form.termNumber) };
      if (editing === 'new') {
        await createTerm(payload);
      } else {
        await updateTerm(editing.id, payload);
      }
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save academic term.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (term) => {
    if (!window.confirm(`Delete term "${term.name}"?`)) return;
    await deleteTerm(term.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Academic Terms</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Term</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Academic Year</th><th>Term</th><th>Start</th><th>End</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {terms.map((term) => (
                <tr key={term.id}>
                  <td>{term.name}</td>
                  <td>{term.academicYear}</td>
                  <td>{term.termNumber}</td>
                  <td>{term.startDate || '—'}</td>
                  <td>{term.endDate || '—'}</td>
                  <td>{term.isCurrent ? <span className="badge badge-success">Current</span> : <span className="badge badge-neutral">Past/Future</span>}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(term)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(term)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {terms.length === 0 && (
                <tr><td colSpan={7} className="muted">No academic terms yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Academic Term' : 'Edit Academic Term'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2025/2026 Term 1" required />
            </label>
            <label className="field">
              <span>Academic Year</span>
              <input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="e.g. 2025/2026" required />
            </label>
            <label className="field">
              <span>Term Number</span>
              <select value={form.termNumber} onChange={(e) => setForm({ ...form, termNumber: e.target.value })}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <label className="field">
              <span>Start Date</span>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </label>
            <label className="field">
              <span>End Date</span>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
              <span>Set as current term</span>
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
