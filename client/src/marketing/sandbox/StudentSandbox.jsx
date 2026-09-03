import { useState } from 'react';
import ReportCardPreview from './ReportCardPreview';
import { DEMO_STUDENT_USER, buildReportCardData } from './demoData';

export default function StudentSandbox() {
  const [showReport, setShowReport] = useState(false);
  const reportData = buildReportCardData(DEMO_STUDENT_USER.id);

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Welcome, {DEMO_STUDENT_USER.firstName}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Basic 5 A &middot; Term 2, 2025/2026</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Term Average</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{reportData.averageScore.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Class Position</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{reportData.classPosition} of {reportData.rollCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Attendance</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">94%</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="font-semibold text-gray-900 dark:text-white">Term 2 Report Card</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Available once approved by your headteacher.</p>
        <button
          type="button" onClick={() => setShowReport((v) => !v)}
          className="mt-3 rounded-full bg-indigo-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800"
        >
          {showReport ? 'Hide Report Card' : 'View Report Card'}
        </button>
      </div>

      {showReport && <div className="mt-6"><ReportCardPreview data={reportData} /></div>}
    </div>
  );
}
