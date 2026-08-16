import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api/announcements.api';
import { listClasses } from '../../api/classes.api';
import { listStudents } from '../../api/students.api';

const emptyForm = { message: '', targetType: 'school', targetClassId: '', targetStudentId: '' };

const targetLabel = (a) => {
  if (a.targetType === 'school') return 'Whole School';
  if (a.targetType === 'class') return a.targetClass ? `${a.targetClass.name} ${a.targetClass.section || ''}` : 'Class';
  return a.targetStudent ? `${a.targetStudent.firstName} ${a.targetStudent.lastName}` : 'Student';
};

export default function AnnouncementComposer() {
  const { data: announcements, isLoading, error, reload } = useApiResource(listAnnouncements);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
    listStudents().then(setStudents).catch(() => setStudents([]));
  }, []);

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
          SMS sending isn&apos;t connected yet — messages are logged here and shown on the recipients&apos; in-app notice board.
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
                  <td style={{ maxWidth: 320 }}>{a.message}</td>
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
