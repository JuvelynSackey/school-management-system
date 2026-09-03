import TiltCard from './TiltCard';

// The pre-existing CSS/TiltCard hero mockup — kept as the fallback for
// HeroScene.jsx's three fallback conditions (reduced-motion, <900px viewport,
// still-loading lazy chunk), so there is exactly one fallback visual, not three.
export default function DashboardPreviewMockup() {
  return (
    <TiltCard className="landing-dashboard-preview" maxTilt={7}>
      <div className="dp-titlebar">
        <span className="dp-dot" /><span className="dp-dot" /><span className="dp-dot" />
        <span className="dp-titlebar-label">JesManage — Dashboard</span>
      </div>
      <div className="dp-body">
        <div className="dp-nav-sliver">
          <span className="dp-nav-pill is-active" />
          <span className="dp-nav-pill" />
          <span className="dp-nav-pill" />
          <span className="dp-nav-pill" />
        </div>
        <div className="dp-main">
          <div className="dp-stat-row">
            <div className="dp-stat-tile dp-stat-gold"><span className="dp-stat-num">482</span><span className="dp-stat-label">Students</span></div>
            <div className="dp-stat-tile dp-stat-cyan"><span className="dp-stat-num">96%</span><span className="dp-stat-label">Attendance</span></div>
            <div className="dp-stat-tile"><span className="dp-stat-num">GH₵12k</span><span className="dp-stat-label">Fees Collected</span></div>
          </div>
          <div className="dp-chart">
            <span style={{ height: '40%' }} /><span style={{ height: '65%' }} /><span style={{ height: '52%' }} />
            <span style={{ height: '80%' }} /><span style={{ height: '70%' }} /><span style={{ height: '90%' }} />
          </div>
          <div className="dp-rows">
            <span className="dp-row" /><span className="dp-row" style={{ width: '70%' }} /><span className="dp-row" style={{ width: '85%' }} />
          </div>
        </div>
      </div>
    </TiltCard>
  );
}
