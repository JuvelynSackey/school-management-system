import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SectionHeading from '../components/SectionHeading';

// Action lists mirror what Dashboard.jsx's AdminDashboard/TeacherDashboard/
// ParentDashboard/StudentDashboard branches actually show for each role —
// not invented functionality.
const ROLES = {
  Admin: ['Action Center', 'Academic Overview', 'Fees', 'Approvals', 'Analytics'],
  Teacher: ['My Classes', 'Score Entry', 'Offline Mode', 'Remarks'],
  Parent: ['Results', 'Attendance', 'Fees', 'Reports'],
  Student: ['Results', 'Attendance', 'Reports', 'School Information'],
};

const ROLE_NAMES = Object.keys(ROLES);

export default function RoleExperienceSection() {
  const [role, setRole] = useState('Admin');

  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Built for Every Role" title="One system, four tailored experiences." />

      <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
        {ROLE_NAMES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              role === r
                ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-8 min-h-[220px] max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-400">{role} view</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {ROLES[role].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
