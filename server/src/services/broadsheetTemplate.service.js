const { getLogoDataUrl } = require('./branding.service');

// Same helper as reportCardTemplate.service.js — kept local rather than
// shared, matching how small per-template helpers already work in this app.
const ORDINALS = { 1: 'st', 2: 'nd', 3: 'rd' };
const ordinal = (n) => {
  if (!n) return '—';
  const suffix = ORDINALS[n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th';
  return `${n}${suffix}`;
};

// A4 landscape, single class/subject/term per document — rendered via
// pdf.service.js's renderHtmlToPdfBuffer, same pipeline as report cards, ID
// cards, and fee receipts, so every official PDF in the app shares one
// rendering path. Palette (#322c7c indigo, #f5c344 gold) matches
// reportCardTemplate.service.js exactly, for visual consistency across
// documents a school might print side by side.
const buildBroadsheetPdfHtml = ({
  school, classRow, subject, term, rows,
}) => {
  const logoDataUrl = getLogoDataUrl(school.logoUrl);
  const contactLine = [school.address, school.phone && `Tel: ${school.phone}`, school.email]
    .filter(Boolean).join(' &nbsp;|&nbsp; ');
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const tableRows = rows.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${r.name}</td>
      <td class="num">${r.classScore !== null && r.classScore !== undefined ? Number(r.classScore).toFixed(1) : '—'}</td>
      <td class="num">${r.examScore !== null && r.examScore !== undefined ? Number(r.examScore).toFixed(1) : '—'}</td>
      <td class="num">${r.totalScore !== null && r.totalScore !== undefined ? Number(r.totalScore).toFixed(1) : '—'}</td>
      <td class="center">${r.grade || '—'}</td>
      <td class="center">${ordinal(r.position)}</td>
    </tr>
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
  .header .motto { margin: 4px 0; font-size: 12px; font-style: italic; color: #7c4a24; }
  .header .contact { margin: 4px 0; font-size: 11px; color: #555; }
  .header .title { font-weight: bold; font-size: 16px; letter-spacing: 2px; margin: 12px 0 4px; }

  .meta { display: flex; justify-content: center; gap: 28px; font-size: 12.5px; margin-bottom: 18px; flex-wrap: wrap; }
  .meta span strong { color: #322c7c; }

  table.broadsheet { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 24px; }
  table.broadsheet th, table.broadsheet td { border: 1px solid #ccc; padding: 8px 10px; }
  table.broadsheet th { background: #322c7c; color: #fff; text-align: left; }
  table.broadsheet td.num, table.broadsheet th.num { text-align: right; }
  table.broadsheet td.center, table.broadsheet th.center { text-align: center; }
  table.broadsheet tr:nth-child(even) td { background: #f7f6fb; }

  .empty-note { text-align: center; color: #777; font-size: 13px; padding: 24px 0 32px; }

  .signatures { display: flex; justify-content: space-between; gap: 80px; margin: 32px 0 12px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #333; height: 44px; }
  .sig-role { margin: 6px 0 0; font-size: 12.5px; font-weight: bold; }
  .sig-date { margin: 2px 0; font-size: 11px; color: #666; }

  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUrl ? `<img class="school-logo" src="${logoDataUrl}" alt="${school.name || 'School'} logo" />` : ''}
    <h1>${school.name || 'School Name Not Set'}</h1>
    ${school.motto ? `<p class="motto">${school.motto}</p>` : ''}
    ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
    <p class="title">CLASS BROADSHEET</p>
  </div>

  <div class="meta">
    <span><strong>Class:</strong> ${classRow.name} ${classRow.section || ''}</span>
    <span><strong>Subject:</strong> ${subject.name}</span>
    <span><strong>Term:</strong> ${term.name} (${term.academicYear})</span>
    <span><strong>Date:</strong> ${generatedDate}</span>
  </div>

  ${rows.length === 0 ? '<p class="empty-note">No results recorded for this class/subject/term yet.</p>' : `
  <table class="broadsheet">
    <thead>
      <tr>
        <th class="center">#</th>
        <th>Student Name</th>
        <th class="num">Class Score (/50)</th>
        <th class="num">Exam Score (/50)</th>
        <th class="num">Total (/100)</th>
        <th class="center">Grade</th>
        <th class="center">Position</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  `}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <p class="sig-role">Subject Teacher</p>
      <p class="sig-date">Date: ______________</p>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <p class="sig-role">Headteacher</p>
      <p class="sig-date">Date: ______________</p>
    </div>
  </div>

  <p class="footer">Generated by JesManage on ${generatedDate}</p>
</body>
</html>
  `;
};

module.exports = { buildBroadsheetPdfHtml };
