const { getLogoDataUrl } = require('./branding.service');

const formatCurrency = (amount) => `GH₵ ${Number(amount).toFixed(2)}`;

// A4 portrait, school-wide financial overview. Same header/palette as
// broadsheetTemplate.service.js (#322c7c indigo, #f5c344 gold) for visual
// consistency across every official PDF the app produces.
const buildFinanceReportPdfHtml = ({ school, term, summary }) => {
  const logoDataUrl = getLogoDataUrl(school.logoUrl);
  const contactLine = [school.address, school.phone && `Tel: ${school.phone}`, school.email]
    .filter(Boolean).join(' &nbsp;|&nbsp; ');
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const categoryRows = summary.byCategory.map((c) => `
    <tr><td>${c.category}</td><td class="num">${formatCurrency(c.assigned)}</td><td class="num">${formatCurrency(c.collected)}</td></tr>
  `).join('');

  const classRows = summary.byClass.map((c) => `
    <tr><td>${c.className}</td><td class="num">${formatCurrency(c.arrears)}</td></tr>
  `).join('');

  const methodRows = summary.byMethod.map((m) => `
    <tr><td>${m.method}</td><td class="center">${m.count}</td><td class="num">${formatCurrency(m.total)}</td></tr>
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
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUrl ? `<img class="school-logo" src="${logoDataUrl}" alt="${school.name || 'School'} logo" />` : ''}
    <h1>${school.name || 'School Name Not Set'}</h1>
    ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
    <p class="title">FINANCIAL OVERVIEW REPORT</p>
  </div>

  <div class="meta">
    <span><strong>Term:</strong> ${term ? `${term.name} (${term.academicYear})` : 'All Terms'}</span>
    <span><strong>Date:</strong> ${generatedDate}</span>
  </div>

  <div class="summary-cards">
    <div class="summary-card"><div class="label">Total Assigned</div><div class="value">${formatCurrency(summary.totalAssigned)}</div></div>
    <div class="summary-card"><div class="label">Total Collected</div><div class="value">${formatCurrency(summary.totalCollected)}</div></div>
    <div class="summary-card"><div class="label">Total Outstanding</div><div class="value">${formatCurrency(summary.totalOutstanding)}</div></div>
  </div>

  <h2 class="section-title">Breakdown by Fee Category</h2>
  ${summary.byCategory.length === 0 ? '<p class="empty-note">No fees recorded.</p>' : `
  <table>
    <thead><tr><th>Category</th><th class="num">Assigned</th><th class="num">Collected</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>`}

  <h2 class="section-title">Outstanding Arrears by Class</h2>
  ${summary.byClass.length === 0 ? '<p class="empty-note">No outstanding arrears.</p>' : `
  <table>
    <thead><tr><th>Class</th><th class="num">Arrears</th></tr></thead>
    <tbody>${classRows}</tbody>
  </table>`}

  <h2 class="section-title">Payments by Method</h2>
  ${summary.byMethod.length === 0 ? '<p class="empty-note">No payments recorded.</p>' : `
  <table>
    <thead><tr><th>Method</th><th class="center">Count</th><th class="num">Total</th></tr></thead>
    <tbody>${methodRows}</tbody>
  </table>`}

  <p class="footer">Generated by JesManage on ${generatedDate}</p>
</body>
</html>
  `;
};

module.exports = { buildFinanceReportPdfHtml };
