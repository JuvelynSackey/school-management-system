const { getLogoDataUrl } = require('./branding.service');

const monthLabel = (ym) => {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

// A4 portrait attendance summary — same header/palette as
// broadsheetTemplate.service.js and financeReportTemplate.service.js.
const buildAttendanceReportPdfHtml = ({
  school, classRow, term, summary,
}) => {
  const logoDataUrl = getLogoDataUrl(school.logoUrl);
  const contactLine = [school.address, school.phone && `Tel: ${school.phone}`, school.email]
    .filter(Boolean).join(' &nbsp;|&nbsp; ');
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const trendRows = summary.monthlyTrend.map((m) => `
    <tr><td>${monthLabel(m.month)}</td><td class="center">${m.present}/${m.total}</td><td class="num">${m.percent}%</td></tr>
  `).join('');

  const absenteeRows = summary.chronicAbsentees.map((s) => `
    <tr><td>${s.admissionNo || '—'}</td><td>${s.name}</td><td>${s.className || '—'}</td><td class="center">${s.present}/${s.total}</td><td class="num">${s.percent}%</td></tr>
  `).join('');

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; padding: 28px 40px; }

  .header { text-align: center; border-bottom: 4px solid #322c7c; padding-bottom: 12px; margin-bottom: 18px; }
  .header .school-logo { width: 48px; height: 48px; object-fit: contain; margin-bottom: 6px; }
  .header h1 { margin: 0; font-size: 24px; color: #322c7c; letter-spacing: 0.5px; }
  .header .contact { margin: 4px 0; font-size: 11px; color: #555; }
  .header .title { font-weight: bold; font-size: 16px; letter-spacing: 2px; margin: 12px 0 4px; }

  .meta { display: flex; justify-content: center; gap: 28px; font-size: 12.5px; margin-bottom: 18px; flex-wrap: wrap; }
  .meta span strong { color: #322c7c; }

  .summary-cards { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 12px 16px; text-align: center; }
  .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-card .value { font-size: 18px; font-weight: bold; color: #322c7c; margin-top: 4px; }

  h2.section-title { font-size: 13px; color: #322c7c; border-bottom: 2px solid #f5c344; padding-bottom: 4px; margin: 24px 0 8px; }

  table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 8px; }
  table th, table td { border: 1px solid #ccc; padding: 7px 10px; }
  table th { background: #322c7c; color: #fff; text-align: left; }
  table td.num, table th.num { text-align: right; }
  table td.center, table th.center { text-align: center; }
  table tr:nth-child(even) td { background: #f7f6fb; }

  .empty-note { text-align: center; color: #777; font-size: 12px; padding: 8px 0; }
  .note { font-size: 10.5px; color: #777; margin: 4px 0 0; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUrl ? `<img class="school-logo" src="${logoDataUrl}" alt="${school.name || 'School'} logo" />` : ''}
    <h1>${school.name || 'School Name Not Set'}</h1>
    ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
    <p class="title">ATTENDANCE &amp; ABSENTEEISM REPORT</p>
  </div>

  <div class="meta">
    <span><strong>Class:</strong> ${classRow ? `${classRow.name} ${classRow.section || ''}` : 'All Classes'}</span>
    <span><strong>Term:</strong> ${term ? `${term.name} (${term.academicYear})` : 'All Terms'}</span>
    <span><strong>Date:</strong> ${generatedDate}</span>
  </div>

  <div class="summary-cards">
    <div class="summary-card"><div class="label">Records</div><div class="value">${summary.totalRecords}</div></div>
    <div class="summary-card"><div class="label">Overall Attendance</div><div class="value">${summary.overallPercent === null ? '—' : `${summary.overallPercent}%`}</div></div>
    <div class="summary-card"><div class="label">Chronic Absentees</div><div class="value">${summary.chronicAbsentees.length}</div></div>
  </div>

  <h2 class="section-title">Monthly Trend</h2>
  ${summary.monthlyTrend.length === 0 ? '<p class="empty-note">No attendance recorded.</p>' : `
  <table>
    <thead><tr><th>Month</th><th class="center">Present/Total</th><th class="num">%</th></tr></thead>
    <tbody>${trendRows}</tbody>
  </table>`}

  <h2 class="section-title">Chronic Absenteeism Flag List</h2>
  <p class="note">Students below 75% attendance for the period, with at least 5 recorded days.</p>
  ${summary.chronicAbsentees.length === 0 ? '<p class="empty-note">No students flagged.</p>' : `
  <table>
    <thead><tr><th>Admission No.</th><th>Student</th><th>Class</th><th class="center">Present/Total</th><th class="num">%</th></tr></thead>
    <tbody>${absenteeRows}</tbody>
  </table>`}

  <p class="footer">Generated by JesManage on ${generatedDate}</p>
</body>
</html>
  `;
};

module.exports = { buildAttendanceReportPdfHtml };
