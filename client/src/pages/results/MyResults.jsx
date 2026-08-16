import { useEffect, useState } from 'react';
import { getMyResults } from '../../api/results.api';
import { gradeBadgeClass } from '../../utils/grading';

export default function MyResults() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyResults()
      .then(setResults)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load results.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1>My Results</h1>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <div className="panel">
          <table>
            <thead><tr><th>Subject</th><th>Term</th><th>Class Score</th><th>Exam Score</th><th>Total</th><th>Grade</th><th>Position</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td>{r.subject?.name}</td>
                  <td>{r.academicTerm?.name}</td>
                  <td>{r.classScore}</td>
                  <td>{r.examScore}</td>
                  <td>{r.totalScore}</td>
                  <td><span className={`badge badge-solid ${gradeBadgeClass(r.grade)}`}>{r.grade}</span></td>
                  <td>{r.subjectPosition ?? '—'}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={7} className="muted">No results recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
