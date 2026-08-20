const { getLogoDataUrl } = require('./branding.service');

const formatCurrency = (amount) => `GH₵ ${Number(amount).toFixed(2)}`;

// Payment ids are Mongo ObjectIds now, not small sequential integers, so a
// short slice (rather than the old MySQL-era zero-padded integer) is what
// keeps this readable on a printed receipt.
const receiptNumber = (paymentId) => `RCT-${String(paymentId).slice(-8).toUpperCase()}`;

const buildReceiptHtml = ({ school, payment, fee, student, totalFee, balance, receivedByName, qrCodeDataUrl }) => {
  const rctNo = receiptNumber(payment.id);
  const verificationCode = `${rctNo}-${String(payment.id).slice(0, 4).toUpperCase()}`;
  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const contactLine = [school.address, school.phone && `Tel: ${school.phone}`, school.email]
    .filter(Boolean).join(' &nbsp;|&nbsp; ');
  const logoDataUrl = getLogoDataUrl(school.logoUrl);

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 0; }
  .page { display: flex; flex-direction: column; min-height: 640px; padding: 18px 26px; }

  .header { text-align: center; border-bottom: 3px solid #322c7c; padding-bottom: 8px; margin-bottom: 10px; }
  .header .school-logo { width: 34px; height: 34px; object-fit: contain; margin-bottom: 4px; }
  .header h1 { margin: 0; font-size: 18px; color: #322c7c; letter-spacing: 0.5px; }
  .header .motto { margin: 2px 0; font-size: 10px; font-style: italic; color: #7c4a24; }
  .header .contact { margin: 2px 0; font-size: 9.5px; color: #555; }
  .header .title { font-weight: bold; font-size: 12px; letter-spacing: 1.5px; margin: 7px 0 0; }

  .receipt-meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 10px; }
  .receipt-meta strong { color: #322c7c; }

  .section-label {
    font-size: 10px; font-weight: bold; color: #fff; background: #322c7c;
    padding: 3px 8px; letter-spacing: 0.5px; margin: 0 0 5px;
  }
  table.info { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  table.info td { padding: 4px 8px; border: 1px solid #ddd; }
  table.info td.label { color: #666; width: 40%; }
  table.info td.value { font-weight: bold; text-align: right; }

  .amount-block {
    text-align: center; background: #f4f3f8; border-radius: 10px; padding: 10px 12px;
    border-top: 4px solid #f5c344; margin-bottom: 10px;
  }
  .amount-block .label { font-size: 10px; color: #666; letter-spacing: 1px; text-transform: uppercase; }
  .amount-block .value { font-size: 24px; font-weight: 800; color: #322c7c; margin: 3px 0; }
  .amount-block .balance { font-size: 11px; color: #555; }
  .amount-block .balance strong { color: #b91c1c; }

  table.breakdown { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  table.breakdown td { padding: 4px 8px; border-bottom: 1px solid #eee; }
  table.breakdown td.value { text-align: right; }
  table.breakdown tr.final td { font-weight: bold; border-top: 2px solid #322c7c; border-bottom: none; padding-top: 6px; }

  .signatures { display: flex; justify-content: space-between; gap: 30px; margin: 14px 0 10px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #333; height: 24px; }
  .sig-role { margin: 4px 0 0; font-size: 10px; font-weight: bold; }
  .sig-sub { margin: 1px 0; font-size: 9px; color: #666; }

  .footer {
    margin-top: auto; border-top: 1px solid #ddd; padding-top: 6px;
    display: flex; align-items: center; gap: 8px;
  }
  .footer .qr { width: 34px; height: 34px; flex-shrink: 0; }
  .footer .footer-text { flex: 1; text-align: center; }
  .footer .disclaimer { font-size: 8px; color: #888; margin: 0 0 3px; }
  .footer .verify { font-size: 9px; color: #322c7c; font-weight: bold; margin: 0 0 2px; letter-spacing: 0.5px; }
  .footer .meta { font-size: 8px; color: #999; margin: 0; }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${logoDataUrl ? `<img class="school-logo" src="${logoDataUrl}" alt="${school.name || 'School'} logo" />` : ''}
      <h1>${school.name || 'School Name Not Set'}</h1>
      ${school.motto ? `<p class="motto">${school.motto}</p>` : ''}
      ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
      <p class="title">OFFICIAL PAYMENT RECEIPT</p>
    </div>

    <div class="receipt-meta">
      <span>Receipt No.: <strong>${rctNo}</strong></span>
      <span>Date: <strong>${payment.paymentDate}</strong></span>
    </div>

    <p class="section-label">STUDENT INFORMATION</p>
    <table class="info">
      <tr><td class="label">Student Name</td><td class="value">${student.firstName} ${student.lastName}</td></tr>
      <tr><td class="label">Admission No.</td><td class="value">${student.admissionNo}</td></tr>
      <tr><td class="label">Class</td><td class="value">${student.class ? `${student.class.name} ${student.class.section || ''}` : '—'}</td></tr>
      <tr><td class="label">Term</td><td class="value">${fee.academicTerm?.name || '—'}</td></tr>
    </table>

    <p class="section-label">PAYMENT INFORMATION</p>
    <table class="info">
      <tr><td class="label">Fee Type</td><td class="value">${fee.feeType}</td></tr>
      <tr><td class="label">Category</td><td class="value">${fee.category || 'Tuition'}</td></tr>
      <tr><td class="label">Payment Method</td><td class="value">${payment.paymentMethod}</td></tr>
      ${payment.referenceNo ? `<tr><td class="label">Reference No.</td><td class="value">${payment.referenceNo}</td></tr>` : ''}
      <tr><td class="label">Received By</td><td class="value">${receivedByName || '—'}</td></tr>
    </table>

    <div class="amount-block">
      <div class="label">Amount Paid</div>
      <div class="value">${formatCurrency(payment.amountPaid)}</div>
      <div class="balance">Outstanding Balance: <strong>${formatCurrency(balance)}</strong></div>
    </div>

    <table class="breakdown">
      <tr><td>Total Fee</td><td class="value">${formatCurrency(totalFee)}</td></tr>
      <tr><td>Amount Paid (this receipt)</td><td class="value">${formatCurrency(payment.amountPaid)}</td></tr>
      <tr class="final"><td>Outstanding Balance</td><td class="value">${formatCurrency(balance)}</td></tr>
    </table>

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sig-role">Accounts Officer</p>
        <p class="sig-sub">Name: ______________</p>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <p class="sig-role">Parent / Guardian</p>
        <p class="sig-sub">Name: ______________</p>
      </div>
    </div>

    <div class="footer">
      ${qrCodeDataUrl ? `<img class="qr" src="${qrCodeDataUrl}" alt="Scan to verify" />` : ''}
      <div class="footer-text">
        <p class="disclaimer">This is a computer-generated official receipt and does not require a stamp unless otherwise stated by the school.</p>
        <p class="verify">Receipt Verification Code: ${verificationCode}</p>
        <p class="meta">Generated: ${generatedAt}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

module.exports = { buildReceiptHtml, receiptNumber, formatCurrency };
