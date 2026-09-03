const formatCedis = (n) => `GH₵ ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

// No real precedent in the app — FeeList.jsx only downloads a server-generated
// PDF receipt, with no on-screen preview today. Built fresh for the demo,
// using the same "paper" visual language as ReportCardPreview.jsx.
export default function ReceiptPreview({ studentName, feeType, amount, method, receiptNo, date }) {
  return (
    <div className="receipt-preview">
      <p className="receipt-preview-label">RECEIPT</p>
      <h4>{studentName}</h4>
      <p className="receipt-preview-line">{feeType}</p>
      <div className="receipt-preview-amount">{formatCedis(amount)}</div>
      <p className="receipt-preview-line">Paid in full &middot; {method}</p>
      <div className="receipt-preview-footer">
        <span>Receipt No. {receiptNo}</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
