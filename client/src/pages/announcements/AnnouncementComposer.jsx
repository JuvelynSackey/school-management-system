import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api/announcements.api';
import { listClasses } from '../../api/classes.api';
import { listStudents } from '../../api/students.api';
import { listTeachers } from '../../api/teachers.api';
import { listGuardians } from '../../api/guardians.api';
import { getChannelStatus } from '../../api/notifications.api';
import { composeAnnouncement } from '../../api/ai.api';

const emptyForm = {
  message: '',
  targetType: 'school',
  targetClassId: '',
  targetStudentId: '',
  targetClassIds: [],
  targetTeacherIds: [],
  targetStudentIds: [],
  targetGuardianIds: [],
  channels: ['in_app'],
  sendMode: 'now', // 'now' | 'later'
  scheduledFor: '',
};

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'urgent', label: 'Urgent' },
];

const TEMPLATES = [
  { key: 'staff_meeting', label: 'Staff Meeting', text: 'Reminder: staff meeting on [date] at [time] in [location]. Attendance is required.' },
  { key: 'exam_reminder', label: 'Exam Reminder', text: 'Reminder: the [subject] exam is scheduled for [date] at [time]. Please ensure students arrive prepared and on time.' },
  { key: 'fee_notice', label: 'Fee Notice', text: 'This is a reminder that school fees for the current term are due on [date]. Please settle outstanding balances promptly to avoid disruption.' },
];

const CHANNEL_LABELS = { email: 'Email' };

const MULTI_TARGET_FIELD = {
  specific_teachers: 'targetTeacherIds',
  specific_students: 'targetStudentIds',
  specific_parents: 'targetGuardianIds',
  specific_classes: 'targetClassIds',
};

const deliveryLogLabel = (entry) => {
  if (entry.status === 'sent') return `${CHANNEL_LABELS[entry.channel] || entry.channel}: sent to ${entry.recipientCount} guardian(s)`;
  return `${CHANNEL_LABELS[entry.channel] || entry.channel}: not sent (provider not configured) — would have reached ${entry.recipientCount} guardian(s)`;
};

const TARGET_LABELS = {
  school: 'Whole School',
  all_teachers: 'All Teachers',
  all_parents: 'All Parents',
};

const targetLabel = (a) => {
  if (TARGET_LABELS[a.targetType]) return TARGET_LABELS[a.targetType];
  if (a.targetType === 'class') return a.targetClass ? `${a.targetClass.name} ${a.targetClass.section || ''}` : 'Class';
  if (a.targetType === 'student') return a.targetStudent ? `${a.targetStudent.firstName} ${a.targetStudent.lastName}` : 'Student';
  if (a.targetType === 'specific_classes') return `${a.targetClassIds?.length || 0} class(es)`;
  if (a.targetType === 'specific_teachers') return `${a.targetTeacherIds?.length || 0} teacher(s)`;
  if (a.targetType === 'specific_students') return `${a.targetStudentIds?.length || 0} student(s)`;
  if (a.targetType === 'specific_parents') return `${a.targetGuardianIds?.length || 0} parent(s)`;
  return a.targetType;
};

const selectedOptions = (e) => [...e.target.selectedOptions].map((o) => o.value);

export default function AnnouncementComposer() {
  const { data: announcements, isLoading, error, reload } = useApiResource(listAnnouncements);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [channelStatus, setChannelStatus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [aiObjective, setAiObjective] = useState('');
  const [aiTone, setAiTone] = useState('friendly');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiFallbackMode, setAiFallbackMode] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
    listStudents().then(setStudents).catch(() => setStudents([]));
    listTeachers().then(setTeachers).catch(() => setTeachers([]));
    listGuardians().then(setGuardians).catch(() => setGuardians([]));
    getChannelStatus().then(setChannelStatus).catch(() => setChannelStatus(null));
  }, []);

  // Only ever fills the Message textarea below — never posts anything on
  // its own. The admin still reviews, can edit, and explicitly clicks Send.
  const handleDraftWithAI = async () => {
    if (!aiObjective.trim()) { setDraftError('Describe what the announcement is about first.'); return; }
    setIsDrafting(true);
    setDraftError('');
    setAiSuggestions(null);
    try {
      const { suggestions, fallbackMode } = await composeAnnouncement({
        objective: aiObjective,
        tone: aiTone,
        targetType: form.targetType,
        targetClassId: form.targetType === 'class' ? form.targetClassId : undefined,
      });
      setAiSuggestions(suggestions);
      setAiFallbackMode(Boolean(fallbackMode));
    } catch (err) {
      setDraftError(err.response?.data?.message || 'Could not draft a suggestion right now.');
    } finally {
      setIsDrafting(false);
    }
  };

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
      const multiField = MULTI_TARGET_FIELD[form.targetType];
      await createAnnouncement({
        message: form.message,
        targetType: form.targetType,
        targetClassId: form.targetType === 'class' ? form.targetClassId : undefined,
        targetStudentId: form.targetType === 'student' ? form.targetStudentId : undefined,
        ...(multiField ? { [multiField]: form[multiField] } : {}),
        channels: form.channels,
        scheduledFor: form.sendMode === 'later' && form.scheduledFor ? new Date(form.scheduledFor).toISOString() : undefined,
      });
      setForm(emptyForm);
      setMessage(form.sendMode === 'later' ? 'Announcement scheduled.' : 'Announcement sent.');
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

  const multiField = MULTI_TARGET_FIELD[form.targetType];

  return (
    <div>
      <div className="toolbar"><h1>Announcements</h1></div>

      <div className="panel">
        <h2>New Announcement</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Messages always post to the recipients&apos; in-app notice board. Email delivery is logged here too, but won&apos;t actually send until a provider is connected.
        </p>
        <form onSubmit={handleSubmit}>
          {formError && <div className="alert-error">{formError}</div>}
          {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}

          <div className="panel" style={{ background: 'var(--bg)', marginBottom: 16 }}>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>✨ Draft with AI — describe what it&apos;s about, pick a tone, and get 3 ready-to-edit options below.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label className="field" style={{ flex: '1 1 240px', marginBottom: 0 }}>
                <span>What&apos;s this about?</span>
                <input
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  placeholder="e.g. PTA meeting this Friday at 3pm in the assembly hall"
                  maxLength={300}
                />
              </label>
              <label className="field" style={{ flex: '0 1 140px', marginBottom: 0 }}>
                <span>Tone</span>
                <select value={aiTone} onChange={(e) => setAiTone(e.target.value)}>
                  {TONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <button type="button" className="btn-secondary" onClick={handleDraftWithAI} disabled={isDrafting}>
                {isDrafting ? 'Drafting…' : '✨ Draft with AI'}
              </button>
            </div>
            {draftError && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>{draftError}</p>}
            {aiSuggestions && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {aiFallbackMode && (
                  <span className="badge badge-neutral" style={{ alignSelf: 'flex-start', fontSize: 11 }}>
                    ⚡ JesManage Intelligence (Rule-Based Fallback Mode)
                  </span>
                )}
                {aiSuggestions.map((s, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className="panel" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <p style={{ fontSize: 13, margin: 0, flex: 1 }}>{s}</p>
                    <button type="button" className="btn-secondary" style={{ flexShrink: 0 }} onClick={() => { setForm((f) => ({ ...f, message: s })); setAiSuggestions(null); }}>
                      Use
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
          <div className="toolbar" style={{ marginBottom: 16, marginTop: -8, justifyContent: 'flex-start', gap: 8 }}>
            <span className="muted" style={{ fontSize: 13 }}>Templates:</span>
            {TEMPLATES.map((t) => (
              <button key={t.key} type="button" className="link-btn" onClick={() => setForm((f) => ({ ...f, message: t.text }))}>{t.label}</button>
            ))}
          </div>

          <label className="field">
            <span>Send to</span>
            <select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })}>
              <option value="school">Whole School</option>
              <option value="class">A Specific Class</option>
              <option value="student">A Specific Student</option>
              <option value="all_teachers">All Teachers</option>
              <option value="all_parents">All Parents</option>
              <option value="specific_classes">Specific Classes</option>
              <option value="specific_teachers">Specific Teachers</option>
              <option value="specific_students">Specific Students</option>
              <option value="specific_parents">Specific Parents</option>
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
          {form.targetType === 'specific_classes' && (
            <label className="field">
              <span>Classes (ctrl/cmd-click to select multiple)</span>
              <select multiple size={5} value={form.targetClassIds} onChange={(e) => setForm({ ...form, targetClassIds: selectedOptions(e) })} required>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
          )}
          {form.targetType === 'specific_teachers' && (
            <label className="field">
              <span>Teachers (ctrl/cmd-click to select multiple)</span>
              <select multiple size={5} value={form.targetTeacherIds} onChange={(e) => setForm({ ...form, targetTeacherIds: selectedOptions(e) })} required>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </label>
          )}
          {form.targetType === 'specific_students' && (
            <label className="field">
              <span>Students (ctrl/cmd-click to select multiple)</span>
              <select multiple size={5} value={form.targetStudentIds} onChange={(e) => setForm({ ...form, targetStudentIds: selectedOptions(e) })} required>
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.admissionNo})</option>)}
              </select>
            </label>
          )}
          {form.targetType === 'specific_parents' && (
            <label className="field">
              <span>Parents (ctrl/cmd-click to select multiple)</span>
              <select multiple size={5} value={form.targetGuardianIds} onChange={(e) => setForm({ ...form, targetGuardianIds: selectedOptions(e) })} required>
                {guardians.map((g) => <option key={g.id} value={g.id}>{g.fullName}</option>)}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={form.channels.includes('email')} onChange={() => toggleChannel('email')} />
                Email
                {channelStatus && !channelStatus.email?.configured && (
                  <span className="badge badge-neutral" style={{ fontSize: 11 }}>Not configured</span>
                )}
              </label>
            </div>
          </label>

          <label className="field">
            <span>When</span>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="radio" name="sendMode" checked={form.sendMode === 'now'} onChange={() => setForm({ ...form, sendMode: 'now' })} />
                Send now
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="radio" name="sendMode" checked={form.sendMode === 'later'} onChange={() => setForm({ ...form, sendMode: 'later' })} />
                Schedule for later
              </label>
            </div>
            {form.sendMode === 'later' && (
              <input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                required
              />
            )}
          </label>

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Sending...' : (form.sendMode === 'later' ? 'Schedule' : 'Send')}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>History</h2>
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>Message</th><th>Target</th><th>Category</th><th>Status</th><th>Read</th><th>Sent By</th><th>Date</th><th /></tr></thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.message}
                    {a.deliveryLog?.length > 0 && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {a.deliveryLog.map((entry) => <div key={entry.channel}>{deliveryLogLabel(entry)}</div>)}
                      </div>
                    )}
                  </td>
                  <td>{targetLabel(a)}</td>
                  <td>{a.category === 'fee_reminder' ? <span className="badge badge-warning">Fee Reminder</span> : <span className="badge badge-neutral">General</span>}</td>
                  <td>
                    {a.status === 'scheduled' ? (
                      <span className="badge badge-warning" title={a.scheduledFor ? new Date(a.scheduledFor).toLocaleString() : ''}>Scheduled</span>
                    ) : (
                      <span className="badge badge-success">Sent</span>
                    )}
                  </td>
                  <td>{a.totalRecipients > 0 ? `${a.readCount}/${a.totalRecipients} read` : '—'}</td>
                  <td>{a.creator?.fullName || '—'}</td>
                  <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                  <td><button type="button" className="link-btn danger" onClick={() => handleDelete(a)}>Delete</button></td>
                </tr>
              ))}
              {announcements.length === 0 && <tr><td colSpan={8} className="muted">No announcements sent yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
