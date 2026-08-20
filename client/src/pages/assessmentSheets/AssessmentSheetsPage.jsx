import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import {
  listAssessmentSubjects, downloadSingleAssessmentSheet, downloadBulkAssessmentSheets,
} from '../../api/assessmentSheets.api';

const STATUS_BADGE = {
  'Not started': 'badge-neutral',
  'In progress': 'badge-warning',
  Complete: 'badge-success',
};

export default function AssessmentSheetsPage() {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [mode, setMode] = useState('prefilled');
  const [subjects, setSubjects] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadingKey, setDownloadingKey] = useState('');

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
    listTerms().then((data) => {
      setTerms(data);
      const current = data.find((t) => t.isCurrent) || data[0];
      if (current) setAcademicTermId(current.id);
    }).catch(() => setTerms([]));
  }, []);

  useEffect(() => {
    if (!classId || !academicTermId) { setSubjects(null); return; }
    setIsLoading(true);
    setError('');
    listAssessmentSubjects(classId, academicTermId)
      .then(setSubjects)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load subjects for this class.'))
      .finally(() => setIsLoading(false));
  }, [classId, academicTermId]);

  const selectedClass = classes.find((c) => c.id === classId);
  const selectedTerm = terms.find((t) => t.id === academicTermId);

  const handleDownloadSingle = async (subject) => {
    setDownloadingKey(subject.subjectId);
    setError('');
    try {
      const filename = `score-sheet-${selectedClass?.name}-${subject.subjectName}.pdf`.replace(/\s+/g, '-');
      await downloadSingleAssessmentSheet(classId, subject.subjectId, academicTermId, mode, filename);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate the score sheet.');
    } finally {
      setDownloadingKey('');
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingKey('all');
    setError('');
    try {
      const filename = `score-sheets-${selectedClass?.name}-all-subjects.pdf`.replace(/\s+/g, '-');
      await downloadBulkAssessmentSheets(classId, academicTermId, mode, filename);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate the score sheets.');
    } finally {
      setDownloadingKey('');
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Assessment Score Sheets</h1></div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Print a paper score sheet for teachers to record Class Score (/50) and Exam Score (/50) before entering them into JesManage.
      </p>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select a class...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
          <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="prefilled">Class List (names pre-filled)</option>
            <option value="blank">Blank Sheet (names handwritten)</option>
          </select>
          {subjects && subjects.length > 0 && (
            <button type="button" className="btn-primary" onClick={handleDownloadAll} disabled={downloadingKey !== ''}>
              {downloadingKey === 'all' ? 'Generating...' : 'Print All Subjects'}
            </button>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}
        {!classId && <p className="muted">Select a class to see its assigned subjects.</p>}
        {isLoading && <p className="muted">Loading...</p>}

        {!isLoading && classId && subjects && (
          <table>
            <thead><tr><th>Subject</th><th>Teacher</th><th>Entry Status</th><th /></tr></thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.subjectId}>
                  <td>{s.subjectName}</td>
                  <td>{s.teacherName || '—'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[s.entryStatus]}`}>{s.entryStatus}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{s.enteredCount} / {s.rosterCount}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => handleDownloadSingle(s)}
                      disabled={downloadingKey !== ''}
                    >
                      {downloadingKey === s.subjectId ? 'Generating...' : 'Print Sheet'}
                    </button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && <tr><td colSpan={4} className="muted">No subjects are assigned to this class yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
