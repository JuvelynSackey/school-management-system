import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useApiResource from '../../hooks/useApiResource';
import {
  listAssessments, createAssessment, updateAssessment, deleteAssessment,
} from '../../api/assessments.api';
import { listQuestions } from '../../api/questionBank.api';
import { listSubjects } from '../../api/subjects.api';
import { listClasses } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import { getGradingScheme } from '../../api/gradingScheme.api';
import Modal from '../../components/common/Modal';

const ASSESSMENT_TYPES = [
  { value: 'classwork', label: 'Classwork' },
  { value: 'homework', label: 'Homework' },
  { value: 'project', label: 'Project' },
  { value: 'midterm', label: 'Mid-Term' },
  { value: 'exam', label: 'Examination' },
  { value: 'other', label: 'Other' },
];
const RELEASE_OPTIONS = [
  { value: 'immediately', label: 'Immediately on submission' },
  { value: 'after_review', label: 'After teacher review' },
  { value: 'scheduled', label: 'On a scheduled date' },
  { value: 'manual', label: 'Only when manually released' },
];
const DIFFICULTIES = ['Easy', 'Medium', 'Difficult'];

const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromDatetimeLocal = (value) => (value ? new Date(value).toISOString() : undefined);

const emptyForm = {
  title: '',
  subjectId: '',
  classId: '',
  academicTermId: '',
  instructions: '',
  assessmentType: 'classwork',
  classScoreComponentKey: '',
  questionIds: [],
  selectedQuestions: [],
  startAt: '',
  endAt: '',
  durationMinutes: '',
  maxAttempts: 1,
  randomizeQuestions: false,
  randomizeOptions: false,
  allowBacktracking: true,
  autoSubmitOnTimeUp: true,
  resultRelease: 'after_review',
  resultReleaseAt: '',
};

const statusBadge = (status) => {
  if (status === 'Published') return <span className="badge badge-success">Published</span>;
  if (status === 'Closed') return <span className="badge badge-neutral">Closed</span>;
  return <span className="badge badge-warning">Draft</span>;
};

const buildPayload = (form, status) => ({
  title: form.title,
  subjectId: form.subjectId,
  classId: form.classId,
  academicTermId: form.academicTermId,
  instructions: form.instructions || undefined,
  assessmentType: form.assessmentType,
  classScoreComponentKey: form.classScoreComponentKey || undefined,
  questionIds: form.questionIds,
  startAt: fromDatetimeLocal(form.startAt),
  endAt: fromDatetimeLocal(form.endAt),
  durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
  maxAttempts: Number(form.maxAttempts) || 1,
  randomizeQuestions: form.randomizeQuestions,
  randomizeOptions: form.randomizeOptions,
  allowBacktracking: form.allowBacktracking,
  autoSubmitOnTimeUp: form.autoSubmitOnTimeUp,
  resultRelease: form.resultRelease,
  resultReleaseAt: form.resultRelease === 'scheduled' ? fromDatetimeLocal(form.resultReleaseAt) : undefined,
  status,
});

export default function AssessmentBuilder() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [gradingScheme, setGradingScheme] = useState(null);
  const {
    data: assessments, isLoading, error, reload,
  } = useApiResource(listAssessments);
  const [editing, setEditing] = useState(null); // null | 'new' | assessment object
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [listError, setListError] = useState('');

  const [pickerFilters, setPickerFilters] = useState({
    subjectId: '', classId: '', difficulty: '', type: '',
  });
  const [availableQuestions, setAvailableQuestions] = useState([]);

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => setSubjects([]));
    listClasses().then(setClasses).catch(() => setClasses([]));
    listTerms().then(setTerms).catch(() => setTerms([]));
    getGradingScheme().then(setGradingScheme).catch(() => setGradingScheme(null));
  }, []);

  useEffect(() => {
    if (!editing) return;
    listQuestions(pickerFilters).then(setAvailableQuestions).catch(() => setAvailableQuestions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, pickerFilters.subjectId, pickerFilters.classId, pickerFilters.difficulty, pickerFilters.type]);

  const openNew = () => {
    setForm(emptyForm);
    setPickerFilters({
      subjectId: '', classId: '', difficulty: '', type: '',
    });
    setFormError('');
    setEditing('new');
  };

  const openEdit = (a) => {
    setForm({
      title: a.title,
      subjectId: a.subjectId,
      classId: a.classId,
      academicTermId: a.academicTermId,
      instructions: a.instructions || '',
      assessmentType: a.assessmentType,
      classScoreComponentKey: a.classScoreComponentKey || '',
      questionIds: [...(a.questionIds || [])],
      selectedQuestions: a.questions || [],
      startAt: toDatetimeLocal(a.startAt),
      endAt: toDatetimeLocal(a.endAt),
      durationMinutes: a.durationMinutes || '',
      maxAttempts: a.maxAttempts || 1,
      randomizeQuestions: Boolean(a.randomizeQuestions),
      randomizeOptions: Boolean(a.randomizeOptions),
      allowBacktracking: a.allowBacktracking !== false,
      autoSubmitOnTimeUp: a.autoSubmitOnTimeUp !== false,
      resultRelease: a.resultRelease,
      resultReleaseAt: toDatetimeLocal(a.resultReleaseAt),
    });
    setPickerFilters({
      subjectId: a.subjectId || '', classId: a.classId || '', difficulty: '', type: '',
    });
    setFormError('');
    setEditing(a);
  };

  const close = () => setEditing(null);

  const addQuestion = (q) => {
    if (form.questionIds.includes(q.id)) return;
    setForm((f) => ({ ...f, questionIds: [...f.questionIds, q.id], selectedQuestions: [...f.selectedQuestions, q] }));
  };
  const removeQuestion = (id) => {
    setForm((f) => ({
      ...f,
      questionIds: f.questionIds.filter((qid) => qid !== id),
      selectedQuestions: f.selectedQuestions.filter((sq) => sq.id !== id),
    }));
  };

  const totalMarks = form.selectedQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const componentsForScheme = gradingScheme?.classScoreConfig?.enabled ? (gradingScheme.classScoreConfig.components || []) : [];

  const handleSave = async (status) => {
    setIsSaving(true);
    setFormError('');
    try {
      const payload = buildPayload(form, status);
      if (editing === 'new') await createAssessment(payload);
      else await updateAssessment(editing.id, payload);
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save assessment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete assessment "${a.title}"?`)) return;
    setListError('');
    try {
      await deleteAssessment(a.id);
      reload();
    } catch (err) {
      setListError(err.response?.data?.message || 'Failed to delete assessment.');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Assessments</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Assessment</button>
      </div>

      <div className="panel">
        {error && <div className="alert-error">{error}</div>}
        {listError && <div className="alert-error">{listError}</div>}
        {isLoading && <p className="muted">Loading...</p>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Subject</th><th>Class</th><th>Term</th><th>Type</th><th>Questions</th><th>Marks</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.subject?.name || '—'}</td>
                  <td>{a.class ? `${a.class.name} ${a.class.section || ''}` : '—'}</td>
                  <td>{a.academicTerm?.name || '—'}</td>
                  <td>{ASSESSMENT_TYPES.find((t) => t.value === a.assessmentType)?.label || a.assessmentType}</td>
                  <td>{(a.questions || []).length}</td>
                  <td>{(a.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0)}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(a)}>Edit</button>
                      {a.status !== 'Draft' && (
                        <button type="button" className="link-btn" onClick={() => navigate(`/assessments/${a.id}/grade`)}>Review Submissions</button>
                      )}
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(a)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr><td colSpan={9} className="muted">No assessments yet — click New Assessment.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Assessment' : 'Edit Assessment'} onClose={close} wide>
          <form onSubmit={(e) => { e.preventDefault(); handleSave('Draft'); }}>
            {formError && <div className="alert-error">{formError}</div>}

            <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Basic Information</h3>
            <label className="field">
              <span>Title</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label className="field">
              <span>Subject</span>
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                <option value="">Select a subject...</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Class</span>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                <option value="">Select a class...</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Academic Term</span>
              <select value={form.academicTermId} onChange={(e) => setForm({ ...form, academicTermId: e.target.value })} required>
                <option value="">Select a term...</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Instructions (optional)</span>
              <textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </label>
            <label className="field">
              <span>Assessment Type</span>
              <select value={form.assessmentType} onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}>
                {ASSESSMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            {componentsForScheme.length > 0 && (
              <label className="field">
                <span>Feeds Class Score Component (optional)</span>
                <select value={form.classScoreComponentKey} onChange={(e) => setForm({ ...form, classScoreComponentKey: e.target.value })}>
                  <option value="">Not linked</option>
                  {componentsForScheme.map((c) => <option key={c.key} value={c.key}>{c.label} (max {c.maxMarks})</option>)}
                </select>
              </label>
            )}

            <h3 style={{ fontSize: 14, margin: '16px 0 10px' }}>Questions</h3>
            <div className="toolbar" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
              <select value={pickerFilters.subjectId} onChange={(e) => setPickerFilters({ ...pickerFilters, subjectId: e.target.value })}>
                <option value="">All Subjects</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={pickerFilters.classId} onChange={(e) => setPickerFilters({ ...pickerFilters, classId: e.target.value })}>
                <option value="">All Classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
              <select value={pickerFilters.difficulty} onChange={(e) => setPickerFilters({ ...pickerFilters, difficulty: e.target.value })}>
                <option value="">All Difficulties</option>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="panel" style={{ background: 'var(--bg)', marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
              {availableQuestions.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>No matching questions in the bank.</p>}
              {availableQuestions.map((q) => (
                <div key={q.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}
                >
                  <span style={{ fontSize: 13 }}>{q.topic} <span className="muted" style={{ fontSize: 11.5 }}>({q.type}, {q.marks} marks)</span></span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                    disabled={form.questionIds.includes(q.id)}
                    onClick={() => addQuestion(q)}
                  >
                    {form.questionIds.includes(q.id) ? 'Added' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
              Selected Questions ({form.selectedQuestions.length}) — Total Marks: {totalMarks}
            </p>
            <div className="panel" style={{ marginBottom: 16 }}>
              {form.selectedQuestions.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>No questions selected yet.</p>}
              {form.selectedQuestions.map((q) => (
                <div key={q.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)',
                }}
                >
                  <span style={{ fontSize: 13 }}>{q.topic} <span className="muted" style={{ fontSize: 11.5 }}>({q.type}, {q.marks} marks)</span></span>
                  <button type="button" className="link-btn danger" onClick={() => removeQuestion(q.id)}>Remove</button>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 14, margin: '16px 0 10px' }}>Configuration</h3>
            <label className="field">
              <span>Start</span>
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            </label>
            <label className="field">
              <span>End</span>
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </label>
            <label className="field">
              <span>Duration in minutes (blank = untimed)</span>
              <input type="number" min={1} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            </label>
            <label className="field">
              <span>Max Attempts</span>
              <input type="number" min={1} value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })} />
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.randomizeQuestions} onChange={(e) => setForm({ ...form, randomizeQuestions: e.target.checked })} />
              <span>Randomize question order</span>
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.randomizeOptions} onChange={(e) => setForm({ ...form, randomizeOptions: e.target.checked })} />
              <span>Randomize answer option order</span>
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.allowBacktracking} onChange={(e) => setForm({ ...form, allowBacktracking: e.target.checked })} />
              <span>Allow going back to previous questions</span>
            </label>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.autoSubmitOnTimeUp} onChange={(e) => setForm({ ...form, autoSubmitOnTimeUp: e.target.checked })} />
              <span>Auto-submit when time is up</span>
            </label>

            <h3 style={{ fontSize: 14, margin: '16px 0 10px' }}>Result Release</h3>
            <div className="field">
              {RELEASE_OPTIONS.map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <input
                    type="radio"
                    name="resultRelease"
                    checked={form.resultRelease === opt.value}
                    onChange={() => setForm({ ...form, resultRelease: opt.value })}
                  />
                  {opt.label}
                </label>
              ))}
              {form.resultRelease === 'scheduled' && (
                <input
                  type="datetime-local"
                  value={form.resultReleaseAt}
                  onChange={(e) => setForm({ ...form, resultReleaseAt: e.target.value })}
                  style={{ marginTop: 6 }}
                />
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="button" className="btn-secondary" disabled={isSaving} onClick={() => handleSave('Draft')}>
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="button" className="btn-primary" disabled={isSaving} onClick={() => handleSave('Published')}>
                {isSaving ? 'Saving...' : 'Publish'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
