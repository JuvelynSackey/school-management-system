const formatCedis = (n) => `GH₵ ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;

// No real on-screen receipt-preview precedent in the app (FeeList.jsx only
// downloads a server-generated PDF) — same fixed "paper" treatment as
// ReportCardPreview since it represents a printed artifact.
export default function ReceiptPreview({ studentName, feeType, amount, method, receiptNo, date }) {
  return (
    <div className="mx-auto max-w-xs rounded-xl bg-white p-6 text-center text-[#1a1a1a] shadow-xl">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-gray-400">RECEIPT</p>
      <h4 className="mt-2 text-base font-bold text-[#322c7c]">{studentName}</h4>
      <p className="mt-1 text-sm text-gray-500">{feeType}</p>
      <div className="mt-3 text-3xl font-extrabold text-[#322c7c]">{formatCedis(amount)}</div>
      <p className="mt-1 text-sm text-gray-500">Paid in full &middot; {method}</p>
      <div className="mt-4 flex justify-between border-t border-dashed border-gray-300 pt-3 text-[10px] text-gray-400">
        <span>Receipt No. {receiptNo}</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
