import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudent } from '../../api/students.api';
import { getStudentAttendance } from '../../api/attendance.api';
import { getStudentResults } from '../../api/results.api';
import { gradeBadgeClass } from '../../utils/grading';

const NOTE_BADGE_CLASS = { medical: 'badge-danger', pickup: 'badge-warning', other: 'badge-neutral' };

export function StudentProfileView({ student }) {
  if (!student) return null;
  const siblingsByGuardian = (student.guardians || []).map((g) => ({
    guardian: g,
    siblings: (g.students || []).filter((s) => s.id !== student.id),
  }));

  return (
    <>
      <div className="panel">
        <h2>
          {student.firstName} {student.lastName}
          {student.house && (
            <span className="badge" style={{ marginLeft: 10, background: `${student.house.colorHex}22`, color: student.house.colorHex }}>
              {student.house.name}
            </span>
          )}
        </h2>
        <table>
          <tbody>
            <tr><th>Admission No.</th><td>{student.admissionNo}</td></tr>
            <tr><th>Email</th><td>{student.user?.email}</td></tr>
            <tr><th>Class</th><td>{student.class ? `${student.class.name} ${student.class.section || ''}` : 'Unassigned'}</td></tr>
            <tr><th>Gender</th><td>{student.gender || '—'}</td></tr>
            <tr><th>Date of Birth</th><td>{student.dateOfBirth || '—'}</td></tr>
            <tr><th>Address</th><td>{student.address || '—'}</td></tr>
            <tr><th>Admission Date</th><td>{student.admissionDate || '—'}</td></tr>
            <tr><th>Status</th><td>{student.status}</td></tr>
          </tbody>
        </table>
      </div>

      {(student.safetyNotes?.length > 0) && (
        <div className="panel">
          <h2>Safety Notes</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {student.safetyNotes.map((n) => (
              <span key={n.id} className={`badge ${NOTE_BADGE_CLASS[n.type] || 'badge-neutral'}`}>
                {n.type === 'pickup' && 'Pickup: '}
                {n.type === 'medical' && 'Medical: '}
                {n.note}
              </span>
            ))}
          </div>
        </div>
      )}

      {(student.guardians?.length > 0) && (
        <div className="panel">
          <h2>Guardians</h2>
          <table>
            <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th>Priority</th><th>Also parent of</th></tr></thead>
            <tbody>
              {siblingsByGuardian.map(({ guardian, siblings }) => (
                <tr key={guardian.id}>
                  <td>{guardian.fullName}</td>
                  <td>{guardian.relationship || '—'}</td>
                  <td>{guardian.phone}</td>
                  <td>{guardian.email || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{guardian.contactPriority}</td>
                  <td>{siblings.length ? siblings.map((s) => `${s.firstName} ${s.lastName}`).join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getStudent(id)
      .then(setStudent)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load student.'))
      .finally(() => setIsLoading(false));
    getStudentAttendance(id).then((data) => setAttendanceSummary(data.summary)).catch(() => {});
    getStudentResults(id).then(setResults).catch(() => {});
  }, [id]);

  return (
    <div>
      <div className="toolbar">
        <h1>Student Profile</h1>
        <Link to="/students" className="btn-secondary">Back to list</Link>
      </div>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && (
        <>
          <StudentProfileView student={student} />

          {attendanceSummary && (
            <div className="panel">
              <h2>Attendance Summary</h2>
              <div className="cards" style={{ marginBottom: 0 }}>
                <div className="card"><div>Present</div><div className="num">{attendanceSummary.Present}</div></div>
                <div className="card"><div>Absent</div><div className="num">{attendanceSummary.Absent}</div></div>
                <div className="card"><div>Late</div><div className="num">{attendanceSummary.Late}</div></div>
                <div className="card"><div>Excused</div><div className="num">{attendanceSummary.Excused}</div></div>
              </div>
            </div>
          )}

          <div className="panel">
            <h2>Results</h2>
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
        </>
      )}
    </div>
  );
}
