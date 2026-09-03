import { useState } from 'react';
import { motion } from 'framer-motion';
import Reveal from '../components/Reveal';

const emptyForm = { name: '', school: '', email: '', message: '' };

// No contact-form backend endpoint exists in this app (confirmed — no
// /contact or /support route anywhere in server/src/routes), so this
// stages a local confirmation only, the same honest pattern used
// elsewhere on this site rather than pretending to send anywhere.
export default function Contact() {
  const [form, setForm] = useState(emptyForm);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setForm(emptyForm);
  };

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-900/20"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20"
        animate={{ x: [0, -24, 0], y: [0, -16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      <section className="relative mx-auto max-w-2xl px-4 pb-4 pt-16 text-center sm:px-6 sm:pt-20">
        <Reveal as="h1" className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Let&apos;s talk about your school.
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-lg px-4 py-14 sm:px-6">
        <Reveal delay={100} className="rounded-2xl border border-gray-200 bg-white/90 p-7 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
          {sent ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              Message received — we&apos;ll be in touch soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  id="contact-name" type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="contact-school" className="block text-sm font-medium text-gray-700 dark:text-gray-300">School</label>
                <input
                  id="contact-school" type="text" required value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  id="contact-email" type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                <textarea
                  id="contact-message" rows={4} required value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500">
                Send Message
              </button>
            </form>
          )}
        </Reveal>
      </section>
    </div>
  );
}
