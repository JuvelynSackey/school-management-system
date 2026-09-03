import { AnimatePresence, motion } from 'framer-motion';

// Fixed sample data matching reportCardTemplate.service.js's real field
// layout (header, student block, attendance, subjects table, performance
// tiles, remarks, signatures, QR) — a static, non-editable illustration for
// the scroll-driven workflow section, not a live-editable component.
const RESULTS = [
  { subject: 'Mathematics', total: 86, grade: 'A1' },
  { subject: 'English Language', total: 78, grade: 'B2' },
  { subject: 'Integrated Science', total: 81, grade: 'A1' },
  { subject: 'Social Studies', total: 72, grade: 'B2' },
];

const fade = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.35 } };

// revealLevel: 0 = blank, 1 = header, 2 = student block, 3 = subjects table
// rows appear one at a time, 7 = performance tiles, 8 = locked + signatures.
export default function ReportCardPreviewLite({ revealLevel }) {
  const rowsShown = Math.max(0, Math.min(RESULTS.length, revealLevel - 2));

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <AnimatePresence>
        {revealLevel >= 1 && (
          <motion.div key="header" {...fade} className="border-b border-gray-100 pb-3 text-center dark:border-gray-800">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Legend International School</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-400">Terminal Report Card &middot; Term 2</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealLevel >= 2 && (
          <motion.div key="student" {...fade} className="mt-3 flex items-center justify-between text-xs">
            <span className="font-medium text-gray-800 dark:text-gray-200">Ama Mensah &middot; Basic 5A</span>
            {revealLevel >= 8 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Locked</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {revealLevel >= 3 && (
        <table className="mt-3 w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="text-gray-400"><th className="whitespace-normal py-1 font-medium">Subject</th><th className="whitespace-normal py-1 text-right font-medium">Total</th><th className="whitespace-normal py-1 text-right font-medium">Grade</th></tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {RESULTS.slice(0, rowsShown).map((r) => (
                <motion.tr key={r.subject} {...fade} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="whitespace-normal py-1.5 text-gray-700 dark:text-gray-300">{r.subject}</td>
                  <td className="whitespace-normal py-1.5 text-right text-gray-700 dark:text-gray-300">{r.total}</td>
                  <td className="whitespace-normal py-1.5 text-right font-semibold text-cyan-700 dark:text-cyan-400">{r.grade}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      )}

      <AnimatePresence>
        {revealLevel >= 7 && (
          <motion.div key="tiles" {...fade} className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2.5 text-center dark:bg-gray-950">
              <p className="text-[10px] text-gray-400">Average</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">79.25%</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center dark:bg-gray-950">
              <p className="text-[10px] text-gray-400">Position</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">2nd of 32</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealLevel >= 8 && (
          <motion.div key="sig" {...fade} className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] text-gray-400 dark:border-gray-800">
            <span>Class Teacher: Signed</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-[8px] dark:bg-gray-800">QR</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
