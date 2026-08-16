import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listClasses, createClass, updateClass, deleteClass } from '../../api/classes.api';
import { listTeachers } from '../../api/teachers.api';
import { listSubjects, listSubjectsForClass, assignSubjectToClass, unassignSubjectFromClass } from '../../api/subjects.api';
import { listAssignmentsForClass, createAssignment, deleteAssignment } from '../../api/assignments.api';
import Modal from '../../components/common/Modal';

const STAGES = ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'];

const emptyForm = { name: '', section: '', room: '', stage: '', classTeacherId: '' };

export default function ClassList() {
  const { data: classes, isLoading, error, reload } = useApiResource(listClasses);
  const [teachers, setTeachers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [subjectsPanel, setSubjectsPanel] = useState(null); // the class row for which we're managing subjects

  useEffect(() => {
    listTeachers().then(setTeachers).catch(() => setTeachers([]));
  }, []);

  const openNew = () => { setForm(emptyForm); setFormError(''); setEditing('new'); };
  const openEdit = (classRow) => {
    setForm({
      name: classRow.name,
      section: classRow.section || '',
      room: classRow.room || '',
      stage: classRow.stage || '',
      classTeacherId: classRow.classTeacherId || '',
    });
    setFormError('');
    setEditing(classRow);
  };
  const close = () => setEditing(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');
    try {
      const payload = { ...form, classTeacherId: form.classTeacherId || null };
      if (editing === 'new') {
        await createClass(payload);
      } else {
        await updateClass(editing.id, payload);
      }
      close();
      reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save class.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (classRow) => {
    if (!window.confirm(`Delete class "${classRow.name}"?`)) return;
    await deleteClass(classRow.id);
    reload();
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Classes</h1>
        <button type="button" className="btn-primary" onClick={openNew}>New Class</button>
      </div>

      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Name</th><th>Section</th><th>Stage</th><th>Room</th><th>Class Teacher</th><th>Students</th><th /></tr>
            </thead>
            <tbody>
              {classes.map((classRow) => (
                <tr key={classRow.id}>
                  <td>{classRow.name}</td>
                  <td>{classRow.section || '—'}</td>
                  <td>{classRow.stage || '—'}</td>
                  <td>{classRow.room || '—'}</td>
                  <td>{classRow.classTeacher ? `${classRow.classTeacher.firstName} ${classRow.classTeacher.lastName}` : '—'}</td>
                  <td>{classRow.students?.length ?? 0}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => setSubjectsPanel(classRow)}>Subjects</button>
                      <button type="button" className="link-btn" onClick={() => openEdit(classRow)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(classRow)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={7} className="muted">No classes yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'New Class' : 'Edit Class'} onClose={close}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert-error">{formError}</div>}
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 5" required />
            </label>
            <label className="field">
              <span>Section</span>
              <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" />
            </label>
            <label className="field">
              <span>Room</span>
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </label>
            <label className="field">
              <span>Stage</span>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                <option value="">—</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Class Teacher</span>
              <select value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}>
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {subjectsPanel && (
        <ClassSubjectsModal classRow={subjectsPanel} onClose={() => setSubjectsPanel(null)} />
      )}
    </div>
  );
}

function ClassSubjectsModal({ classRow, onClose }) {
  const [allSubjects, setAllSubjects] = useState([]);
  const [links, setLinks] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [pendingTeacherBySubject, setPendingTeacherBySubject] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const [subjects, classLinks, allTeachers, assignments] = await Promise.all([
        listSubjects(),
        listSubjectsForClass(classRow.id),
        listTeachers(),
        listAssignmentsForClass(classRow.id),
      ]);
      setAllSubjects(subjects);
      setLinks(classLinks);
      setTeachers(allTeachers);
      setTeacherAssignments(assignments);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load subjects.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTeacher = async (subjectId) => {
    const teacherId = pendingTeacherBySubject[subjectId];
    if (!teacherId) return;
    await createAssignment({ teacherId, subjectId, classId: classRow.id });
    setPendingTeacherBySubject({ ...pendingTeacherBySubject, [subjectId]: '' });
    load();
  };

  const handleRemoveTeacherAssignment = async (assignmentId) => {
    await deleteAssignment(assignmentId);
    load();
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [classRow.id]);

  const assignedIds = new Set(links.map((l) => l.subjectId));
  const available = allSubjects.filter((s) => !assignedIds.has(s.id));

  const handleAssign = async () => {
    if (!selectedSubjectId) return;
    await assignSubjectToClass({ classId: classRow.id, subjectId: selectedSubjectId });
    setSelectedSubjectId('');
    load();
  };

  const handleRemove = async (link) => {
    await unassignSubjectFromClass(link.id);
    load();
  };

  return (
    <Modal title={`Subjects for ${classRow.name}${classRow.section ? ' ' + classRow.section : ''}`} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}
      {isLoading ? <p className="muted">Loading...</p> : (
        <>
          <table style={{ marginBottom: 16 }}>
            <thead><tr><th>Subject</th><th>Teacher</th><th /></tr></thead>
            <tbody>
              {links.map((link) => {
                const assignment = teacherAssignments.find((a) => a.subjectId === link.subjectId);
                return (
                  <tr key={link.id}>
                    <td>{link.subject?.name}</td>
                    <td>
                      {assignment ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{assignment.teacher?.firstName} {assignment.teacher?.lastName}</span>
                          <button type="button" className="link-btn danger" onClick={() => handleRemoveTeacherAssignment(assignment.id)}>Remove</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            value={pendingTeacherBySubject[link.subjectId] || ''}
                            onChange={(e) => setPendingTeacherBySubject({ ...pendingTeacherBySubject, [link.subjectId]: e.target.value })}
                          >
                            <option value="">Unassigned</option>
                            {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                          </select>
                          <button type="button" className="link-btn" onClick={() => handleAssignTeacher(link.subjectId)}>Assign</button>
                        </div>
                      )}
                    </td>
                    <td><button type="button" className="link-btn danger" onClick={() => handleRemove(link)}>Remove Subject</button></td>
                  </tr>
                );
              })}
              {links.length === 0 && <tr><td colSpan={3} className="muted">No subjects assigned yet.</td></tr>}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Select a subject to add...</option>
              {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" className="btn-primary" onClick={handleAssign} disabled={!selectedSubjectId}>Add</button>
          </div>
        </>
      )}
    </Modal>
  );
}
