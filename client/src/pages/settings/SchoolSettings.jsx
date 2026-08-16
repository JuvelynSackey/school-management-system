import { useEffect, useState } from 'react';
import { getSchoolSettings, updateSchoolSettings } from '../../api/schoolSettings.api';

const emptyForm = { name: '', motto: '', address: '', phone: '', email: '' };

export default function SchoolSettings() {
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getSchoolSettings()
      .then((data) => setForm({
        name: data.name || '', motto: data.motto || '', address: data.address || '',
        phone: data.phone || '', email: data.email || '',
      }))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load school settings.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await updateSchoolSettings(form);
      setMessage('School settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save school settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>School Settings</h1></div>
      <p className="muted" style={{ marginBottom: 16 }}>
        This information appears on the header and footer of generated report cards.
      </p>

      <div className="panel" style={{ maxWidth: 520 }}>
        {isLoading && <p className="muted">Loading...</p>}
        {!isLoading && (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert-error">{error}</div>}
            {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}

            <label className="field">
              <span>School Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ABC International School" />
            </label>
            <label className="field">
              <span>Motto</span>
              <input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} placeholder="e.g. Excellence, Discipline, Integrity" />
            </label>
            <label className="field">
              <span>Address</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. P.O. Box 123, Accra, Ghana" />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>

            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
