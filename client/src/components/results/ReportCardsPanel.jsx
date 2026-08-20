import { useEffect, useState } from 'react';
import { listPublishedReportsForStudent, downloadStudentReportCard } from '../../api/terminalReports.api';

export default function ReportCardsPanel({ studentId }) {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) return;
    listPublishedReportsForStudent(studentId).then(setReports).catch(() => setReports([]));
  }, [studentId]);

  const handleDownload = async (report) => {
    setError('');
    try {
      await downloadStudentReportCard(report.id, `report-card-${report.academicTerm?.name || 'term'}.pdf`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download report card.');
    }
  };

  if (!reports) return null;

  return (
    <div className="panel">
      <h2>Report Cards</h2>
      {error && <div className="alert-error">{error}</div>}
      {reports.length === 0 && <p className="muted">No report cards published yet.</p>}
      {reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map((r) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{r.academicTerm?.name || 'Term'}</span>
              <button type="button" className="link-btn" onClick={() => handleDownload(r)}>Download PDF</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
