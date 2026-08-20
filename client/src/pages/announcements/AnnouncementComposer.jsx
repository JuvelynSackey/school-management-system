import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api/announcements.api';
import { listClasses } from '../../api/classes.api';
import { listStudents } from '../../api/students.api';
import { getChannelStatus } from '../../api/notifications.api';

const emptyForm = {
  message: '', targetType: 'school', targetClassId: '', targetStudentId: '', channels: ['in_app'],
};

const CHANNEL_LABELS = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };

const deliveryLogLabel = (entry) => {
  if (entry.status === 'sent') return `${CHANNEL_LABELS[entry.channel] || entry.channel}: sent to ${entry.recipientCount} guardian(s)`;
  return `${CHANNEL_LABELS[entry.channel] || entry.channel}: not sent (provider not configured) — would have reached ${entry.recipientCount} guardian(s)`;
};

const targetLabel = (a) => {
  if (a.targetType === 'school') return 'Whole School';
  if (a.targetType === 'class') return a.targetClass ? `${a.targetClass.name} ${a.targetClass.section || ''}` : 'Class';
  return a.targetStudent ? `${a.targetStudent.firstName} ${a.targetStudent.lastName}` : 'Student';
};

export default function AnnouncementComposer() {
  const { data: announcements, isLoading, error, reload } = useApiResource(listAnnouncements);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [channelStatus, setChannelStatus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
    listStudents().then(setStudents).catch(() => setStudents([]));
    getChannelStatus().then(setChannelStatus).catch(() => setChannelStatus(null));
  }, []);

  const toggleChannel = (channel) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(channel) ? f.channels.filter((c) => c !== channel) : [...f.channels, channel],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    setMessage('');
    try {
      await createAnnouncement({
        message: form.message,
        targetType: form.targetType,
        targetClassId: form.targetType === 'class' ? form.targetClassId : undefined,
        targetStudentId: form.targetType === 'student' ? form.targetStudentId : undefined,
        channels: form.channels,
      });
      setForm(emptyForm);
      setMessage('Announcement logged.');
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to send announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm('Delete this announcement?')) return;
    await deleteAnnouncement(a.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar"><h1>Announcements</h1></div>

      <div className="panel">
        <h2>New Announcement</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Messages always post to the recipients&apos; in-app notice board. Email/SMS/WhatsApp delivery is logged here too, but won&apos;t actually send until a provider is connected.
        </p>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error">{formError}</div>}
          {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}
          <label className="field">
            <span>Message</span>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="e.g. PTA Meeting this Friday at 3:00 PM"
              required
              maxLength={1000}
            />
          </label>
          <label className="field">
            <span>Send to</span>
            <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })}>
              <option value="school">Whole School</option>
              <option value="class">A Specific Class</option>
              <option value="student">A Specific Student</option>
            </select>
          </label>
          {form.targetType === 'class' && (
            <label className="field">
              <span>Class</span>
              <select value={form.targetClassId} onChange={(e) => setForm({ ...form, targetClassId: e.target.value })} required>
                <option value="">Select a class...</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
          )}
          {form.targetType === 'student' && (
            <label className="field">
              <span>Student</span>
              <select value={form.targetStudentId} onChange={(e) => setForm({ ...form, targetStudentId: e.target.value })} required>
                <option value="">Select a student...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNo})</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span>Also deliver via</span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked disabled />
                In-App
              </label>
              {['email', 'sms', 'whatsapp'].map((channel) => (
                <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.channels.includes(channel)}
                    onChange={() => toggleChannel(channel)}
                  />
                  {CHANNEL_LABELS[channel]}
                  {channelStatus && !channelStatus[channel]?.configured && (
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>Not configured</span>
                  )}
                </label>
              ))}
            </div>
          </label>
          <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Sending...' : 'Send'}</button>
        </form>
      </div>

      <div className="panel">
        <h2>History</h2>
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>Message</th><th>Target</th><th>Category</th><th>Sent By</th><th>Date</th><th /></tr></thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td style={{ maxWidth: 320 }}>
                    {a.message}
                    {a.deliveryLog?.length > 0 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {a.deliveryLog.map((entry) => <div key={entry.channel}>{deliveryLogLabel(entry)}</div>)}
                      </div>
                    )}
                  </td>
                  <td>{targetLabel(a)}</td>
                  <td>{a.category === 'fee_reminder' ? <span className="badge badge-warning">Fee Reminder</span> : <span className="badge badge-neutral">General</span>}</td>
                  <td>{a.creator?.fullName || '—'}</td>
                  <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                  <td><button type="button" className="link-btn danger" onClick={() => handleDelete(a)}>Delete</button></td>
                </tr>
              ))}
              {announcements.length === 0 && <tr><td colSpan={6} className="muted">No announcements sent yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
