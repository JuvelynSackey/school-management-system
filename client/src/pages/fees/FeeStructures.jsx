import { useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure, applyFeeStructure } from '../../api/feeStructures.api';
import { formatCurrency } from '../../utils/currency';
import Modal from '../../components/common/Modal';

const STAGES = ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'];
const emptyForm = { name: '', amount: '', academicTermId: '' };
const emptyApply = { target: 'class', classId: '', stage: '', dueDate: '' };

export default function FeeStructures({ classes, terms }) {
  const { data: structures, isLoading, error, reload } = useApiResource(listFeeStructures);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [applying, setApplying] = useState(null);
  const [applyForm, setApplyForm] = useState(emptyApply);
  const [applyError, setApplyError] = useState('');
  const [applyResult, setApplyResult] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const openNew = () => { setForm(emptyForm); setFormError(''); setEditing('new'); };
  const openEdit = (structure) => {
    setForm({ name: structure.name, amount: structure.amount, academicTermId: structure.academicTermId || '' });
    setFormError('');
    setEditing(structure);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = { ...form, amount: Number(form.amount), academicTermId: form.academicTermId || null };
      if (editing === 'new') await createFeeStructure(payload);
      else await updateFeeStructure(editing.id, payload);
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save fee structure.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (structure) => {
    if (!window.confirm(`Delete fee structure "${structure.name}"?`)) return;
    await deleteFeeStructure(structure.id);
    reload();
  };

  const openApply = (structure) => {
    setApplying(structure);
    setApplyForm(emptyApply);
    setApplyError('');
    setApplyResult(null);
  };
  const closeApply = () => setApplying(null);

  const handleApply = async (e) => {
    e.preventDefault();
    setIsApplying(true);
    setApplyError('');
    setApplyResult(null);
    try {
      const payload = {
        target: applyForm.target,
        ...(applyForm.target === 'class' ? { classId: applyForm.classId } : {}),
        ...(applyForm.target === 'stage' ? { stage: applyForm.stage } : {}),
        ...(applyForm.dueDate ? { dueDate: applyForm.dueDate } : {}),
      };
      const result = await applyFeeStructure(applying.id, payload);
      setApplyResult(result);
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Failed to apply fee structure.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <p className="muted">Reusable fee templates you can apply to a class, a stage, or the whole school.</p>
        <button type="button" className="btn-primary" onClick={openNew}>New Fee Structure</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>Name</th><th>Amount</th><th>Term</th><th /></tr></thead>
            <tbody>
              {structures.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{formatCurrency(s.amount)}</td>
                  <td>{s.academicTerm?.name || 'Any term'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openApply(s)}>Apply</button>
                      <button type="button" className="link-btn" onClick={() => openEdit(s)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(s)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {structures.length === 0 && <tr><td colSpan={4} className="muted">No fee structures yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Fee Structure' : 'Edit Fee Structure'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JHS Tuition" required />
            </label>
            <label className="field">
              <span>Amount (GH₵)</span>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </label>
            <label className="field">
              <span>Academic Term</span>
              <select value={form.academicTermId} onChange={(e) => setForm({ ...form, academicTermId: e.target.value })}>
                <option value="">Any term</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {applying && (
        <Modal title={`Apply "${applying.name}"`} onClose={closeApply}>
          {!applyResult ? (
            <form onSubmit={handleApply}>
              {applyError && <div className="alert-error">{applyError}</div>}
              <p className="muted">Creates a fee of {formatCurrency(applying.amount)} for every active student in the target group. Students who already have this fee for the term are skipped.</p>
              <label className="field">
                <span>Apply to</span>
                <select value={applyForm.target} onChange={(e) => setApplyForm({ ...applyForm, target: e.target.value })}>
                  <option value="class">A specific class</option>
                  <option value="stage">A whole stage</option>
                  <option value="all">All students</option>
                </select>
              </label>
              {applyForm.target === 'class' && (
                <label className="field">
                  <span>Class</span>
                  <select value={applyForm.classId} onChange={(e) => setApplyForm({ ...applyForm, classId: e.target.value })} required>
                    <option value="">Select a class...</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                  </select>
                </label>
              )}
              {applyForm.target === 'stage' && (
                <label className="field">
                  <span>Stage</span>
                  <select value={applyForm.stage} onChange={(e) => setApplyForm({ ...applyForm, stage: e.target.value })} required>
                    <option value="">Select a stage...</option>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Due Date (optional)</span>
                <input type="date" value={applyForm.dueDate} onChange={(e) => setApplyForm({ ...applyForm, dueDate: e.target.value })} />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeApply}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isApplying}>{isApplying ? 'Applying...' : 'Apply'}</button>
              </div>
            </form>
          ) : (
            <>
              <p>Created <strong>{applyResult.created}</strong> new fee{applyResult.created === 1 ? '' : 's'}, skipped <strong>{applyResult.skipped}</strong> (already assigned).</p>
              <div className="modal-actions">
                <button type="button" className="btn-primary" onClick={closeApply}>Done</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
