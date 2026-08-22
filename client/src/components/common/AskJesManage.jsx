import { useEffect, useRef, useState } from 'react';
import { askAdminQuery } from '../../api/aiQuery.api';
import { formatCurrency } from '../../utils/currency';
import Modal from './Modal';

const FLAG_LABELS = {
  low_attendance: 'Low Attendance',
  academic_decline: 'Academic Decline',
  failing_multiple_subjects: 'Failing Subjects',
};

const EXAMPLE_QUESTIONS = [
  'Which students owe more than 200 in fees?',
  'Which subjects had the lowest average scores this term?',
  'Which students need attention this term?',
];

function ResultsTable({ intent, rows }) {
  if (rows.length === 0) return null;

  if (intent === 'fee_arrears_by_class') {
    return (
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Outstanding</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId}><td>{r.name}</td><td>{r.className || '—'}</td><td>{formatCurrency(r.outstandingBalance)}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'subject_average_scores') {
    return (
      <table>
        <thead><tr><th>Subject</th><th>Average Score</th><th>Students</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subjectId}><td>{r.subjectName}</td><td>{r.averageScore}</td><td>{r.studentCount}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'at_risk_students') {
    return (
      <table>
        <thead><tr><th>Student</th><th>Class</th><th>Flags</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId}>
              <td>{r.name}</td>
              <td>{r.className || '—'}</td>
              <td>{r.flagTypes.map((f) => FLAG_LABELS[f] || f).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return null;
}

// Admin-only. The AI here only classifies the question into one of a small,
// fixed set of read-only query types and extracts a few parameters — see
// aiQuery.controller.js for the actual security boundary. This component
// just asks the question and renders whatever structured answer comes back.
//
// initialQuestion: set when CommandPalette hands off a free-text query —
// pre-fills and auto-asks immediately, since picking that option from the
// palette already signals "ask this," not "let me review it first."
export default function AskJesManage({ onClose, initialQuestion }) {
  const [question, setQuestion] = useState(initialQuestion || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const askedInitialRef = useRef(false);

  const ask = async (q) => {
    if (!q.trim()) return;
    setIsAsking(true);
    setError('');
    setResult(null);
    try {
      const data = await askAdminQuery(q);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.code === 'AI_NOT_CONFIGURED'
        ? 'The natural-language assistant isn\'t set up for this school yet.'
        : (err.response?.data?.message || 'Could not process that question right now.'));
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && !askedInitialRef.current) {
      askedInitialRef.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAsk = (e) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <Modal title="Ask JesManage" onClose={onClose}>
      <form onSubmit={handleAsk}>
        <label className="field">
          <span>Ask a question about fees, results, or attendance</span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which students owe more than 200 in fees?"
            maxLength={300}
            autoFocus
          />
        </label>
        <p className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>
          Try:
          {EXAMPLE_QUESTIONS.map((q, i) => (
            <span key={q}>
              {i > 0 && ' · '}
              <button type="button" className="link-btn" style={{ fontSize: 11.5 }} onClick={() => setQuestion(q)}>{q}</button>
            </span>
          ))}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          <button type="submit" className="btn-primary" disabled={isAsking || !question.trim()}>
            {isAsking ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </form>

      {error && <div className="alert-error" style={{ marginTop: 14 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 14 }}>
          {result.answer && <p style={{ fontSize: 14, marginBottom: 10 }}>🧠 {result.answer}</p>}
          <ResultsTable intent={result.intent} rows={result.rows} />
        </div>
      )}
    </Modal>
  );
}
