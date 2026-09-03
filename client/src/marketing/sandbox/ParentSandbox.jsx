import { useState } from 'react';
import ReportCardPreview from './ReportCardPreview';
import ReceiptPreview from './ReceiptPreview';
import { DEMO_PARENT, buildReportCardData } from './demoData';

export default function ParentSandbox() {
  const [activeChildId, setActiveChildId] = useState(DEMO_PARENT.children[0].id);
  const child = DEMO_PARENT.children.find((c) => c.id === activeChildId);
  const reportData = buildReportCardData(activeChildId);

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {DEMO_PARENT.fullName}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{DEMO_PARENT.children.length} children linked to your account</p>

      <div className="mt-5 flex gap-2">
        {DEMO_PARENT.children.map((c) => (
          <button
            key={c.id} type="button" onClick={() => setActiveChildId(c.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeChildId === c.id ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {c.firstName} {c.lastName}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Term Average</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{reportData.averageScore.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Attendance</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">94%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Fee Balance</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">GH₵ 0.00</p>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{child.firstName}&apos;s Term 2 Report Card</p>
          <ReportCardPreview data={reportData} />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Latest Receipt</p>
          <ReceiptPreview
            studentName={`${child.firstName} ${child.lastName}`}
            feeType="Term 2 Fees" amount={850} method="Mobile Money"
            receiptNo="RCPT-0421" date="3 September 2026"
          />
        </div>
      </div>
    </div>
  );
}
