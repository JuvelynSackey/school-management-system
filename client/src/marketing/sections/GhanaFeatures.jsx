// Every item verified against server/src: ghanaRegions.js (exactly 16
// official regions), beceReadiness.service.js, grading.service.js's 50/50
// bands, and the Creche-to-JHS-3 class hierarchy from schoolOnboarding.
const FEATURES = [
  { title: 'GH₵ Billing', desc: 'Fee structures, balances, and receipts in Ghana cedis throughout.' },
  { title: '16-Region Validated', desc: 'Guardian and student addresses checked against Ghana\'s 16 official regions.' },
  { title: 'BECE Candidate Readiness', desc: 'Checks JHS 3 candidates for the fields WAEC registration actually requires — DOB, index number, photo, gender.' },
  { title: 'Creche → JHS 3 Structure', desc: 'Classes follow the real basic-education ladder, not a generic freeform list.' },
  { title: 'NaCCA-Style Grading', desc: 'Class Score (/50) + Exam Score (/50) = Total (/100), the structure Ghanaian basic schools already grade by.' },
];

export default function GhanaFeatures() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">Built for Ghana</h2>
          <p className="mt-3 text-gray-600">Details a generic school platform gets wrong.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
