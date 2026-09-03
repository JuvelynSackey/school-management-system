import { useState } from 'react';

// Static, illustrative sample data only — this page never calls the real
// API, so nothing here reflects (or can affect) any actual school's data.
const SAMPLE_METRICS = {
  'Term 1': { students: 462, attendance: 94, fees: 98200 },
  'Term 2': { students: 482, attendance: 96, fees: 128400 },
  'Term 3': { students: 479, attendance: 93, fees: 141900 },
};

const formatCedis = (n) => `GH₵ ${n.toLocaleString('en-GH')}`;

// Mirrors the real pipeline (LandingPage's old How-It-Works steps, and the
// actual Result Entry -> Admin Review -> Approval -> Terminal Report ->
// Parent Access flow in results.controller.js) — kept to 4 steps for a
// breadcrumb, but not skipping the approval gate the real system enforces.
const WORKFLOW_STEPS = [
  'Teacher Enters Scores', 'Admin Approves', 'Report Card Generated', 'Parent Views Report',
];

export default function Demo() {
  const [term, setTerm] = useState('Term 2');
  const metrics = SAMPLE_METRICS[term];

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-center text-xs font-medium text-indigo-700 sm:text-sm">
        Simulated Sandbox — No Network Requests, Pure Local State
      </div>

      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold text-gray-900">See JesManage in Action</h1>
        <p className="mt-3 text-gray-600">
          A sample dashboard with illustrative numbers — nothing below is real school data.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-3">
        {WORKFLOW_STEPS.map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 sm:text-sm">
              {step}
            </span>
            {i < WORKFLOW_STEPS.length - 1 && <span className="text-gray-300">→</span>}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-2 text-xs font-medium text-gray-400">JesManage — Sample Dashboard</span>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Demo Data</div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2">
            {Object.keys(SAMPLE_METRICS).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setTerm(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  term === t ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Students</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.students}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Attendance</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{metrics.attendance}%</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Fees Collected</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatCedis(metrics.fees)}</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Sample data for illustration only. Click a term above to switch.
          </p>
        </div>
      </div>
    </section>
  );
}
