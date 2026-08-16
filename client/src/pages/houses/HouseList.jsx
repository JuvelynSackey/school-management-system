import { useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listHouses, createHouse, updateHouse, deleteHouse } from '../../api/houses.api';
import Modal from '../../components/common/Modal';

const emptyForm = { name: '', colorHex: '#6d28d9' };

export default function HouseList() {
  const { data: houses, isLoading, error, reload } = useApiResource(listHouses);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const openNew = () => { setForm(emptyForm); setFormError(''); setEditing('new'); };
  const openEdit = (house) => {
    setForm({ name: house.name, colorHex: house.colorHex || '#6d28d9' });
    setFormError('');
    setEditing(house);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await createHouse(form);
      } else {
        await updateHouse(editing.id, form);
      }
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save house.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (house) => {
    if (!window.confirm(`Delete house "${house.name}"?`)) return;
    await deleteHouse(house.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Houses</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New House</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>House</th><th>Color</th><th /></tr></thead>
            <tbody>
              {houses.map((house) => (
                <tr key={house.id}>
                  <td>
                    <span
                      style={{
                        display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                        background: house.colorHex || '#ccc', marginRight: 8, verticalAlign: 'middle',
                      }}
                    />
                    {house.name}
                  </td>
                  <td>{house.colorHex || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(house)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(house)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {houses.length === 0 && <tr><td colSpan={3} className="muted">No houses yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New House' : 'Edit House'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Red House" required />
            </label>
            <label className="field">
              <span>Color</span>
              <input type="color" value={form.colorHex} onChange={(e) => setForm({ ...form, colorHex: e.target.value })} style={{ height: 40, padding: 4 }} />
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
