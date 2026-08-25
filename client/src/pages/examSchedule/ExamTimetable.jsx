import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import useApiResource from '../../hooks/useApiResource';
import {
  listExamSchedules, createExamSchedule, updateExamSchedule, deleteExamSchedule,
} from '../../api/examSchedule.api';
import { listTerms } from '../../api/terms.api';
import { listClasses } from '../../api/classes.api';
import { listSubjects } from '../../api/subjects.api';
import Modal from '../../components/common/Modal';

const emptyForm = {
  classId: '', subjectId: '', examDate: '', startTime: '', endTime: '', room: '',
};

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function ExamTimetable() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';

  const [terms, setTerms] = useState([]);
  const [academicTermId, setAcademicTermId] = useState('');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classFilter, setClassFilter] = useState('');

  const [editing, setEditing] = useState(null); // 'new' | row | null
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listTerms().then((data) => {
      setTerms(data);
      const current = data.find((t) => t.isCurrent) || data[0];
      if (current) setAcademicTermId(current.id);
    }).catch(() => {});
    if (canEdit) {
      listClasses().then(setClasses).catch(() => {});
      listSubjects().then(setSubjects).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = {
    ...(academicTermId ? { academicTermId } : {}),
    ...(classFilter ? { classId: classFilter } : {}),
  };
  const { data: schedules, isLoading, error, reload } = useApiResource(
    () => listExamSchedules(params),
    [academicTermId, classFilter],
  );

  const openNew = () => {
    setForm({ ...emptyForm });
    setFormError('');
    setEditing('new');
  };
  const openEdit = (row) => {
    setForm({
      classId: row.classId, subjectId: row.subjectId, examDate: row.examDate, startTime: row.startTime, endTime: row.endTime, room: row.room || '',
    });
    setFormError('');
    setEditing(row);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      if (editing === 'new') {
        await createExamSchedule({ ...form, academicTermId });
      } else {
        await updateExamSchedule(editing.id, {
          examDate: form.examDate, startTime: form.startTime, endTime: form.endTime, room: form.room,
        });
      }
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save exam schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove the ${row.subject?.name} exam for ${row.class?.name} ${row.class?.section || ''}?`)) return;
    await deleteExamSchedule(row.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Exam Timetable</h1>
        {canEdit && <button type="button" className="btn-primary" onClick={openNew}>Schedule Exam</button>}
      </div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {canEdit && (
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
            </select>
          )}
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Date</th><th>Time</th><th>Class</th><th>Subject</th><th>Room</th>{canEdit && <th />}</tr>
            </thead>
            <tbody>
              {schedules.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.examDate)}</td>
                  <td>{row.startTime} – {row.endTime}</td>
                  <td>{row.class?.name} {row.class?.section || ''}</td>
                  <td>{row.subject?.name}</td>
                  <td>{row.room || '—'}</td>
                  {canEdit && (
                    <td>
                      <div className="row-actions">
                        <button type="button" className="link-btn" onClick={() => openEdit(row)}>Edit</button>
                        <button type="button" className="link-btn danger" onClick={() => handleDelete(row)}>Remove</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {schedules.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} className="muted">No exams scheduled for this term yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Schedule Exam' : 'Edit Exam'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            {editing === 'new' && (
              <>
                <label className="field">
                  <span>Class</span>
                  <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                    <option value="">Select class...</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Subject</span>
                  <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                    <option value="">Select subject...</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="field">
              <span>Exam Date</span>
              <input type="date" value={form.examDate} onChange={(e) => setForm({ ...form, examDate: e.target.value })} required />
            </label>
            <label className="field">
              <span>Start Time</span>
              <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </label>
            <label className="field">
              <span>End Time</span>
              <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </label>
            <label className="field">
              <span>Room (optional)</span>
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Hall A" />
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
