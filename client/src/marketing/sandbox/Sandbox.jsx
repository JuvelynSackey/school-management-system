import { useState } from 'react';
import AdminSandbox from './AdminSandbox';
import TeacherSandbox from './TeacherSandbox';
import ParentSandbox from './ParentSandbox';
import StudentSandbox from './StudentSandbox';

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
];

// Public sandbox — nothing here or anything it renders talks to the real
// API. client/src/marketing/sandbox/demoData.js is the only data source,
// and every interactive action is local component state. Safe by
// construction: there is no network path capable of writing to a real school.
export default function Sandbox({ initialRole = 'admin' }) {
  const [role, setRole] = useState(initialRole);

  return (
    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:p-6">
      <div className="rounded-xl bg-indigo-50 px-4 py-2.5 text-center text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 sm:text-sm">
        Local, in-browser sandbox — nothing you do here is saved, and no data leaves your browser.
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value} type="button" onClick={() => setRole(r.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              role === r.value ? 'bg-indigo-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 dark:bg-gray-950 sm:p-6">
        {role === 'admin' && <AdminSandbox />}
        {role === 'teacher' && <TeacherSandbox />}
        {role === 'parent' && <ParentSandbox />}
        {role === 'student' && <StudentSandbox />}
      </div>
    </div>
  );
}
