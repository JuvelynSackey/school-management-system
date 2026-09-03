const ordinal = (n) => {
  if (!n) return '—';
  const suffix = (n % 100 > 10 && n % 100 < 14) ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  return `${n}${suffix}`;
};

const initialsOf = (firstName, lastName) => `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

// Mirrors server/src/services/reportCardTemplate.service.js's real field
// layout (header, student block, attendance table, subjects table,
// performance tiles, remarks, signatures, QR footer). Fixed "paper" look on
// purpose (not theme-aware) — this represents a printed artifact, not app
// chrome, matching every other report-card preview built this session.
export default function ReportCardPreview({ data }) {
  const {
    school, term, student, classRow, rollCount, classPosition,
    attendance, results, scheme, totalMarksObtained, averageScore,
    teacherRemark, headteacherRemark, teacherSignatureName, headteacherSignatureName,
    status, reportId,
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
    <div className="relative mx-auto max-w-lg rounded-xl bg-white p-6 text-[#1a1a1a] shadow-xl">
      {!isLocked && (
        <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] whitespace-nowrap text-2xl font-extrabold tracking-wide text-red-600/10">
          DRAFT — NOT YET APPROVED
        </div>
      )}

      <div className="border-b-[3px] border-[#322c7c] pb-3 text-center">
        <h3 className="text-lg font-bold text-[#322c7c]">{school.name}</h3>
        {school.motto && <p className="mt-0.5 text-xs italic text-[#7c4a24]">{school.motto}</p>}
        <p className="mt-2 text-sm font-bold tracking-[0.14em]">TERMINAL REPORT CARD</p>
        <p className="text-xs tracking-wide text-[#444]">{term.name.toUpperCase()}</p>
      </div>

      <div className="mt-3.5 flex items-center gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#322c7c]/10 text-sm font-bold text-[#322c7c]">
          {initialsOf(student.firstName, student.lastName)}
        </div>
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className="border border-[#ddd] p-1.5"><strong>Pupil:</strong> {student.firstName} {student.lastName}</td>
              <td className="border border-[#ddd] p-1.5"><strong>Adm. No:</strong> {student.admissionNo}</td>
            </tr>
            <tr>
              <td className="border border-[#ddd] p-1.5"><strong>Class:</strong> {classRow.name} {classRow.section || ''}</td>
              <td className="border border-[#ddd] p-1.5">
                {showPositions ? <><strong>Position:</strong> {ordinal(classPosition)} of {rollCount}</> : <><strong>Roll:</strong> {rollCount}</>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="mt-3.5 w-full border-collapse text-center text-[11px]">
        <thead>
          <tr className="bg-[#f4f3f8]">
            <th className="border border-[#ccc] p-1.5">School Days</th>
            <th className="border border-[#ccc] p-1.5">Present</th>
            <th className="border border-[#ccc] p-1.5">Absent</th>
            <th className="border border-[#ccc] p-1.5">Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#ccc] p-1.5">{outOfAttendance}</td>
            <td className="border border-[#ccc] p-1.5">{totalAttendance}</td>
            <td className="border border-[#ccc] p-1.5">{absent}</td>
            <td className="border border-[#ccc] p-1.5">{attendanceRate === '—' ? '—' : `${attendanceRate}%`}</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-3.5 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#322c7c] text-white">
            <th className="p-1.5 text-left">Subject</th>
            <th className="p-1.5 text-right">Cls ({scheme.classScoreMax})</th>
            <th className="p-1.5 text-right">Exam ({scheme.examScoreMax})</th>
            <th className="p-1.5 text-right">Total</th>
            <th className="p-1.5 text-center">Grade</th>
            {showPositions && <th className="p-1.5 text-center">Pos</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.subject} className="border-b border-[#ccc]">
              <td className="p-1.5">{r.subject}</td>
              <td className="p-1.5 text-right">{Number(r.classScore).toFixed(1)}</td>
              <td className="p-1.5 text-right">{Number(r.examScore).toFixed(1)}</td>
              <td className="p-1.5 text-right font-semibold">{Number(r.totalScore).toFixed(1)}</td>
              <td className="p-1.5 text-center">{r.grade || ''}</td>
              {showPositions && <td className="p-1.5 text-center">{ordinal(r.subjectPosition)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border-t-[3px] border-[#f5c344] bg-[#f4f3f8] p-2 text-center">
          <p className="text-[9px] text-gray-500">Total</p>
          <p className="text-sm font-bold text-[#322c7c]">{Number(totalMarksObtained || 0)}/{totalPossible}</p>
        </div>
        <div className="rounded-lg border-t-[3px] border-[#f5c344] bg-[#f4f3f8] p-2 text-center">
          <p className="text-[9px] text-gray-500">Average</p>
          <p className="text-sm font-bold text-[#322c7c]">{Number(averageScore || 0).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border-t-[3px] border-[#f5c344] bg-[#f4f3f8] p-2 text-center">
          <p className="text-[9px] text-gray-500">Grade</p>
          <p className="text-sm font-bold text-[#322c7c]">{overallGrade}</p>
        </div>
        <div className="rounded-lg border-t-[3px] border-[#f5c344] bg-[#f4f3f8] p-2 text-center">
          <p className="text-[9px] text-gray-500">Passed</p>
          <p className="text-sm font-bold text-[#322c7c]">{subjectsPassed}/{results.length}</p>
        </div>
      </div>

      <div className="mt-3.5 rounded-md border border-[#ccc] p-2.5">
        <p className="text-[10px] font-bold tracking-wide text-[#322c7c]">CLASS TEACHER&apos;S REMARKS</p>
        <p className="mt-1 text-xs italic">{teacherRemark || '—'}</p>
      </div>
      <div className="mt-2 rounded-md border border-[#ccc] p-2.5">
        <p className="text-[10px] font-bold tracking-wide text-[#322c7c]">HEADTEACHER&apos;S REMARKS</p>
        <p className="mt-1 text-xs italic">{headteacherRemark || '—'}</p>
      </div>

      <div className="mt-4 flex justify-between gap-8 text-center text-[10px]">
        <div className="flex-1">
          <div className="border-b border-[#333] pb-5" />
          <p className="mt-1 font-bold">Class Teacher</p>
          <p>{teacherSignatureName || '—'}</p>
        </div>
        <div className="flex-1">
          <div className="border-b border-[#333] pb-5" />
          <p className="mt-1 font-bold">Headteacher</p>
          <p>{headteacherSignatureName || '—'}</p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2 border-t border-[#ddd] pt-2 text-[9px] text-gray-500">
        <span
          aria-hidden="true"
          className="h-5 w-5 flex-shrink-0 rounded-sm opacity-40"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #322c7c 0 3px, #fff 3px 6px)' }}
        />
        <span>Report ID: {reportId || 'RC-PREVIEW'} &middot; Scan to verify</span>
      </div>
    </div>
  );
}
