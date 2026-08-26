import { useEffect, useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { listClasses, createClass, updateClass, deleteClass } from '../../api/classes.api';
import { listTeachers } from '../../api/teachers.api';
import { listStudents, promoteStudents } from '../../api/students.api';
import { listSubjects, listSubjectsForClass, assignSubjectToClass, unassignSubjectFromClass } from '../../api/subjects.api';
import { listAssignmentsForClass, createAssignment, deleteAssignment } from '../../api/assignments.api';
import Modal from '../../components/common/Modal';
import { GRADE_LEVELS, STAGE_BY_GRADE_LEVEL, UNRANKED_LEVEL_ORDER } from '../../config/gradeLevels';

const STAGES = ['Creche', 'Nursery', 'KG', 'Primary', 'JHS'];

const emptyForm = {
  name: '', section: '', room: '', stage: '', gradeLevel: '', classTeacherId: '',
};

export default function ClassList() {
  const { data: classes, isLoading, error, reload } = useApiResource(listClasses);
  const [teachers, setTeachers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [subjectsPanel, setSubjectsPanel] = useState(null); // the class row for which we're managing subjects
  const [promotionPanel, setPromotionPanel] = useState(null); // the class row we're promoting students out of

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
      gradeLevel: classRow.gradeLevel || '',
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
              <tr><th>Name</th><th>Section</th><th>Grade Level</th><th>Stage</th><th>Room</th><th>Class Teacher</th><th>Students</th><th /></tr>
            </thead>
            <tbody>
              {classes.map((classRow) => (
                <tr key={classRow.id}>
                  <td>{classRow.name}</td>
                  <td>{classRow.section || '—'}</td>
                  <td>{GRADE_LEVELS.find((g) => g.value === classRow.gradeLevel)?.label || '—'}</td>
                  <td>{classRow.stage || '—'}</td>
                  <td>{classRow.room || '—'}</td>
                  <td>{classRow.classTeacher ? `${classRow.classTeacher.firstName} ${classRow.classTeacher.lastName}` : '—'}</td>
                  <td>{classRow.students?.length ?? 0}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="link-btn" onClick={() => setSubjectsPanel(classRow)}>Subjects</button>
                      <button type="button" className="link-btn" onClick={() => setPromotionPanel(classRow)}>Promote</button>
                      <button type="button" className="link-btn" onClick={() => openEdit(classRow)}>Edit</button>
                      <button type="button" className="link-btn danger" onClick={() => handleDelete(classRow)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={8} className="muted">No classes yet.</td></tr>}
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
              <span>Grade Level</span>
              <select
                value={form.gradeLevel}
                onChange={(e) => {
                  const gradeLevel = e.target.value;
                  setForm({
                    ...form,
                    gradeLevel,
                    stage: gradeLevel ? STAGE_BY_GRADE_LEVEL[gradeLevel] : form.stage,
                  });
                }}
              >
                <option value="">— Custom (no standard grade level) —</option>
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Stage</span>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                disabled={Boolean(form.gradeLevel)}
              >
                <option value="">—</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {form.gradeLevel && <small className="muted">Derived automatically from Grade Level.</small>}
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

      {promotionPanel && (
        <PromoteStudentsModal
          classRow={promotionPanel}
          allClasses={classes}
          onClose={() => setPromotionPanel(null)}
          onDone={() => { setPromotionPanel(null); reload(); }}
        />
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

const PROMOTION_ACTIONS = [
  { value: 'promote', label: 'Promote' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'graduate', label: 'Graduate' },
];

// End-of-year batch transition — only ever touches the students actually
// listed here (active students currently in this exact class), matching
// what POST /students/promote itself re-validates server-side before
// applying anything.
function PromoteStudentsModal({
  classRow, allClasses, onClose, onDone,
}) {
  const [students, setStudents] = useState(null);
  const [actions, setActions] = useState({});
  const [destinationClassId, setDestinationClassId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listStudents({ classId: classRow.id, status: 'active' }).then((rows) => {
      setStudents(rows);
      setActions(Object.fromEntries(rows.map((s) => [s.id, 'promote'])));
    }).catch(() => setStudents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow.id]);

  // Pre-select the next class in the Ghanaian hierarchy as the promotion
  // destination — still fully overridable via the dropdown below. No-ops
  // for an unranked/custom source class or one with no "next" level (e.g.
  // JHS 3), falling through to today's manual pick.
  useEffect(() => {
    if (classRow.levelOrder === undefined || classRow.levelOrder === UNRANKED_LEVEL_ORDER) return;
    const next = allClasses.find((c) => c.levelOrder === classRow.levelOrder + 1);
    if (next) setDestinationClassId(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow.id]);

  const otherClasses = allClasses.filter((c) => c.id !== classRow.id);

  const counts = (students || []).reduce((acc, s) => {
    const a = actions[s.id] || 'promote';
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!students || students.length === 0) return;

    const needsDestination = students.some((s) => (actions[s.id] || 'promote') === 'promote');
    if (needsDestination && !destinationClassId) {
      setError('Choose a destination class for students being promoted.');
      return;
    }

    const destLabel = destinationClassId ? (allClasses.find((c) => c.id === destinationClassId)?.name || 'the destination class') : '';
    const summary = [
      counts.promote ? `${counts.promote} promoted to ${destLabel}` : null,
      counts.repeat ? `${counts.repeat} repeating` : null,
      counts.graduate ? `${counts.graduate} graduating` : null,
    ].filter(Boolean).join(', ');
    if (!window.confirm(`${summary}. Continue?`)) return;

    setIsSaving(true);
    setError('');
    try {
      await promoteStudents({
        sourceClassId: classRow.id,
        destinationClassId: destinationClassId || undefined,
        promotions: students.map((s) => ({ studentId: s.id, action: actions[s.id] || 'promote' })),
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote students.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={`Promote Students — ${classRow.name}${classRow.section ? ` ${classRow.section}` : ''}`} onClose={onClose}>
      {error && <div className="alert-error">{error}</div>}
      {students === null ? <p className="muted">Loading...</p> : (
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Destination Class (for promoted students)</span>
            <select value={destinationClassId} onChange={(e) => setDestinationClassId(e.target.value)}>
              <option value="">Select destination class...</option>
              {otherClasses.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
            </select>
          </label>

          {students.length === 0 ? (
            <p className="muted">No active students in this class.</p>
          ) : (
            <table style={{ marginBottom: 16 }}>
              <thead><tr><th>Student</th><th>Action</th></tr></thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.firstName} {s.lastName}</td>
                    <td>
                      <select value={actions[s.id] || 'promote'} onChange={(e) => setActions({ ...actions, [s.id]: e.target.value })}>
                        {PROMOTION_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="muted" style={{ fontSize: 13 }}>
            {counts.promote || 0} promoted &middot; {counts.repeat || 0} repeating &middot; {counts.graduate || 0} graduating
          </p>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSaving || students.length === 0}>
              {isSaving ? 'Processing...' : 'Confirm Promotion'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
