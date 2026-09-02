import { useEffect, useRef, useState } from 'react';
import { askAdminQuery } from '../../api/aiQuery.api';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';

const FLAG_LABELS = {
  low_attendance: 'Low Attendance',
  academic_decline: 'Academic Decline',
  failing_multiple_subjects: 'Failing Subjects',
};

const EXAMPLE_QUESTIONS_BY_ROLE = {
  admin: [
    'Which students owe more than 200 in fees?',
    'Which subjects have pass rates below 50%?',
    'Which class performed best this term?',
    'Which teachers have unsubmitted marksheets?',
    'Which guardians have no portal login?',
    'Which classes have no homeroom teacher?',
  ],
  teacher: [
    'How is attendance in my classes this term?',
    'Which of my marksheets are still unsubmitted?',
  ],
  parent: [
    'How much do I owe in fees?',
    'How is my child doing this term?',
  ],
};

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
  if (intent === 'subjects_below_pass_rate') {
    return (
      <table>
        <thead><tr><th>Subject</th><th>Pass Rate</th><th>Average</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.subjectId}><td>{r.subjectName}</td><td>{r.passRate}%</td><td>{r.average}%</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'class_performance_ranking') {
    return (
      <table>
        <thead><tr><th>Class</th><th>Average</th><th>Results</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.classId}><td>{r.className}</td><td>{r.average}%</td><td>{r.resultCount}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'teachers_unsubmitted_marksheets') {
    return (
      <table>
        <thead><tr><th>Teacher</th><th>Pending</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teacherId}>
              <td>{r.name}</td>
              <td>{r.pending.map((p) => `${p.className} — ${p.subjectName}`).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'guardians_without_portal_login') {
    return (
      <table>
        <thead><tr><th>Guardian</th><th>Phone</th><th>Children</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.guardianId}><td>{r.name}</td><td>{r.phone || '—'}</td><td>{r.children || '—'}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'classes_without_homeroom_teacher') {
    return (
      <table>
        <thead><tr><th>Class</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.classId}><td>{r.className}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'my_class_attendance_summary') {
    return (
      <table>
        <thead><tr><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Excused</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.classId}><td>{r.className}</td><td>{r.present}</td><td>{r.absent}</td><td>{r.late}</td><td>{r.excused}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'my_class_unsubmitted_marksheets') {
    return (
      <table>
        <thead><tr><th>Class</th><th>Subject</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={`${r.className}-${r.subjectName}-${i}`}><td>{r.className}</td><td>{r.subjectName}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'my_child_fee_balance') {
    return (
      <table>
        <thead><tr><th>Child</th><th>Class</th><th>Outstanding</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId}><td>{r.name}</td><td>{r.className || '—'}</td><td>{formatCurrency(r.outstandingBalance)}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (intent === 'my_child_results_summary') {
    return (
      <table>
        <thead><tr><th>Child</th><th>Average Score</th><th>Attendance</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.studentId}>
              <td>{r.name}</td>
              <td>{r.averageScore != null ? `${r.averageScore}%` : '—'}</td>
              <td>{r.outOfAttendance ? `${r.totalAttendance}/${r.outOfAttendance}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return null;
}

// Available to admin, teacher, and parent — each sees only their own
// role's intents (aiQuery.controller.js is the actual security boundary;
// the AI here only classifies the question into one of a small, fixed set
// of read-only query types and extracts a few parameters). This component
// just asks the question and renders whatever structured answer comes back.
//
// initialQuestion: set when CommandPalette hands off a free-text query —
// pre-fills and auto-asks immediately, since picking that option from the
// palette already signals "ask this," not "let me review it first."
export default function AskJesManage({ onClose, initialQuestion }) {
  const { user } = useAuth();
  const exampleQuestions = EXAMPLE_QUESTIONS_BY_ROLE[user?.role] || [];
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
            placeholder={exampleQuestions[0] ? `e.g. ${exampleQuestions[0]}` : 'e.g. Which class performed best this term?'}
            maxLength={300}
            autoFocus
          />
        </label>
        {exampleQuestions.length > 0 && (
          <p className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>
            Try:
            {exampleQuestions.map((q, i) => (
              <span key={q}>
                {i > 0 && ' · '}
                <button type="button" className="link-btn" style={{ fontSize: 11.5 }} onClick={() => setQuestion(q)}>{q}</button>
              </span>
            ))}
          </p>
        )}
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
          {result.recommendation && (
            <p className="alert-warning" style={{ fontSize: 13, marginTop: 10 }}>💡 {result.recommendation}</p>
          )}
        </div>
      )}
    </Modal>
  );
}
