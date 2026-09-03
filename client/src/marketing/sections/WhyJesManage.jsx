// Every row here is a real, shipped mechanism — not aspirational copy.
// Multi-tenant isolation: compound schoolId indexes across the model layer
// (e.g. student.model.js's { schoolId, admissionNo } unique index).
// Offline entry: the browser-side score queue with sync-on-reconnect.
// NaCCA-style grading: Class Score (/50) + Exam Score (/50) in grading.service.js.
// QR verification: reportCardTemplate.service.js's per-document QR + /verify page.
const ROWS = [
  { label: 'Multi-school data', generic: 'Mixed together in one spreadsheet or database', jesmanage: 'Isolated per school at the query layer — a stray query can\'t reach another school\'s data' },
  { label: 'Score entry with no internet', generic: 'Lost until the connection comes back', jesmanage: 'Queued in the browser, synced automatically once reconnected' },
  { label: 'Grading structure', generic: 'Manual formulas, different per teacher', jesmanage: 'Built-in Class Score (/50) + Exam Score (/50), the structure Ghanaian schools already use' },
  { label: 'Fee currency', generic: 'Manual conversion or hardcoded assumptions', jesmanage: 'Native GH₵ throughout — billing, receipts, reports' },
  { label: 'Document authenticity', generic: 'An unverifiable printout', jesmanage: 'QR-verifiable report cards and receipts, checked against school records' },
];

export default function WhyJesManage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-gray-900">Why JesManage?</h2>
        <p className="mt-3 text-gray-600">Not a generic tool with a currency symbol swapped in.</p>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="whitespace-normal px-5 py-3 font-semibold text-gray-500">&nbsp;</th>
              <th className="whitespace-normal px-5 py-3 font-semibold text-gray-500">Spreadsheets / Generic Software</th>
              <th className="whitespace-normal px-5 py-3 font-semibold text-indigo-700">JesManage</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-b border-gray-100 last:border-0">
                <td className="whitespace-normal px-5 py-4 font-medium text-gray-900">{r.label}</td>
                <td className="whitespace-normal px-5 py-4 text-gray-500">{r.generic}</td>
                <td className="whitespace-normal px-5 py-4 text-gray-900">{r.jesmanage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
