import { useState } from 'react';
import ReportCardPreview from '../../components/reports/ReportCardPreview';
import ReceiptPreview from '../../components/demo/ReceiptPreview';
import { DEMO_PARENT, buildReportCardData } from '../../demo/demoData';

export default function ParentDemo() {
  const [activeChildId, setActiveChildId] = useState(DEMO_PARENT.children[0].id);
  const child = DEMO_PARENT.children.find((c) => c.id === activeChildId);
  const reportData = buildReportCardData(activeChildId);

  return (
    <div>
      <h1>Welcome, {DEMO_PARENT.fullName}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{DEMO_PARENT.children.length} children linked to your account</p>

      <div className="demo-role-tabs" style={{ marginBottom: 20 }}>
        {DEMO_PARENT.children.map((c) => (
          <button
            key={c.id} type="button"
            className={`demo-role-tab ${activeChildId === c.id ? 'is-active' : ''}`}
            onClick={() => setActiveChildId(c.id)}
          >
            {c.firstName} {c.lastName}
          </button>
        ))}
      </div>

      <div className="stat-card-row">
        <div className="stat-card stat-card-accent">
          <div className="stat-card-icon">📊</div>
          <div><div className="stat-card-label">Term Average</div><div className="stat-card-value">{reportData.averageScore.toFixed(1)}%</div></div>
        </div>
        <div className="stat-card stat-card-cyan">
          <div className="stat-card-icon">📋</div>
          <div><div className="stat-card-label">Attendance</div><div className="stat-card-value">94%</div></div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-icon">💰</div>
          <div><div className="stat-card-label">Fee Balance</div><div className="stat-card-value">GH₵ 0.00</div></div>
        </div>
      </div>

      <div className="demo-parent-grid">
        <div>
          <h3>{child.firstName}&apos;s Term 2 Report Card</h3>
          <ReportCardPreview data={reportData} />
        </div>
        <div>
          <h3>Latest Receipt</h3>
          <ReceiptPreview
            studentName={`${child.firstName} ${child.lastName}`}
            feeType="Term 2 Fees" amount={850} method="Mobile Money"
            receiptNo="RCPT-0421" date="3 September 2026"
          />
        </div>
      </div>
    </div>
  );
}
