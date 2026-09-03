import { useState } from 'react';
import DemoMarksheet from '../../components/demo/DemoMarksheet';
import DemoAnnouncementComposer from '../../components/demo/DemoAnnouncementComposer';
import { DEMO_ADMIN_STATS } from '../../demo/demoData';

const formatCedis = (n) => `GH₵ ${Number(n).toLocaleString('en-GH')}`;

const TOOLS = [
  { value: 'results', label: 'Enter Results' },
  { value: 'announce', label: 'Send Announcement' },
];

export default function AdminDemo() {
  const [tool, setTool] = useState('results');

  return (
    <div>
      <h1>Good morning, Admin</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Legend International School &middot; Term 2, 2025/2026</p>

      <div className="stat-card-row">
        <div className="stat-card stat-card-accent">
          <div className="stat-card-icon">👥</div>
          <div><div className="stat-card-label">Students</div><div className="stat-card-value">{DEMO_ADMIN_STATS.students}</div></div>
        </div>
        <div className="stat-card stat-card-cyan">
          <div className="stat-card-icon">📋</div>
          <div><div className="stat-card-label">Attendance Today</div><div className="stat-card-value">{DEMO_ADMIN_STATS.attendanceRate}%</div></div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-icon">💰</div>
          <div><div className="stat-card-label">Fees Collected</div><div className="stat-card-value">{formatCedis(DEMO_ADMIN_STATS.feesCollected)}</div></div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-card-icon">⚠️</div>
          <div><div className="stat-card-label">Fees Outstanding</div><div className="stat-card-value">{formatCedis(DEMO_ADMIN_STATS.feesOutstanding)}</div></div>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Action Center</h3>
        <div className="demo-role-tabs">
          {TOOLS.map((t) => (
            <button
              key={t.value} type="button"
              className={`demo-role-tab ${tool === t.value ? 'is-active' : ''}`}
              onClick={() => setTool(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tool === 'results' && <DemoMarksheet />}
      {tool === 'announce' && <DemoAnnouncementComposer />}
    </div>
  );
}
