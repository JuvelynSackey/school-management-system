const { SCALE } = require('./grading.service');

const ORDINALS = { 1: 'st', 2: 'nd', 3: 'rd' };
const ordinal = (n) => {
  if (!n) return '—';
  const suffix = ORDINALS[n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th';
  return `${n}${suffix}`;
};

const initialsOf = (firstName, lastName) => `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

// e.g. A1 Excellent | B2 Very Good | B3 Good | C4-C6 Credit | D7-E8 Pass | F9 Fail
const gradingKeyLine = () => {
  const seen = new Set();
  const parts = [];
  SCALE.forEach(({ grade, label }) => {
    const key = label;
    if (seen.has(key)) return;
    seen.add(key);
    const gradesForLabel = SCALE.filter((s) => s.label === label).map((s) => s.grade);
    const gradeRange = gradesForLabel.length > 1 ? `${gradesForLabel[0]}-${gradesForLabel[gradesForLabel.length - 1]}` : gradesForLabel[0];
    parts.push(`${gradeRange} ${label}`);
  });
  return parts.join(' | ');
};

const overallGrade = (averageScore) => {
  if (averageScore === null || averageScore === undefined) return '—';
  const match = SCALE.find((tier) => Number(averageScore) >= tier.min);
  return match ? match.grade : 'F9';
};

const buildStudentPageHtml = ({ school, classRow, term, nextTerm, report, results, totalPossible, rollCount, qrCodeDataUrl }) => {
  const isLocked = report.status === 'Locked';
  const watermark = !isLocked ? '<div class="watermark">DRAFT — NOT YET APPROVED</div>' : '';

  const rows = results.map((r) => `
    <tr>
      <td>${r.subject?.name || ''}</td>
      <td class="num">${Number(r.classScore).toFixed(1)}</td>
      <td class="num">${Number(r.examScore).toFixed(1)}</td>
      <td class="num">${Number(r.totalScore).toFixed(1)}</td>
      <td class="center">${r.grade || ''}</td>
      <td class="center">${ordinal(r.subjectPosition)}</td>
    </tr>
  `).join('');

  const nextTermBegins = nextTerm?.startDate || 'To be announced';
  const totalAttendance = report.totalAttendance ?? 0;
  const outOfAttendance = report.outOfAttendance ?? 0;
  const absent = Math.max(0, outOfAttendance - totalAttendance);
  const attendanceRate = outOfAttendance > 0 ? ((totalAttendance / outOfAttendance) * 100).toFixed(1) : '—';

  const subjectsPassed = results.filter((r) => r.grade && r.grade !== 'F9').length;

  const reportId = `RC-${term.academicYear.split('/')[0]}-${report.id.slice(-6).toUpperCase()}`;
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const signedDate = isLocked && report.updatedAt ? new Date(report.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const contactLine = [school.address, school.phone && `Tel: ${school.phone}`, school.email]
    .filter(Boolean).join(' &nbsp;|&nbsp; ');

  return `
    <section class="page">
      ${watermark}
      <div class="header">
        <h1>${school.name || 'School Name Not Set'}</h1>
        ${school.motto ? `<p class="motto">${school.motto}</p>` : ''}
        ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
        <p class="title">TERMINAL REPORT CARD</p>
        <p class="subtitle">${term.name.toUpperCase()}</p>
      </div>

      <div class="student-block">
        <div class="avatar">${initialsOf(report.student.firstName, report.student.lastName)}</div>
        <table class="info">
          <tr>
            <td><strong>Pupil Name:</strong> ${report.student.firstName} ${report.student.lastName}</td>
            <td><strong>Admission No:</strong> ${report.student.admissionNo}</td>
          </tr>
          <tr>
            <td><strong>Class:</strong> ${classRow.name} ${classRow.section || ''}</td>
            <td><strong>Position in Class:</strong> ${ordinal(report.classPosition)} of ${rollCount}</td>
          </tr>
          <tr>
            <td><strong>Roll Count:</strong> ${rollCount} Pupils</td>
            <td><strong>Next Term Begins:</strong> ${nextTermBegins}</td>
          </tr>
        </table>
      </div>

      <table class="attendance-table">
        <thead><tr><th>School Days</th><th>Days Present</th><th>Days Absent</th><th>Attendance Rate</th></tr></thead>
        <tbody><tr>
          <td class="center">${outOfAttendance}</td>
          <td class="center">${totalAttendance}</td>
          <td class="center">${absent}</td>
          <td class="center">${attendanceRate === '—' ? '—' : `${attendanceRate}%`}</td>
        </tr></tbody>
      </table>

      <table class="subjects">
        <thead>
          <tr><th>Subject</th><th>Class (50%)</th><th>Exam (50%)</th><th>Total</th><th>Grade</th><th>Position</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="grading-key"><strong>Grading Key:</strong> ${gradingKeyLine()}</p>

      <div class="performance-summary">
        <div class="perf-item"><span>Average</span><strong>${Number(report.averageScore || 0).toFixed(2)}%</strong></div>
        <div class="perf-item"><span>Overall Grade</span><strong>${overallGrade(report.averageScore)}</strong></div>
        <div class="perf-item"><span>Class Position</span><strong>${ordinal(report.classPosition)}</strong></div>
        <div class="perf-item"><span>Subjects Passed</span><strong>${subjectsPassed} / ${results.length}</strong></div>
      </div>

      <div class="remarks-box">
        <p class="remarks-label">CLASS TEACHER&apos;S REMARKS</p>
        <p class="remarks-text">${report.teacherRemark || '—'}</p>
      </div>
      <div class="remarks-box">
        <p class="remarks-label">HEADTEACHER&apos;S REMARKS</p>
        <p class="remarks-text">${report.headteacherRemark || '—'}</p>
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <p class="sig-role">Class Teacher</p>
          <p class="sig-name">${report.teacherSignatureName || '—'}</p>
          <p class="sig-date">Date: ${report.teacherSignatureName ? generatedDate : '—'}</p>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <p class="sig-role">Headteacher</p>
          <p class="sig-name">${report.headteacherSignatureName || '—'}</p>
          <p class="sig-date">Date: ${signedDate}</p>
        </div>
      </div>

      <div class="footer">
        <div class="footer-verify">
          ${qrCodeDataUrl ? `<img class="qr" src="${qrCodeDataUrl}" alt="Scan to verify" />` : ''}
          <span class="qr-label">Scan to verify</span>
        </div>
        <div class="footer-meta">
          <span>Report ID: ${reportId}</span>
          <span>Generated: ${generatedDate}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </section>
  `;
};

const buildReportCardsPdfHtml = ({ school, classRow, term, nextTerm, reports, resultsByStudent, totalPossible, rollCount, qrByReportId }) => {
  const pages = reports.map((report) => buildStudentPageHtml({
    school,
    classRow,
    term,
    nextTerm,
    report,
    results: resultsByStudent.get(report.studentId.toString()) || [],
    totalPossible,
    rollCount,
    qrCodeDataUrl: qrByReportId?.get(report.id),
  })).join('');

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; }
  .page {
    position: relative; padding: 30px 36px; page-break-after: always;
    display: flex; flex-direction: column; min-height: 1060px;
  }
  .page:last-child { page-break-after: auto; }

  .watermark {
    position: absolute; top: 45%; left: 50%;
    transform: translate(-50%, -50%) rotate(-32deg);
    font-size: 42px; font-weight: 800; letter-spacing: 3px;
    color: rgba(220, 38, 38, 0.14);
    white-space: nowrap; pointer-events: none;
  }

  .header { text-align: center; border-bottom: 4px solid #322c7c; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 28px; color: #322c7c; letter-spacing: 0.5px; }
  .header .motto { margin: 4px 0; font-size: 13px; font-style: italic; color: #7c4a24; }
  .header .contact { margin: 4px 0; font-size: 12px; color: #555; }
  .header .title { font-weight: bold; font-size: 18px; letter-spacing: 2px; margin: 14px 0 4px; }
  .header .subtitle { font-size: 13px; letter-spacing: 1px; color: #444; margin: 0; }

  .student-block { display: flex; align-items: center; gap: 20px; margin-bottom: 18px; }
  .avatar {
    flex-shrink: 0; width: 64px; height: 64px; border-radius: 50%;
    background: rgba(50,44,124,0.1); color: #322c7c;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 20px;
  }
  table.info { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.info td { padding: 7px 10px; border: 1px solid #ddd; width: 50%; }

  table.attendance-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px; }
  table.attendance-table th, table.attendance-table td { border: 1px solid #ccc; padding: 8px 8px; }
  table.attendance-table th { background: #f4f3f8; }
  table.attendance-table td.center, table.attendance-table th { text-align: center; }

  table.subjects { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  table.subjects th, table.subjects td { border: 1px solid #ccc; padding: 9px 10px; }
  table.subjects th { background: #322c7c; color: #fff; text-align: left; }
  table.subjects td.num { text-align: right; }
  table.subjects td.center { text-align: center; }
  .grading-key { font-size: 11px; color: #555; margin: 0 0 20px; }

  .performance-summary { display: flex; gap: 14px; margin-bottom: 20px; }
  .perf-item {
    flex: 1; text-align: center; background: #f4f3f8; border-radius: 8px; padding: 16px 8px;
    border-top: 4px solid #f5c344;
  }
  .perf-item span { display: block; font-size: 11px; color: #666; margin-bottom: 6px; }
  .perf-item strong { font-size: 20px; color: #322c7c; }

  .remarks-box { border: 1px solid #ccc; border-radius: 6px; padding: 12px 14px; margin-bottom: 16px; min-height: 60px; }
  .remarks-label { margin: 0 0 6px; font-size: 11.5px; font-weight: bold; color: #322c7c; letter-spacing: 0.5px; }
  .remarks-text { margin: 0; font-size: 13px; font-style: italic; }

  .signatures { display: flex; justify-content: space-between; gap: 60px; margin: 28px 0 20px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #333; height: 40px; }
  .sig-role { margin: 6px 0 0; font-size: 12px; font-weight: bold; }
  .sig-name { margin: 2px 0; font-size: 12px; }
  .sig-date { margin: 2px 0; font-size: 11px; color: #666; }

  .footer {
    display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd; padding-top: 10px;
    margin-top: auto; font-size: 10.5px; color: #777;
  }
  .footer-verify { display: flex; align-items: center; gap: 6px; }
  .footer-verify .qr { width: 36px; height: 36px; }
  .footer-verify .qr-label { font-size: 9px; }
  .footer-meta { display: flex; gap: 16px; }
</style>
</head>
<body>${pages}</body>
</html>
`;
};

module.exports = { buildReportCardsPdfHtml };
