import { useState } from 'react';
import { DEMO_STUDENTS, DEMO_SCORES, DEMO_SUBJECTS, DEMO_REMARK_BANK } from './demoData';

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
// no live model call. Explicitly labeled as simulated, matching the real
// app's "Rule-Based Fallback Mode" badge convention. A teacher always
// reviews/edits before it counts.
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
      .replaceAll('{pronoun}', 'they')
      .replaceAll('{possessive}', 'their')
      .replaceAll('{weakSubject}', weakestSubjectFor(studentId));
    setRemark(text);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-gray-900 dark:text-white">Remark Assistant</h4>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          ⚡ JesManage Intelligence — Simulated for Demo
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="demo-remark-student" className="text-xs font-semibold text-gray-500 dark:text-gray-400">Student</label>
        <select
          id="demo-remark-student" value={studentId}
          onChange={(e) => { setStudentId(e.target.value); setRemark(''); }}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {DEMO_STUDENTS.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
        </select>
        <button
          type="button" onClick={generate}
          className="rounded-full bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-800"
        >
          Generate Remark
        </button>
      </div>
      {remark && (
        <div className="mt-4">
          <textarea
            rows={3} value={remark} onChange={(e) => setRemark(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Suggested from this student&apos;s own term data. A teacher always reviews, edits, or replaces it before it goes on a report card.
          </p>
        </div>
      )}
    </div>
  );
}
