import DemoMarksheet from './DemoMarksheet';
import DemoRemarkGenerator from './DemoRemarkGenerator';
import { DEMO_CLASS, DEMO_STUDENTS, DEMO_TEACHER } from './demoData';

export default function TeacherSandbox() {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Good morning, {DEMO_TEACHER.title} {DEMO_TEACHER.lastName}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Class Teacher &middot; {DEMO_CLASS.name} {DEMO_CLASS.section} &middot; {DEMO_STUDENTS.length} pupils
      </p>

      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Class Score (/50) and Exam Score (/50) per subject — the same shape used in the real Score Entry screen.
        Offline entries queue locally and sync once the connection returns.
      </div>

      <div className="mt-6"><DemoMarksheet /></div>
      <div className="mt-6"><DemoRemarkGenerator /></div>
    </div>
  );
}
