import { useEffect, useState } from 'react';
import { getSchoolSettings, updateSchoolSettings } from '../../api/schoolSettings.api';
import { getChannelStatus } from '../../api/notifications.api';
import {
  listPersonalAttributes, createPersonalAttribute, updatePersonalAttribute, deletePersonalAttribute,
} from '../../api/personalAttributes.api';

const emptyForm = {
  name: '', motto: '', address: '', phone: '', email: '', reportCardFeeGateEnabled: false, performanceChartEnabled: false,
  communicationChannelsEnabled: { email: false, sms: false, whatsapp: false },
  feedingFeeEnabled: false, feedingRatePerDay: 0,
};

const CHANNEL_LABELS = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };

export default function SchoolSettings() {
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [channelStatus, setChannelStatus] = useState(null);

  useEffect(() => {
    getSchoolSettings()
      .then((data) => setForm({
        name: data.name || '', motto: data.motto || '', address: data.address || '',
        phone: data.phone || '', email: data.email || '',
        reportCardFeeGateEnabled: Boolean(data.reportCardFeeGateEnabled),
        performanceChartEnabled: Boolean(data.performanceChartEnabled),
        communicationChannelsEnabled: {
          email: Boolean(data.communicationChannelsEnabled?.email),
          sms: Boolean(data.communicationChannelsEnabled?.sms),
          whatsapp: Boolean(data.communicationChannelsEnabled?.whatsapp),
        },
        feedingFeeEnabled: Boolean(data.feedingFeeEnabled),
        feedingRatePerDay: data.feedingRatePerDay || 0,
      }))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load school settings.'))
      .finally(() => setIsLoading(false));
    getChannelStatus().then(setChannelStatus).catch(() => setChannelStatus(null));
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

            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.reportCardFeeGateEnabled}
                onChange={(e) => setForm({ ...form, reportCardFeeGateEnabled: e.target.checked })}
              />
              <span>Require fees to be cleared before parents/students can download a report card</span>
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.performanceChartEnabled}
                onChange={(e) => setForm({ ...form, performanceChartEnabled: e.target.checked })}
              />
              <span>Show a per-subject performance bar chart on report cards</span>
            </label>

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Communication Channels</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              Opt this school into a channel for announcement delivery. Sending still requires the platform provider to be configured.
            </p>
            {['email', 'sms', 'whatsapp'].map((channel) => (
              <label key={channel} className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.communicationChannelsEnabled[channel]}
                  onChange={(e) => setForm({
                    ...form,
                    communicationChannelsEnabled: { ...form.communicationChannelsEnabled, [channel]: e.target.checked },
                  })}
                />
                <span>Enable {CHANNEL_LABELS[channel]}</span>
                {channelStatus && !channelStatus[channel]?.configured && (
                  <span className="badge badge-neutral" style={{ fontSize: 11 }}>Not configured</span>
                )}
              </label>
            ))}

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Feeding / Canteen Fees</h3>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.feedingFeeEnabled}
                onChange={(e) => setForm({ ...form, feedingFeeEnabled: e.target.checked })}
              />
              <span>Enable daily feeding fee collection</span>
            </label>
            <label className="field">
              <span>Rate per day (GH₵)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.feedingRatePerDay}
                onChange={(e) => setForm({ ...form, feedingRatePerDay: Number(e.target.value) })}
              />
            </label>

            <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          </form>
        )}
      </div>

      <PersonalAttributesPanel />
    </div>
  );
}

function PersonalAttributesPanel() {
  const [attributes, setAttributes] = useState([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const load = () => listPersonalAttributes({ includeInactive: 'true' }).then(setAttributes).catch(() => setAttributes([]));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      await createPersonalAttribute({ name: newName.trim(), order: attributes.length });
      setNewName('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add attribute.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (attr) => {
    await updatePersonalAttribute(attr.id, { isActive: !attr.isActive });
    load();
  };

  const remove = async (attr) => {
    if (!window.confirm(`Remove "${attr.name}" from report cards?`)) return;
    await deletePersonalAttribute(attr.id);
    load();
  };

  return (
    <div className="panel" style={{ maxWidth: 520, marginTop: 20 }}>
      <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Personal Attributes</h3>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
        The rows shown on a report card&apos;s Personal Attributes table (e.g. Discipline, Punctuality). Teachers/admins rate each on a fixed scale when submitting or locking a report.
      </p>
      {error && <div className="alert-error">{error}</div>}
      {attributes.map((attr) => (
        <div key={attr.id} className="toolbar" style={{ marginBottom: 8 }}>
          <span style={{ opacity: attr.isActive ? 1 : 0.5 }}>{attr.name}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="link-btn" onClick={() => toggleActive(attr)}>
              {attr.isActive ? 'Disable' : 'Enable'}
            </button>
            <button type="button" className="link-btn" onClick={() => remove(attr)}>Delete</button>
          </div>
        </div>
      ))}
      {attributes.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No attributes configured yet.</p>}
      <form onSubmit={handleAdd} className="toolbar" style={{ marginTop: 12 }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Leadership" />
        <button type="submit" className="btn-secondary" disabled={isSaving}>Add</button>
      </form>
    </div>
  );
}
