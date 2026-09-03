import DemoMarksheet from '../../components/demo/DemoMarksheet';
import DemoRemarkGenerator from '../../components/demo/DemoRemarkGenerator';
import { DEMO_CLASS, DEMO_STUDENTS, DEMO_TEACHER } from '../../demo/demoData';

export default function TeacherDemo() {
  return (
    <div>
      <h1>Good morning, {DEMO_TEACHER.title} {DEMO_TEACHER.lastName}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Class Teacher &middot; {DEMO_CLASS.name} {DEMO_CLASS.section} &middot; {DEMO_STUDENTS.length} pupils
      </p>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Enter Results</h3>
        <p className="muted" style={{ fontSize: 13 }}>
          Class Score (/50) and Exam Score (/50) per subject — the same shape used in the real Score Entry screen.
        </p>
      </div>

      <DemoMarksheet />
      <DemoRemarkGenerator />
    </div>
  );
}
