import { useMemo, useState } from 'react';
import ReportCardPreview from './ReportCardPreview';
import {
  DEMO_SCHOOL, DEMO_CLASS, DEMO_STUDENTS, DEMO_SUBJECTS, DEMO_SCORES, GRADING_SCHEME, gradeFor,
} from './demoData';

// Local-state-only score entry, mirroring ResultsEntry.jsx's Class Score
// (/50) + Exam Score (/50) input-cell shape. Nothing here reaches the
// network — editing a score only updates this component's own state, which
// drives the shared ReportCardPreview live.
export default function DemoMarksheet() {
  const [subject, setSubject] = useState(DEMO_SUBJECTS[0]);
  const [scores, setScores] = useState(DEMO_SCORES);
  const [selectedStudentId, setSelectedStudentId] = useState(DEMO_STUDENTS[0].id);

  const updateScore = (studentId, field, value) => {
    const clamped = Math.max(0, Math.min(50, Number(value) || 0));
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subject]: { ...prev[studentId][subject], [field]: clamped } },
    }));
  };

  const rows = useMemo(() => DEMO_STUDENTS.map((s) => {
    const { classScore, examScore } = scores[s.id][subject];
    const total = classScore + examScore;
    return { student: s, classScore, examScore, total, grade: gradeFor(total) };
  }), [scores, subject]);

  const ranked = useMemo(() => [...rows].sort((a, b) => b.total - a.total), [rows]);

  const reportCardData = useMemo(() => {
    const student = DEMO_STUDENTS.find((s) => s.id === selectedStudentId);
    const results = DEMO_SUBJECTS.map((subj) => {
      const { classScore, examScore } = scores[student.id][subj];
      const total = classScore + examScore;
      return {
        subject: subj, classScore, examScore, totalScore: total, grade: gradeFor(total),
        subjectPosition: [...DEMO_STUDENTS]
          .map((s) => scores[s.id][subj].classScore + scores[s.id][subj].examScore)
          .sort((a, b) => b - a)
          .indexOf(total) + 1,
      };
    });
    const totalMarksObtained = results.reduce((sum, r) => sum + r.totalScore, 0);
    const averageScore = totalMarksObtained / results.length;
    const classPosition = ranked.findIndex((r) => r.student.id === student.id) + 1;
    return {
      school: DEMO_SCHOOL,
      term: { name: 'Term 2', academicYear: '2025/2026' },
      nextTermBegins: '12 January 2026',
      student,
      classRow: DEMO_CLASS,
      rollCount: DEMO_STUDENTS.length,
      classPosition,
      attendance: { totalAttendance: 61, outOfAttendance: 65 },
      results,
      scheme: GRADING_SCHEME,
      totalMarksObtained,
      averageScore,
      teacherRemark: 'Live preview — edit a score above to see this report card update.',
      status: 'Draft',
      reportId: 'RC-DEMO-PREVIEW',
    };
  }, [scores, selectedStudentId, ranked]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <label htmlFor="demo-subject" className="text-xs font-semibold text-gray-500 dark:text-gray-400">Subject</label>
        <select
          id="demo-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {DEMO_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full min-w-[440px] border-collapse text-left text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="whitespace-normal py-1.5 font-medium">Student</th>
              <th className="whitespace-normal py-1.5 text-right font-medium">Class /50</th>
              <th className="whitespace-normal py-1.5 text-right font-medium">Exam /50</th>
              <th className="whitespace-normal py-1.5 text-right font-medium">Total</th>
              <th className="whitespace-normal py-1.5 text-right font-medium">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.student.id}
                onClick={() => setSelectedStudentId(r.student.id)}
                className={`cursor-pointer border-t border-gray-100 dark:border-gray-800 ${r.student.id === selectedStudentId ? 'bg-cyan-50 dark:bg-cyan-950/40' : ''}`}
              >
                <td className="whitespace-normal py-2 text-gray-700 dark:text-gray-300">{r.student.firstName} {r.student.lastName}</td>
                <td className="whitespace-normal py-2 text-right">
                  <input
                    type="number" min="0" max="50" value={r.classScore}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateScore(r.student.id, 'classScore', e.target.value)}
                    className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </td>
                <td className="whitespace-normal py-2 text-right">
                  <input
                    type="number" min="0" max="50" value={r.examScore}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateScore(r.student.id, 'examScore', e.target.value)}
                    className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </td>
                <td className="whitespace-normal py-2 text-right font-semibold text-gray-900 dark:text-white">{r.total}</td>
                <td className="whitespace-normal py-2 text-right">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{r.grade}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-400">
          Click a row to preview that student&apos;s report card below. Nothing here is saved — this is a local, in-browser demo.
        </p>
      </div>

      <div className="mt-6">
        <ReportCardPreview data={reportCardData} />
      </div>
    </div>
  );
}
