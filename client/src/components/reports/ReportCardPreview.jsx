const ordinal = (n) => {
  if (!n) return '—';
  const suffix = (n % 100 > 10 && n % 100 < 14) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  return `${n}${suffix}`;
};

const initialsOf = (firstName, lastName) => `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

// Mirrors server/src/services/reportCardTemplate.service.js's real field layout
// (header, student block, attendance table, subjects table, performance tiles,
// attributes, remarks, signatures, QR footer) so the on-screen preview matches
// what a school actually generates as a PDF. Shared by the landing showcase
// (Phase 2, static data) and the demo sandbox (Phase 4, live-edited data).
export default function ReportCardPreview({ data }) {
  const {
    school, term, nextTermBegins, student, classRow, rollCount, classPosition,
    attendance, results, scheme, totalMarksObtained, averageScore,
    personalAttributeRatings, teacherRemark, headteacherRemark,
    teacherSignatureName, headteacherSignatureName, status, reportId,
  } = data;

  const showPositions = classRow.showPositions !== false;
  const isLocked = status !== 'Draft';
  const totalPossible = results.length * (scheme.classScoreMax + scheme.examScoreMax);
  const subjectsPassed = results.filter((r) => r.grade && r.grade !== 'F9').length;
  const outOfAttendance = attendance?.outOfAttendance ?? 0;
  const totalAttendance = attendance?.totalAttendance ?? 0;
  const absent = Math.max(0, outOfAttendance - totalAttendance);
  const attendanceRate = outOfAttendance > 0 ? ((totalAttendance / outOfAttendance) * 100).toFixed(1) : '—';

  const overallGrade = (() => {
    if (averageScore === null || averageScore === undefined) return '—';
    const sorted = [...scheme.bands].sort((a, b) => b.min - a.min);
    const match = sorted.find((tier) => Number(averageScore) >= tier.min);
    return match ? match.grade : (sorted[sorted.length - 1]?.grade || 'F9');
  })();

  return (
    <div className="report-card-preview">
      {!isLocked && <div className="rcp-watermark">DRAFT — NOT YET APPROVED</div>}

      <div className="rcp-header">
        {school.logoUrl && <img className="rcp-logo" src={school.logoUrl} alt="" />}
        <h3>{school.name}</h3>
        {school.motto && <p className="rcp-motto">{school.motto}</p>}
        {(school.address || school.phone) && (
          <p className="rcp-contact">{[school.address, school.phone && `Tel: ${school.phone}`].filter(Boolean).join('  |  ')}</p>
        )}
        <p className="rcp-title">TERMINAL REPORT CARD</p>
        <p className="rcp-subtitle">{term.name.toUpperCase()}</p>
      </div>

      <div className="rcp-student-block">
        <div className="rcp-avatar">{initialsOf(student.firstName, student.lastName)}</div>
        <table className="rcp-info">
          <tbody>
            <tr>
              <td><strong>Pupil Name:</strong> {student.firstName} {student.lastName}</td>
              <td><strong>Admission No:</strong> {student.admissionNo}</td>
            </tr>
            <tr>
              <td><strong>Class:</strong> {classRow.name} {classRow.section || ''}</td>
              <td>{showPositions ? <><strong>Position in Class:</strong> {ordinal(classPosition)} of {rollCount}</> : <><strong>Roll Count:</strong> {rollCount} Pupils</>}</td>
            </tr>
            <tr>
              <td>{showPositions ? <><strong>Roll Count:</strong> {rollCount} Pupils</> : ''}</td>
              <td><strong>Next Term Begins:</strong> {nextTermBegins}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="rcp-attendance">
        <thead><tr><th>School Days</th><th>Days Present</th><th>Days Absent</th><th>Attendance Rate</th></tr></thead>
        <tbody>
          <tr>
            <td>{outOfAttendance}</td>
            <td>{totalAttendance}</td>
            <td>{absent}</td>
            <td>{attendanceRate === '—' ? '—' : `${attendanceRate}%`}</td>
          </tr>
        </tbody>
      </table>

      <table className="rcp-subjects">
        <thead>
          <tr>
            <th>Subject</th><th>Class ({scheme.classScoreMax})</th><th>Exam ({scheme.examScoreMax})</th>
            <th>Total</th><th>Grade</th>{showPositions && <th>Position</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.subject}>
              <td className="rcp-left">{r.subject}</td>
              <td className="rcp-num">{Number(r.classScore).toFixed(1)}</td>
              <td className="rcp-num">{Number(r.examScore).toFixed(1)}</td>
              <td className="rcp-num">{Number(r.totalScore).toFixed(1)}</td>
              <td>{r.grade || ''}</td>
              {showPositions && <td>{ordinal(r.subjectPosition)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rcp-performance">
        <div className="rcp-perf-item"><span>Total Score</span><strong>{Number(totalMarksObtained || 0)} / {totalPossible}</strong></div>
        <div className="rcp-perf-item"><span>Average</span><strong>{Number(averageScore || 0).toFixed(2)}%</strong></div>
        <div className="rcp-perf-item"><span>Overall Grade</span><strong>{overallGrade}</strong></div>
        {showPositions && <div className="rcp-perf-item"><span>Class Position</span><strong>{ordinal(classPosition)}</strong></div>}
        <div className="rcp-perf-item"><span>Subjects Passed</span><strong>{subjectsPassed} / {results.length}</strong></div>
      </div>

      {personalAttributeRatings?.length > 0 && (
        <table className="rcp-attributes">
          <thead><tr><th>Personal Attribute</th><th>Rating</th></tr></thead>
          <tbody>
            {personalAttributeRatings.map((r) => (
              <tr key={r.name}><td>{r.name}</td><td>{r.rating}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="rcp-remarks">
        <p className="rcp-remarks-label">CLASS TEACHER&apos;S REMARKS</p>
        <p className="rcp-remarks-text">{teacherRemark || '—'}</p>
      </div>
      <div className="rcp-remarks">
        <p className="rcp-remarks-label">HEADTEACHER&apos;S REMARKS</p>
        <p className="rcp-remarks-text">{headteacherRemark || '—'}</p>
      </div>

      <div className="rcp-signatures">
        <div className="rcp-sig-block">
          <div className="rcp-sig-line" />
          <p className="rcp-sig-role">Class Teacher</p>
          <p className="rcp-sig-name">{teacherSignatureName || '—'}</p>
        </div>
        <div className="rcp-sig-block">
          <div className="rcp-sig-line" />
          <p className="rcp-sig-role">Headteacher</p>
          <p className="rcp-sig-name">{headteacherSignatureName || '—'}</p>
        </div>
      </div>

      <div className="rcp-footer">
        <div className="rcp-qr" aria-hidden="true" />
        <span className="rcp-footer-meta">Report ID: {reportId || 'RC-PREVIEW'} &nbsp;·&nbsp; Scan to verify</span>
      </div>
    </div>
  );
}
