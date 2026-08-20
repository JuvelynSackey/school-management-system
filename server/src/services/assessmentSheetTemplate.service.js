// Printable A4-landscape class list for a teacher to record scores on paper
// before entering them into JesManage. Deliberately plain: no CA1-CA4
// breakdown, no per-row remarks/signature — just Class /50, Exam /50, Total
// /100, with the verification/signature block at the bottom of each sheet.
const buildAssessmentSheetHtml = ({
  school, term, classRow, subject, teacherName, students, mode,
}) => {
  const rows = students.map((s, i) => `
    <tr>
      <td class="center">${String(i + 1).padStart(2, '0')}</td>
      <td>${s.admissionNo}</td>
      <td>${mode === 'blank' ? '' : `${s.firstName} ${s.lastName}`}</td>
      <td class="blank-cell"></td>
      <td class="blank-cell"></td>
      <td class="blank-cell"></td>
    </tr>
  `).join('');

  return `
    <section class="page">
      <div class="header">
        <h1>${school.name || 'School Name Not Set'}</h1>
        ${school.motto ? `<p class="motto">${school.motto}</p>` : ''}
        <p class="title">CLASS ASSESSMENT SCORE SHEET</p>
      </div>

      <table class="meta">
        <tr><td><strong>Academic Year:</strong> ${term.academicYear}</td><td><strong>Term:</strong> ${term.name}</td></tr>
        <tr><td><strong>Class:</strong> ${classRow.name} ${classRow.section || ''}</td><td><strong>Subject:</strong> ${subject.name}</td></tr>
        <tr><td><strong>Teacher:</strong> ${teacherName || '—'}</td><td><strong>Date:</strong> ________________________</td></tr>
      </table>

      <table class="scores">
        <thead>
          <tr><th class="center">#</th><th>Adm. No.</th><th>Student Name</th><th>Class Score /50</th><th>Exam Score /50</th><th>Total /100</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table class="verify">
        <tr>
          <td><strong>Total Students:</strong> ${students.length}</td>
          <td><strong>Class Score Completed:</strong> ______ / ${students.length}</td>
          <td><strong>Exam Score Completed:</strong> ______ / ${students.length}</td>
        </tr>
      </table>

      <p class="instruction"><strong>Instruction:</strong> Enter the Class Score out of 50 and Examination Score out of 50. Total Score = Class Score + Examination Score.</p>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <p class="sig-role">Teacher&apos;s Signature</p>
          <p class="sig-date">Date: ________________</p>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <p class="sig-role">Checked By</p>
          <p class="sig-date">Date: ________________</p>
        </div>
      </div>
    </section>
  `;
};

const buildAssessmentSheetsPdfHtml = (sheets) => {
  const pages = sheets.map(buildAssessmentSheetHtml).join('');

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  .page { padding: 10px 20px 20px; page-break-after: always; display: flex; flex-direction: column; min-height: 690px; }
  .page:last-child { page-break-after: auto; }

  .header { text-align: center; border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
  .header .motto { margin: 2px 0; font-size: 11px; font-style: italic; color: #444; }
  .header .title { font-weight: bold; font-size: 14px; letter-spacing: 1.5px; margin: 8px 0 0; }

  table.meta { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px; }
  table.meta td { padding: 5px 8px; border: 1px solid #999; width: 50%; }

  table.scores { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.scores thead { display: table-header-group; }
  table.scores th, table.scores td { border: 1px solid #333; padding: 6px 8px; }
  table.scores th { background: #eee; text-align: left; }
  table.scores td.center, table.scores th.center { text-align: center; }
  table.scores td.blank-cell { height: 26px; }

  table.verify { width: 100%; border-collapse: collapse; font-size: 12px; margin: 14px 0 6px; }
  table.verify td { border: 1px solid #999; padding: 6px 8px; }

  .instruction { font-size: 10.5px; color: #444; margin: 0 0 16px; }

  .signatures { display: flex; justify-content: space-between; gap: 60px; margin-top: auto; padding-top: 10px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #333; height: 34px; }
  .sig-role { margin: 6px 0 0; font-size: 11.5px; font-weight: bold; }
  .sig-date { margin: 2px 0; font-size: 10.5px; color: #555; }
</style>
</head>
<body>${pages}</body>
</html>
`;
};

module.exports = { buildAssessmentSheetsPdfHtml };
