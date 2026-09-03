import { useMemo, useState } from 'react';
import ReportCardPreview from '../reports/ReportCardPreview';
import {
  DEMO_SCHOOL, DEMO_CLASS, DEMO_STUDENTS, DEMO_SUBJECTS, DEMO_SCORES, GRADING_SCHEME, gradeFor,
} from '../../demo/demoData';

// Local-state-only score entry, mirroring ResultsEntry.jsx's Class Score (/50)
// + Exam Score (/50) input-cell shape. Nothing here reaches the network —
// editing a score only updates this component's own state, which in turn
// drives the shared ReportCardPreview live. This is the one interactive
// touch the demo brief calls out as genuinely novel.
export default function DemoMarksheet() {
  const [subject, setSubject] = useState(DEMO_SUBJECTS[0]);
  const [scores, setScores] = useState(DEMO_SCORES);
  const [selectedStudentId, setSelectedStudentId] = useState(DEMO_STUDENTS[0].id);

  const updateScore = (studentId, field, value) => {
    const clamped = Math.max(0, Math.min(50, Number(value) || 0));
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: { ...prev[studentId][subject], [field]: clamped },
      },
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
    <div className="demo-marksheet">
      <div className="demo-marksheet-controls">
        <label htmlFor="demo-subject">Subject</label>
        <select id="demo-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {DEMO_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Student</th><th>Class Score (/50)</th><th>Exam Score (/50)</th><th>Total</th><th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.student.id}
                className={r.student.id === selectedStudentId ? 'demo-marksheet-row-active' : ''}
                onClick={() => setSelectedStudentId(r.student.id)}
              >
                <td>{r.student.firstName} {r.student.lastName}</td>
                <td>
                  <input
                    type="number" min="0" max="50" value={r.classScore}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateScore(r.student.id, 'classScore', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number" min="0" max="50" value={r.examScore}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateScore(r.student.id, 'examScore', e.target.value)}
                  />
                </td>
                <td><strong>{r.total}</strong></td>
                <td><span className="badge badge-neutral">{r.grade}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
          Click a row to preview that student&apos;s report card below. Nothing here is saved — this is a local, in-browser demo.
        </p>
      </div>
      <ReportCardPreview data={reportCardData} />
    </div>
  );
}
