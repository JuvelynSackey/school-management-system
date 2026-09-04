import { useEffect, useState } from 'react';
import {
  getSchoolSettings, updateSchoolSettings, uploadSchoolLogo, uploadHeadteacherSignature,
} from '../../api/schoolSettings.api';
import { getChannelStatus } from '../../api/notifications.api';
import {
  listPersonalAttributes, createPersonalAttribute, updatePersonalAttribute, deletePersonalAttribute,
} from '../../api/personalAttributes.api';
import { getGradingScheme, updateGradingScheme } from '../../api/gradingScheme.api';
import ImageUploadField from '../../components/common/ImageUploadField';

function SchoolEmblemIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M5 10.5V16c0 1.5 3 3 7 3s7-1.5 7-3v-5.5" />
    </svg>
  );
}

function SignatureIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17.5c2-.5 3-2 4-3.5 1.5-2.3 2.7-6.5 4.3-6.5 1.3 0 1 3 2.2 3 1.5 0 2.7-2.5 4-2.5.9 0 1 1.3 2 1.3.7 0 1-.6 1.5-1.3" />
      <path d="M4 20.5h16" />
    </svg>
  );
}

const emptyForm = {
  name: '', motto: '', address: '', phone: '', email: '', headteacherName: '',
  reportCardFeeGateEnabled: false, performanceChartEnabled: false,
  communicationChannelsEnabled: { email: false, sms: false, whatsapp: false },
  feedingFeeEnabled: false, feedingRatePerDay: 0,
};

const CHANNEL_LABELS = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };

export default function SchoolSettings() {
  const [form, setForm] = useState(emptyForm);
  const [logoUrl, setLogoUrl] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [channelStatus, setChannelStatus] = useState(null);

  useEffect(() => {
    getSchoolSettings()
      .then((data) => {
        setLogoUrl(data.logoUrl || null);
        setSignatureUrl(data.headteacherSignatureUrl || null);
        setForm({
          name: data.name || '', motto: data.motto || '', address: data.address || '',
          phone: data.phone || '', email: data.email || '', headteacherName: data.headteacherName || '',
          reportCardFeeGateEnabled: Boolean(data.reportCardFeeGateEnabled),
          performanceChartEnabled: Boolean(data.performanceChartEnabled),
          communicationChannelsEnabled: {
            email: Boolean(data.communicationChannelsEnabled?.email),
            sms: Boolean(data.communicationChannelsEnabled?.sms),
            whatsapp: Boolean(data.communicationChannelsEnabled?.whatsapp),
          },
          feedingFeeEnabled: Boolean(data.feedingFeeEnabled),
          feedingRatePerDay: data.feedingRatePerDay || 0,
        });
      })
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

            <ImageUploadField
              imageUrl={logoUrl}
              alt="School logo"
              onUploaded={setLogoUrl}
              uploadFn={uploadSchoolLogo}
              resultKey="logoUrl"
              label="Logo"
              fallbackIcon={<SchoolEmblemIcon />}
            />

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

            <h3 style={{ fontSize: 14, margin: '20px 0 8px' }}>Administrative Sign-Off</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              Pre-fills the headteacher signature name when locking terminal reports — an admin can still override it per batch.
            </p>
            <label className="field">
              <span>Headteacher Name</span>
              <input
                value={form.headteacherName}
                onChange={(e) => setForm({ ...form, headteacherName: e.target.value })}
                placeholder="e.g. Mrs. Abena Owusu"
              />
            </label>
            <ImageUploadField
              imageUrl={signatureUrl}
              alt="Headteacher signature"
              onUploaded={setSignatureUrl}
              uploadFn={uploadHeadteacherSignature}
              resultKey="headteacherSignatureUrl"
              label="Signature"
              fallbackIcon={<SignatureIcon />}
            />

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
      <GradingSchemePanel />
    </div>
  );
}

// Mirrors grading.service.js's hardcoded NaCCA SCALE constant — kept as a
// client-side copy purely for the "reset to defaults" button, since this
// national scale is stable reference data, not something worth a dedicated
// endpoint just to fetch it.
const NACCA_DEFAULT_BANDS = [
  { min: 80, grade: 'A1', label: 'Excellent' },
  { min: 70, grade: 'B2', label: 'Very Good' },
  { min: 65, grade: 'B3', label: 'Good' },
  { min: 60, grade: 'C4', label: 'Credit' },
  { min: 55, grade: 'C5', label: 'Credit' },
  { min: 50, grade: 'C6', label: 'Credit' },
  { min: 45, grade: 'D7', label: 'Pass' },
  { min: 40, grade: 'E8', label: 'Pass' },
  { min: 0, grade: 'F9', label: 'Fail' },
];

// GradingScheme is its own model/endpoint (GET/PUT /grading-scheme), not a
// field on SchoolSettings — this panel just lives on the same page for
// admin convenience. Bands only store `min`; the "Upper Bound" column below
// is derived for display (one less than the band above, or the score
// ceiling for the top band) and is never sent back to the server.
function GradingSchemePanel() {
  const [classScoreMax, setClassScoreMax] = useState(50);
  const [examScoreMax, setExamScoreMax] = useState(50);
  const [bands, setBands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setIsLoading(true);
    getGradingScheme()
      .then((data) => {
        setClassScoreMax(data.classScoreMax);
        setExamScoreMax(data.examScoreMax);
        setBands(data.bands);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load grading scheme.'))
      .finally(() => setIsLoading(false));
  };
  useEffect(load, []);

  const sortedBands = [...bands].sort((a, b) => b.min - a.min);

  const updateBand = (index, field, value) => {
    const next = [...bands];
    next[index] = { ...next[index], [field]: value };
    setBands(next);
  };

  const addBand = () => setBands([...bands, { min: 0, grade: '', label: '' }]);
  const removeBand = (index) => setBands(bands.filter((_, i) => i !== index));

  const resetToDefaults = () => {
    setClassScoreMax(50);
    setExamScoreMax(50);
    setBands(NACCA_DEFAULT_BANDS);
    setMessage('Restored NaCCA defaults below — click Save to apply.');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Mirrors the server's own checks (gradingScheme.controller.js) so a
    // mistake surfaces immediately instead of a round trip.
    const cleanBands = bands.map((b) => ({ ...b, min: Number(b.min) }));
    const lowestBand = [...cleanBands].sort((a, b) => a.min - b.min)[0];
    if (!lowestBand || lowestBand.min !== 0) {
      setError('The lowest grade band must start at 0.');
      return;
    }
    const grades = cleanBands.map((b) => b.grade);
    if (new Set(grades).size !== grades.length) {
      setError('Grade codes must be unique.');
      return;
    }
    const mins = cleanBands.map((b) => b.min);
    if (new Set(mins).size !== mins.length) {
      setError('Band minimum scores must be unique.');
      return;
    }

    setIsSaving(true);
    try {
      await updateGradingScheme({
        classScoreMax: Number(classScoreMax), examScoreMax: Number(examScoreMax), bands: cleanBands,
      });
      setMessage('Grading scheme saved.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grading scheme.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="panel" style={{ maxWidth: 640, marginTop: 20 }}>
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Grading Scheme</h3>
        <button type="button" className="link-btn" onClick={resetToDefaults}>Reset to NaCCA Standard Defaults</button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Turns a class score + exam score total into a letter grade everywhere in the app — results entry, report cards, and analytics.
      </p>
      {isLoading && <p className="muted">Loading...</p>}
      {!isLoading && (
        <form onSubmit={handleSave}>
          {error && <div className="alert-error">{error}</div>}
          {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Class Score Max</span>
              <input type="number" min="1" value={classScoreMax} onChange={(e) => setClassScoreMax(e.target.value)} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Exam Score Max</span>
              <input type="number" min="1" value={examScoreMax} onChange={(e) => setExamScoreMax(e.target.value)} />
            </label>
          </div>

          <table style={{ marginBottom: 12 }}>
            <thead>
              <tr><th>Min Score</th><th>Upper Bound</th><th>Grade</th><th>Label</th><th /></tr>
            </thead>
            <tbody>
              {sortedBands.map((band) => {
                const index = bands.indexOf(band);
                const rank = sortedBands.indexOf(band);
                const upperBound = rank === 0
                  ? (Number(classScoreMax) + Number(examScoreMax)) || 100
                  : sortedBands[rank - 1].min - 1;
                return (
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={index}>
                    <td><input type="number" min="0" value={band.min} onChange={(e) => updateBand(index, 'min', e.target.value)} style={{ width: 70 }} /></td>
                    <td className="muted">{upperBound}</td>
                    <td><input value={band.grade} onChange={(e) => updateBand(index, 'grade', e.target.value)} style={{ width: 60 }} /></td>
                    <td><input value={band.label} onChange={(e) => updateBand(index, 'label', e.target.value)} style={{ width: 140 }} /></td>
                    <td><button type="button" className="link-btn" onClick={() => removeBand(index)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="toolbar" style={{ marginBottom: 12 }}>
            <button type="button" className="btn-secondary" onClick={addBand}>+ Add Band</button>
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Grading Scheme'}</button>
        </form>
      )}
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
