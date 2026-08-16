import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { listSubjectsForClass } from '../../api/subjects.api';
import { listTerms } from '../../api/terms.api';
import { getResultsRoster, recordResults } from '../../api/results.api';
import { computeGrade } from '../../utils/grading';

export default function ResultsEntry() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [roster, setRoster] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    listClasses().then((rows) => { setClasses(rows); if (rows.length) setClassId(String(rows[0].id)); }).catch(() => {});
    listTerms().then((rows) => {
      setTerms(rows);
      const current = rows.find((t) => t.isCurrent);
      if (current) setAcademicTermId(String(current.id));
      else if (rows.length) setAcademicTermId(String(rows[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    listSubjectsForClass(classId).then((links) => {
      const subs = links.map((l) => l.subject);
      setSubjects(subs);
      setSubjectId(subs.length ? String(subs[0].id) : '');
    }).catch(() => setSubjects([]));
  }, [classId]);

  const loadRoster = async () => {
    if (!classId || !subjectId || !academicTermId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getResultsRoster({ classId, subjectId, academicTermId });
      setRoster(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMessage('');
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, academicTermId]);

  const setField = (studentId, field, value) => {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setMessage('');
    try {
      await recordResults({
        classId,
        subjectId,
        academicTermId,
        records: roster
          .filter((r) => r.classScore !== '' && r.examScore !== '' && r.classScore !== null && r.examScore !== null)
          .map((r) => ({ studentId: r.studentId, classScore: Number(r.classScore), examScore: Number(r.examScore) })),
      });
      setMessage('Results saved.');
      loadRoster();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save results.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Score Entry</h1></div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.length === 0 && <option value="">No subjects assigned to this class</option>}
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {message && <div className="alert-error" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{message}</div>}
        {isLoading && <p className="muted">Loading...</p>}

        {!isLoading && (
          <>
            <table>
              <thead>
                <tr><th>Admission No.</th><th>Name</th><th>Class Score (50)</th><th>Exam Score (50)</th><th>Total</th><th>Grade</th><th>Position</th></tr>
              </thead>
              <tbody>
                {roster.map((r) => {
                  const previewGrade = computeGrade(r.classScore, r.examScore) || r.grade;
                  const previewTotal = (r.classScore !== '' && r.examScore !== '') ? Number(r.classScore) + Number(r.examScore) : r.totalScore;
                  return (
                    <tr key={r.studentId}>
                      <td>{r.admissionNo}</td>
                      <td>{r.firstName} {r.lastName}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={r.classScore}
                          onChange={(e) => setField(r.studentId, 'classScore', e.target.value)}
                          style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={r.examScore}
                          onChange={(e) => setField(r.studentId, 'examScore', e.target.value)}
                          style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
                        />
                      </td>
                      <td>{previewTotal ?? '—'}</td>
                      <td>{previewGrade || '—'}</td>
                      <td>{r.subjectPosition ?? '—'}</td>
                    </tr>
                  );
                })}
                {roster.length === 0 && <tr><td colSpan={7} className="muted">No students in this class.</td></tr>}
              </tbody>
            </table>
            {roster.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Results'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
