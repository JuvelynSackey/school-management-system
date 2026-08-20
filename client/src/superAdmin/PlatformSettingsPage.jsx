import { useEffect, useState } from 'react';
import { getPlatformSettings, updatePlatformSettings } from './api';

const emptyForm = {
  maintenanceEnabled: false,
  maintenanceMessage: '',
  minPasswordLength: 8,
};

export default function PlatformSettingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getPlatformSettings()
      .then((data) => setForm({
        maintenanceEnabled: Boolean(data.maintenanceMode?.enabled),
        maintenanceMessage: data.maintenanceMode?.message || '',
        minPasswordLength: data.minPasswordLength || 8,
      }))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load platform settings.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await updatePlatformSettings({
        maintenanceMode: { enabled: form.maintenanceEnabled, message: form.maintenanceMessage },
        minPasswordLength: form.minPasswordLength,
      });
      setMessage('Platform settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save platform settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Platform Settings</h1></div>

      <div className="panel" style={{ maxWidth: 560 }}>
        {isLoading && <p className="muted">Loading...</p>}
        {!isLoading && (
          <form onSubmit={handleSubmit}>
            {error && <div className="alert-error">{error}</div>}
            {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}

            <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Maintenance Mode</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              When enabled, no new school logins are accepted (existing sessions are unaffected). Super-admin login always still works.
            </p>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.maintenanceEnabled}
                onChange={(e) => setForm({ ...form, maintenanceEnabled: e.target.checked })}
              />
              <span>Enable maintenance mode</span>
            </label>
            <label className="field">
              <span>Message shown to blocked logins</span>
              <textarea
                rows={2}
                value={form.maintenanceMessage}
                onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })}
              />
            </label>

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Password Policy</h3>
            <label className="field">
              <span>Minimum password length</span>
              <input
                type="number"
                min={6}
                max={32}
                value={form.minPasswordLength}
                onChange={(e) => setForm({ ...form, minPasswordLength: Number(e.target.value) })}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
