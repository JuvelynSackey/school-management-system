import { useState } from 'react';
import { DEMO_STUDENTS, DEMO_SCORES, DEMO_SUBJECTS, DEMO_REMARK_BANK } from '../../demo/demoData';

const pronounFor = () => 'they';

const averageFor = (studentId) => {
  const total = DEMO_SUBJECTS.reduce((sum, subj) => {
    const { classScore, examScore } = DEMO_SCORES[studentId][subj];
    return sum + classScore + examScore;
  }, 0);
  return total / DEMO_SUBJECTS.length;
};

const weakestSubjectFor = (studentId) => {
  let weakest = DEMO_SUBJECTS[0];
  let lowest = Infinity;
  DEMO_SUBJECTS.forEach((subj) => {
    const { classScore, examScore } = DEMO_SCORES[studentId][subj];
    const total = classScore + examScore;
    if (total < lowest) { lowest = total; weakest = subj; }
  });
  return weakest;
};

// Canned, deterministic responses picked from a student's own term data —
// no live model call, no free text generation. Explicitly labeled as
// simulated per the brief's own requirement, matching the real app's
// "Rule-Based Fallback Mode" badge convention (TerminalReports.jsx,
// AnnouncementComposer.jsx). A teacher always reviews/edits before it counts.
export default function DemoRemarkGenerator() {
  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const [remark, setRemark] = useState('');

  const generate = () => {
    const average = averageFor(studentId);
    const student = DEMO_STUDENTS.find((s) => s.id === studentId);
    const tier = average >= 70 ? 'strong' : average >= 50 ? 'average' : 'weak';
    const bank = DEMO_REMARK_BANK[tier];
    const template = bank[Math.floor(Math.random() * bank.length)];
    const text = template
      .replaceAll('{name}', student.firstName)
      .replaceAll('{pronoun}', pronounFor())
      .replaceAll('{possessive}', 'their')
      .replaceAll('{weakSubject}', weakestSubjectFor(studentId));
    setRemark(text);
  };

  return (
    <div className="demo-remark-generator panel">
      <div className="demo-remark-header">
        <h4 style={{ margin: 0 }}>Remark Assistant</h4>
        <span className="badge badge-neutral">⚡ JesManage Intelligence — Simulated for Demo</span>
      </div>
      <div className="demo-marksheet-controls">
        <label htmlFor="demo-remark-student">Student</label>
        <select id="demo-remark-student" value={studentId} onChange={(e) => { setStudentId(e.target.value); setRemark(''); }}>
          {DEMO_STUDENTS.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={generate}>Generate Remark</button>
      </div>
      {remark && (
        <div className="demo-remark-output">
          <textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} />
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
            Suggested from this student&apos;s own term data. A teacher always reviews, edits, or replaces it before it goes on a report card.
          </p>
        </div>
      )}
    </div>
  );
}
