import { useState } from 'react';
import ReportCardPreview from '../../components/reports/ReportCardPreview';
import { DEMO_STUDENT_USER, buildReportCardData } from '../../demo/demoData';

export default function StudentDemo() {
  const [showReport, setShowReport] = useState(false);
  const reportData = buildReportCardData(DEMO_STUDENT_USER.id);

  return (
    <div>
      <h1>Welcome, {DEMO_STUDENT_USER.firstName}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Basic 5 A &middot; Term 2, 2025/2026</p>

      <div className="stat-card-row">
        <div className="stat-card stat-card-accent">
          <div className="stat-card-icon">📊</div>
          <div><div className="stat-card-label">Term Average</div><div className="stat-card-value">{reportData.averageScore.toFixed(1)}%</div></div>
        </div>
        <div className="stat-card stat-card-cyan">
          <div className="stat-card-icon">🏆</div>
          <div><div className="stat-card-label">Class Position</div><div className="stat-card-value">{reportData.classPosition} of {reportData.rollCount}</div></div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-icon">📋</div>
          <div><div className="stat-card-label">Attendance</div><div className="stat-card-value">94%</div></div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Term 2 Report Card</h3>
        <p className="muted" style={{ fontSize: 13 }}>Available once approved by your headteacher.</p>
        <button type="button" className="btn-primary" onClick={() => setShowReport((v) => !v)}>
          {showReport ? 'Hide Report Card' : 'View Report Card'}
        </button>
      </div>

      {showReport && <ReportCardPreview data={reportData} />}
    </div>
  );
}
