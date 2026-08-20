const { getLogoDataUrl } = require('./branding.service');

// A4, 2 columns x 5 rows = 10 cards per sheet, with a CSS page-break every
// 10th card so a class of any size renders as clean, separate pages rather
// than cards splitting across a page boundary.
const CARDS_PER_PAGE = 10;

const PLACEHOLDER_SVG = 'data:image/svg+xml;utf8,'
  + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#e4e1f5"/><text x="40" y="48" font-size="28" text-anchor="middle" fill="#6a61b0" font-family="sans-serif">?</text></svg>');

const buildCardHtml = ({
  school, student, qrCodeDataUrl, logoDataUrl, accentColor, academicYear,
}) => `
  <div class="card">
    <div class="card-header" style="background:${accentColor}">
      ${logoDataUrl ? `<img class="card-logo" src="${logoDataUrl}" alt="" />` : ''}
      <span class="card-school-name">${school.name}</span>
    </div>
    <div class="card-body">
      <img class="card-photo" src="${student.photoUrl || PLACEHOLDER_SVG}" alt="" />
      <div class="card-info">
        <div class="card-name">${student.firstName} ${student.lastName}</div>
        <div class="card-class">${student.className || ''}</div>
        <div class="card-detail">Adm. No: ${student.admissionNo}</div>
        ${student.waecIndexNumber ? `<div class="card-detail">Index No: ${student.waecIndexNumber}</div>` : ''}
      </div>
      <img class="card-qr" src="${qrCodeDataUrl}" alt="" />
    </div>
    <div class="card-footer" style="border-top-color:${accentColor}">
      <span>${academicYear || ''}</span>
      <span>${school.phone || ''}</span>
    </div>
  </div>
`;

// students: [{ id, firstName, lastName, admissionNo, waecIndexNumber, photoUrl, className }]
// qrByStudentId: Map<studentId, dataUrl>
const buildIdCardsHtml = ({
  school, students, qrByStudentId, academicYear,
}) => {
  const logoDataUrl = getLogoDataUrl(school.logoUrl);
  const accentColor = school.primaryColor || '#322c7c';

  const cardHtmlList = students.map((student) => buildCardHtml({
    school, student, qrCodeDataUrl: qrByStudentId.get(student.id), logoDataUrl, accentColor, academicYear,
  }));

  const pages = [];
  for (let i = 0; i < cardHtmlList.length; i += CARDS_PER_PAGE) {
    const pageCards = cardHtmlList.slice(i, i + CARDS_PER_PAGE).join('');
    pages.push(`<div class="sheet">${pageCards}</div>`);
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; }
    .sheet {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(5, 1fr);
      gap: 10px;
      page-break-after: always;
    }
    .sheet:last-child { page-break-after: auto; }
    .card {
      border: 1px solid #d8d5ee;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 152px;
    }
    .card-header {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 8px; color: #fff;
    }
    .card-logo { width: 20px; height: 20px; object-fit: contain; border-radius: 3px; background: #fff; }
    .card-school-name { font-size: 11px; font-weight: 700; }
    .card-body { display: flex; gap: 8px; padding: 8px; flex: 1; align-items: center; }
    .card-photo { width: 56px; height: 56px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #eee; }
    .card-info { flex: 1; min-width: 0; }
    .card-name { font-size: 12px; font-weight: 700; color: #1a1a2e; }
    .card-class { font-size: 10.5px; color: #555; margin-bottom: 3px; }
    .card-detail { font-size: 9.5px; color: #666; }
    .card-qr { width: 44px; height: 44px; flex-shrink: 0; }
    .card-footer {
      display: flex; justify-content: space-between;
      padding: 4px 8px; font-size: 8.5px; color: #777;
      border-top: 2px solid; margin-top: auto;
    }
  </style>
  </head>
  <body>
    ${pages.join('')}
  </body>
  </html>
  `;
};

module.exports = { buildIdCardsHtml, CARDS_PER_PAGE };
