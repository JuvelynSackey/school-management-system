import { useState } from 'react';

// Placeholder copy — swap these for real, permission-cleared testimonials
// before this page goes live. Kept generic on purpose (no fabricated
// specific performance numbers) since they aren't real quotes yet.
const TESTIMONIALS = [
  { quote: 'Report cards that used to take a week now take an afternoon.', name: 'Headteacher, sample private school' },
  { quote: 'Parents can finally see attendance and fees without calling the office.', name: 'School administrator, sample private school' },
  { quote: 'Entering scores offline during a power cut and having it sync later was a relief.', name: 'Class teacher, sample private school' },
];

const emptyForm = { name: '', email: '', message: '' };

export default function About() {
  const [form, setForm] = useState(emptyForm);
  const [sent, setSent] = useState(false);

  // No contact-form backend endpoint exists yet, so this only simulates a
  // staged submission locally — it does not actually send anywhere.
  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setForm(emptyForm);
  };

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-gray-900">What Schools Say</h1>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.name} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm italic leading-relaxed text-gray-700">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-xs font-medium text-gray-400">&mdash; {t.name}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Questions about JesManage, or want a walkthrough for your school? Send us a message
              and we&apos;ll get back to you.
            </p>
            {/* Placeholder — no real support email/hours exist yet; replace before launch. */}
            <div className="mt-6 space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-900">Support:</span> [support email TBD]</p>
              <p><span className="font-medium text-gray-900">Hours:</span> [support hours TBD]</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {sent ? (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                Message received &mdash; we&apos;ll be in touch soon.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    id="contact-name" type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="contact-email" type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    id="contact-message" rows={4} required value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-indigo-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800"
                >
                  Send Message
                </button>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
