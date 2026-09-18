import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssessment } from '../../api/assessments.api';
import { listAttemptsForAssessment, gradeAttempt } from '../../api/attempts.api';

const statusBadge = (status) => {
  if (status === 'Graded') return <span className="badge badge-success">Graded</span>;
  if (status === 'AwaitingReview') return <span className="badge badge-warning">Awaiting Review</span>;
  if (status === 'Submitted') return <span className="badge badge-neutral">Submitted</span>;
  return <span className="badge badge-neutral">In Progress</span>;
};

export default function GradeSubmissions() {
  const { id: assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [draftGrades, setDraftGrades] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [saveError, setSaveError] = useState('');

  const load = () => {
    setIsLoading(true);
    setError('');
    Promise.all([getAssessment(assessmentId), listAttemptsForAssessment(assessmentId)])
      .then(([a, list]) => { setAssessment(a); setAttempts(list); })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load submissions.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [assessmentId]);

  const questionsById = new Map((assessment?.questions || []).map((q) => [q.id, q]));

  const toggleExpand = (attempt) => {
    setExpandedId((prev) => (prev === attempt.id ? null : attempt.id));
    if (!draftGrades[attempt.id]) {
      const initial = {};
      attempt.answers.filter((a) => a.needsManualGrading).forEach((a) => {
        initial[a.questionId] = a.marksAwarded ?? '';
      });
      setDraftGrades((prev) => ({ ...prev, [attempt.id]: initial }));
    }
  };

  const setDraftMark = (attemptId, questionId, value) => {
    setDraftGrades((prev) => ({ ...prev, [attemptId]: { ...prev[attemptId], [questionId]: value } }));
  };

  const handleSaveGrades = async (attempt) => {
    setSavingId(attempt.id);
    setSaveError('');
    try {
      const draft = draftGrades[attempt.id] || {};
      const grades = Object.entries(draft)
        .filter(([, value]) => value !== '')
        .map(([questionId, marksAwarded]) => ({ questionId, marksAwarded: Number(marksAwarded) }));
      await gradeAttempt(attempt.id, grades);
      setExpandedId(null);
      load();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save grades.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Review Submissions{assessment ? ` — ${assessment.title}` : ''}</h1>
        <button type="button" className="btn-secondary" onClick={() => navigate('/assessments')}>Back</button>
      </div>
      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {saveError && <div className="alert-error">{saveError}</div>}
        {!isLoading && !error && (
          <table>
            <thead><tr><th>Student</th><th>Status</th><th>Score</th><th /></tr></thead>
            <tbody>
              {attempts.map((attempt) => (
                <Fragment key={attempt.id}>
                  <tr>
                    <td>{attempt.student?.firstName} {attempt.student?.lastName}</td>
                    <td>{statusBadge(attempt.status)}</td>
                    <td>
                      {attempt.status === 'Graded' || attempt.status === 'AwaitingReview'
                        ? `${attempt.totalScore ?? '—'} / ${attempt.totalPossibleMarks ?? '—'}`
                        : '—'}
                    </td>
                    <td>
                      {attempt.status === 'AwaitingReview' && (
                        <button type="button" className="link-btn" onClick={() => toggleExpand(attempt)}>
                          {expandedId === attempt.id ? 'Close' : 'Grade'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === attempt.id && (
                    <tr>
                      <td colSpan={4}>
                        {attempt.answers.filter((a) => a.needsManualGrading).map((a) => {
                          const question = questionsById.get(a.questionId);
                          return (
                            <div key={a.questionId} className="panel" style={{ marginBottom: 10, background: 'var(--bg)' }}>
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>{question?.topic} ({question?.marks} marks)</p>
                              <p className="muted" style={{ marginBottom: 8 }}>{question?.promptText}</p>
                              <p style={{ marginBottom: 8, fontStyle: 'italic' }}>
                                {question?.type === 'file_upload'
                                  ? 'File upload is not yet available in this version.'
                                  : (a.response || '(no answer submitted)')}
                              </p>
                              <label className="field" style={{ maxWidth: 180 }}>
                                <span>Marks Awarded (max {question?.marks})</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={question?.marks}
                                  value={draftGrades[attempt.id]?.[a.questionId] ?? ''}
                                  onChange={(e) => setDraftMark(attempt.id, a.questionId, e.target.value)}
                                />
                              </label>
                            </div>
                          );
                        })}
                        <button type="button" className="btn-primary" disabled={savingId === attempt.id} onClick={() => handleSaveGrades(attempt)}>
                          {savingId === attempt.id ? 'Saving...' : 'Save Grades'}
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {attempts.length === 0 && <tr><td colSpan={4} className="muted">No submissions yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
