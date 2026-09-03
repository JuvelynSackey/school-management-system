import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDemo from './AdminDemo';
import TeacherDemo from './TeacherDemo';
import ParentDemo from './ParentDemo';
import StudentDemo from './StudentDemo';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' },
];

// Public sandbox. Nothing on this page or anything it renders talks to the
// real API — client/src/demo/demoData.js is the only data source, and every
// interactive action here is local component state. Safe by construction:
// there is no network path capable of writing to a production school.
export default function DemoPage() {
  const [role, setRole] = useState('admin');
  const navigate = useNavigate();

  return (
    <div className="demo-page">
      <header className="demo-page-header">
        <div className="demo-page-brand">
          <img src="/logo.png" alt="JesManage" className="brand-logo" />
          <span>JesManage</span>
        </div>
        <button type="button" className="landing-btn-primary" onClick={() => navigate('/login')}>Login to JesManage</button>
      </header>

      <div className="demo-banner">
        You&apos;re exploring a live sandbox with sample data — nothing you do here is saved, and no data leaves your browser.
      </div>

      <div className="demo-role-selector">
        <span>Explore JesManage as...</span>
        <div className="demo-role-tabs">
          {ROLES.map((r) => (
            <button
              key={r.value} type="button"
              className={`demo-role-tab ${role === r.value ? 'is-active' : ''}`}
              onClick={() => setRole(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <main className="demo-role-body">
        {role === 'admin' && <AdminDemo />}
        {role === 'teacher' && <TeacherDemo />}
        {role === 'parent' && <ParentDemo />}
        {role === 'student' && <StudentDemo />}
      </main>
    </div>
  );
}
