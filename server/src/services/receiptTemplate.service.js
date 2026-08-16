const formatCurrency = (amount) => `GH₵ ${Number(amount).toFixed(2)}`;

const receiptNumber = (paymentId) => `RCT-${String(paymentId).padStart(6, '0')}`;

const buildReceiptHtml = ({ payment, fee, student, balance, receivedByName }) => `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 24px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 18px; }
  .header p { margin: 2px 0; font-size: 12px; color: #555; }
  .title { text-align: center; font-size: 14px; font-weight: bold; margin: 12px 0; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 0; }
  td.label { color: #555; width: 45%; }
  td.value { font-weight: bold; text-align: right; }
  .divider { border-top: 1px dashed #999; margin: 14px 0; }
  .total-row td { font-size: 15px; padding-top: 10px; }
  .footer { margin-top: 30px; font-size: 11px; color: #777; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>School Management System</h1>
    <p>Official Payment Receipt</p>
  </div>
  <div class="title">Receipt ${receiptNumber(payment.id)}</div>
  <table>
    <tr><td class="label">Student</td><td class="value">${student.firstName} ${student.lastName}</td></tr>
    <tr><td class="label">Admission No.</td><td class="value">${student.admissionNo}</td></tr>
    <tr><td class="label">Fee Type</td><td class="value">${fee.feeType}</td></tr>
    <tr><td class="label">Payment Date</td><td class="value">${payment.paymentDate}</td></tr>
    <tr><td class="label">Payment Method</td><td class="value">${payment.paymentMethod}</td></tr>
    ${payment.referenceNo ? `<tr><td class="label">Reference No.</td><td class="value">${payment.referenceNo}</td></tr>` : ''}
    <tr><td class="label">Received By</td><td class="value">${receivedByName || '—'}</td></tr>
  </table>
  <div class="divider"></div>
  <table>
    <tr class="total-row"><td class="label">Amount Paid</td><td class="value">${formatCurrency(payment.amountPaid)}</td></tr>
    <tr><td class="label">Balance Remaining</td><td class="value">${formatCurrency(balance)}</td></tr>
  </table>
  <div class="footer">Generated on ${new Date().toLocaleString()} — this is a computer-generated receipt.</div>
</body>
</html>
`;

module.exports = { buildReceiptHtml, receiptNumber, formatCurrency };
