import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPublishedForMe } from '../../api/assessments.api';
import { getMyAttempt } from '../../api/attempts.api';

const statusBadge = (attempt) => {
  if (!attempt) return <span className="badge badge-neutral">Not Started</span>;
  if (attempt.status === 'InProgress') return <span className="badge badge-warning">In Progress</span>;
  if (attempt.status === 'AwaitingReview') return <span className="badge badge-warning">Awaiting Review</span>;
  return <span className="badge badge-success">Submitted</span>;
};

export default function MyAssessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [attemptsByAssessment, setAttemptsByAssessment] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listPublishedForMe()
      .then(async (rows) => {
        setAssessments(rows);
        const entries = await Promise.all(rows.map(async (a) => {
          try {
            return [a.id, await getMyAttempt(a.id)];
          } catch {
            return [a.id, null];
          }
        }));
        setAttemptsByAssessment(Object.fromEntries(entries));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load assessments.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="toolbar"><h1>My Assessments</h1></div>
      <div className="panel">
        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}
        {!isLoading && !error && (
          <table>
            <thead>
              <tr><th>Title</th><th>Subject</th><th>Total Marks</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const attempt = attemptsByAssessment[a.id];
                const totalMarks = (a.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);
                return (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.subject?.name || '—'}</td>
                    <td>{totalMarks}</td>
                    <td>{statusBadge(attempt)}</td>
                    <td>
                      {!attempt && (
                        <button type="button" className="btn-primary" onClick={() => navigate(`/assessments/${a.id}/attempt`)}>Start</button>
                      )}
                      {attempt?.status === 'InProgress' && (
                        <button type="button" className="btn-primary" onClick={() => navigate(`/assessments/${a.id}/attempt`)}>Resume</button>
                      )}
                      {attempt && attempt.status !== 'InProgress' && (
                        <button type="button" className="btn-secondary" onClick={() => navigate(`/assessments/${a.id}/attempt`)}>View Result</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {assessments.length === 0 && <tr><td colSpan={5} className="muted">No assessments available right now.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
