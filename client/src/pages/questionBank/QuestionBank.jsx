import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import {
  listQuestions, createQuestion, updateQuestion, deleteQuestion,
} from '../../api/questionBank.api';
import { listSubjects } from '../../api/subjects.api';
import { listClasses } from '../../api/classes.api';
import Modal from '../../components/common/Modal';

const TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'multi_select', label: 'Multiple Select' },
  { value: 'matching', label: 'Matching' },
  { value: 'ordering', label: 'Ordering' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
  { value: 'essay', label: 'Essay' },
  { value: 'file_upload', label: 'File Upload' },
];
const TYPE_LABELS = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));
const DIFFICULTIES = ['Easy', 'Medium', 'Difficult'];

const emptyForm = {
  subjectId: '',
  classId: '',
  topic: '',
  curriculumStrand: '',
  curriculumSubStrand: '',
  learningObjective: '',
  difficulty: 'Medium',
  type: 'mcq',
  marks: 1,
  promptText: '',
  modelAnswer: '',
  options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
  correctBoolean: true,
  matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }],
  orderItems: ['', ''],
  blanks: [{ acceptedAnswersText: '' }],
};

const resetTypeFields = (type) => ({
  type,
  options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
  correctBoolean: true,
  matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }],
  orderItems: ['', ''],
  blanks: [{ acceptedAnswersText: '' }],
});

const buildPayload = (form) => {
  const base = {
    subjectId: form.subjectId,
    classId: form.classId || undefined,
    topic: form.topic,
    curriculumStrand: form.curriculumStrand || undefined,
    curriculumSubStrand: form.curriculumSubStrand || undefined,
    learningObjective: form.learningObjective || undefined,
    difficulty: form.difficulty,
    type: form.type,
    marks: Number(form.marks),
    promptText: form.promptText,
    modelAnswer: form.modelAnswer || undefined,
  };
  if (form.type === 'mcq' || form.type === 'multi_select') return { ...base, options: form.options };
  if (form.type === 'true_false') return { ...base, correctBoolean: form.correctBoolean };
  if (form.type === 'matching') return { ...base, matchingPairs: form.matchingPairs };
  if (form.type === 'ordering') return { ...base, orderItems: form.orderItems };
  if (form.type === 'fill_in_blank') {
    return {
      ...base,
      blanks: form.blanks.map((b) => ({
        acceptedAnswers: b.acceptedAnswersText.split(',').map((a) => a.trim()).filter(Boolean),
      })),
    };
  }
  return base; // essay, file_upload
};

export default function QuestionBank() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    subjectId: '', classId: '', difficulty: '', type: '',
  });
  const {
    data: questions, isLoading, error, reload,
  } = useApiResource(
    () => listQuestions(filters),
    [filters.subjectId, filters.classId, filters.difficulty, filters.type],
  );
  const [editing, setEditing] = useState(null); // null | 'new' | question object
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => setSubjects([]));
    listClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  const openNew = () => { setForm(emptyForm); setFormError(''); setEditing('new'); };

  const openEdit = (q) => {
    const isTrueFalse = q.type === 'true_false';
    setForm({
      subjectId: q.subjectId || '',
      classId: q.classId || '',
      topic: q.topic || '',
      curriculumStrand: q.curriculumStrand || '',
      curriculumSubStrand: q.curriculumSubStrand || '',
      learningObjective: q.learningObjective || '',
      difficulty: q.difficulty,
      type: q.type,
      marks: q.marks,
      promptText: q.promptText || '',
      modelAnswer: q.modelAnswer || '',
      options: (q.type === 'mcq' || q.type === 'multi_select') && q.options?.length ? q.options : emptyForm.options,
      correctBoolean: isTrueFalse ? Boolean(q.options?.find((o) => o.text === 'True')?.isCorrect) : true,
      matchingPairs: q.matchingPairs?.length ? q.matchingPairs : emptyForm.matchingPairs,
      orderItems: q.orderItems?.length ? q.orderItems : emptyForm.orderItems,
      blanks: q.blanks?.length
        ? q.blanks.map((b) => ({ acceptedAnswersText: (b.acceptedAnswers || []).join(', ') }))
        : emptyForm.blanks,
    });
    setFormError('');
    setEditing(q);
  };

  const close = () => setEditing(null);

  const handleTypeChange = (newType) => {
    setForm((f) => ({ ...f, ...resetTypeFields(newType) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = buildPayload(form);
      if (editing === 'new') await createQuestion(payload);
      else await updateQuestion(editing.id, payload);
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save question.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm('Delete this question?')) return;
    setListError('');
    try {
      await deleteQuestion(q.id);
      reload();
    } catch (err) {
      setListError(err.response?.data?.message || 'Failed to delete question.');
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Question Bank</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Question</button>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={filters.subjectId} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All Types</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {listError && <div className="alert-error">{listError}</div>}
        {isLoading && <p className="muted">Loading...</p>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr>
                <th>Topic</th><th>Subject</th><th>Class</th><th>Type</th><th>Difficulty</th><th>Marks</th><th>Created By</th><th />
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td>{q.topic}</td>
                  <td>{q.subject?.name || '—'}</td>
                  <td>{q.class ? `${q.class.name} ${q.class.section || ''}` : 'Any'}</td>
                  <td>{TYPE_LABELS[q.type] || q.type}</td>
                  <td>{q.difficulty}</td>
                  <td>{q.marks}</td>
                  <td>{q.creator ? `${q.creator.firstName} ${q.creator.lastName}` : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => openEdit(q)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(q)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {questions.length === 0 && (
                <tr><td colSpan={8} className="muted">No questions yet — click New Question.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Question' : 'Edit Question'} onClose={close} wide>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}

            <label className="field">
              <span>Subject</span>
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                <option value="">Select a subject...</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Class (optional — leave blank to reuse across every class taking this subject)</span>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">Any class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Topic</span>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required />
            </label>
            <label className="field">
              <span>Curriculum Strand</span>
              <input value={form.curriculumStrand} onChange={(e) => setForm({ ...form, curriculumStrand: e.target.value })} />
            </label>
            <label className="field">
              <span>Curriculum Sub-Strand</span>
              <input value={form.curriculumSubStrand} onChange={(e) => setForm({ ...form, curriculumSubStrand: e.target.value })} />
            </label>
            <label className="field">
              <span>Learning Objective</span>
              <input value={form.learningObjective} onChange={(e) => setForm({ ...form, learningObjective: e.target.value })} />
            </label>
            <label className="field">
              <span>Difficulty</span>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Question Type</span>
              <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Marks</span>
              <input type="number" min={1} value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} required />
            </label>
            <label className="field">
              <span>Question Text</span>
              <textarea rows={3} value={form.promptText} onChange={(e) => setForm({ ...form, promptText: e.target.value })} required />
            </label>

            {(form.type === 'mcq' || form.type === 'multi_select') && (
              <div className="field">
                <span>Options {form.type === 'mcq' ? '(select the one correct answer)' : '(select every correct answer)'}</span>
                {form.options.map((opt, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6,
                  }}
                  >
                    <input
                      type={form.type === 'mcq' ? 'radio' : 'checkbox'}
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        options: f.options.map((o, idx) => {
                          if (idx !== i) return form.type === 'mcq' ? { ...o, isCorrect: false } : o;
                          return { ...o, isCorrect: e.target.checked };
                        }),
                      }))}
                    />
                    <input
                      value={opt.text}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        options: f.options.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)),
                      }))}
                      placeholder={`Option ${i + 1}`}
                      style={{ flex: 1 }}
                    />
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        className="link-btn danger"
                        onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 12.5 }}
                  onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}
                >
                  Add Option
                </button>
              </div>
            )}

            {form.type === 'true_false' && (
              <label className="field">
                <span>Correct Answer</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="tfCorrect" checked={form.correctBoolean === true} onChange={() => setForm({ ...form, correctBoolean: true })} />
                    True
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="radio" name="tfCorrect" checked={form.correctBoolean === false} onChange={() => setForm({ ...form, correctBoolean: false })} />
                    False
                  </label>
                </div>
              </label>
            )}

            {form.type === 'matching' && (
              <div className="field">
                <span>Matching Pairs</span>
                {form.matchingPairs.map((pair, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={pair.left}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        matchingPairs: f.matchingPairs.map((p, idx) => (idx === i ? { ...p, left: e.target.value } : p)),
                      }))}
                      placeholder="Left item"
                      style={{ flex: 1 }}
                    />
                    <input
                      value={pair.right}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        matchingPairs: f.matchingPairs.map((p, idx) => (idx === i ? { ...p, right: e.target.value } : p)),
                      }))}
                      placeholder="Matching answer"
                      style={{ flex: 1 }}
                    />
                    {form.matchingPairs.length > 2 && (
                      <button
                        type="button"
                        className="link-btn danger"
                        onClick={() => setForm((f) => ({ ...f, matchingPairs: f.matchingPairs.filter((_, idx) => idx !== i) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 12.5 }}
                  onClick={() => setForm((f) => ({ ...f, matchingPairs: [...f.matchingPairs, { left: '', right: '' }] }))}
                >
                  Add Pair
                </button>
              </div>
            )}

            {form.type === 'ordering' && (
              <div className="field">
                <span>Items (in correct order)</span>
                {form.orderItems.map((item, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6,
                  }}
                  >
                    <span className="muted" style={{ width: 20 }}>{i + 1}.</span>
                    <input
                      value={item}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        orderItems: f.orderItems.map((it, idx) => (idx === i ? e.target.value : it)),
                      }))}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="link-btn"
                      disabled={i === 0}
                      onClick={() => setForm((f) => {
                        const items = [...f.orderItems];
                        [items[i - 1], items[i]] = [items[i], items[i - 1]];
                        return { ...f, orderItems: items };
                      })}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="link-btn"
                      disabled={i === form.orderItems.length - 1}
                      onClick={() => setForm((f) => {
                        const items = [...f.orderItems];
                        [items[i + 1], items[i]] = [items[i], items[i + 1]];
                        return { ...f, orderItems: items };
                      })}
                    >
                      Down
                    </button>
                    {form.orderItems.length > 2 && (
                      <button
                        type="button"
                        className="link-btn danger"
                        onClick={() => setForm((f) => ({ ...f, orderItems: f.orderItems.filter((_, idx) => idx !== i) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 12.5 }}
                  onClick={() => setForm((f) => ({ ...f, orderItems: [...f.orderItems, ''] }))}
                >
                  Add Item
                </button>
              </div>
            )}

            {form.type === 'fill_in_blank' && (
              <div className="field">
                <span>Blanks (comma-separated accepted answers each)</span>
                {form.blanks.map((b, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={b.acceptedAnswersText}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        blanks: f.blanks.map((bl, idx) => (idx === i ? { acceptedAnswersText: e.target.value } : bl)),
                      }))}
                      placeholder="e.g. Accra, accra"
                      style={{ flex: 1 }}
                    />
                    {form.blanks.length > 1 && (
                      <button
                        type="button"
                        className="link-btn danger"
                        onClick={() => setForm((f) => ({ ...f, blanks: f.blanks.filter((_, idx) => idx !== i) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: 12.5 }}
                  onClick={() => setForm((f) => ({ ...f, blanks: [...f.blanks, { acceptedAnswersText: '' }] }))}
                >
                  Add Blank
                </button>
              </div>
            )}

            {(form.type === 'essay' || form.type === 'file_upload') && (
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                {form.type === 'essay'
                  ? 'Manually graded — the student types a free-text response.'
                  : 'Manually graded — the student submits a file (submission handling is a later phase).'}
              </p>
            )}

            <label className="field">
              <span>Model Answer / Grading Notes (optional)</span>
              <textarea rows={2} value={form.modelAnswer} onChange={(e) => setForm({ ...form, modelAnswer: e.target.value })} />
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
