import { useEffect, useState } from 'react';
import {
  previewReport, downloadReportCsv, downloadBroadsheetPdf, downloadFinanceSummaryPdf, downloadAttendanceSummaryPdf,
} from '../../api/reports.api';
import { listClasses } from '../../api/classes.api';
import { listSubjects } from '../../api/subjects.api';
import { listTerms } from '../../api/terms.api';
import { formatCurrency } from '../../utils/currency';

const REPORT_TYPES = [
  { key: 'students', label: 'Student List' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'results', label: 'Academic Results' },
  { key: 'fees', label: 'Fees' },
  { key: 'financeSummary', label: 'Financial Overview' },
  { key: 'attendanceSummary', label: 'Attendance Summary' },
];

const SUMMARY_TYPES = new Set(['financeSummary', 'attendanceSummary']);
const CSV_FILENAMES = { financeSummary: 'finance-summary.csv', attendanceSummary: 'attendance-summary.csv' };

const COLUMNS = {
  students: [
    { key: 'admissionNo', label: 'Admission No.' }, { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' }, { key: 'class', label: 'Class' }, { key: 'status', label: 'Status' },
  ],
  attendance: [
    { key: 'date', label: 'Date' }, { key: 'admissionNo', label: 'Admission No.' },
    { key: 'name', label: 'Student' }, { key: 'status', label: 'Status' },
  ],
  results: [
    { key: 'admissionNo', label: 'Admission No.' }, { key: 'name', label: 'Student' }, { key: 'subject', label: 'Subject' },
    { key: 'term', label: 'Term' }, { key: 'classScore', label: 'Class Score' }, { key: 'examScore', label: 'Exam Score' },
    { key: 'totalScore', label: 'Total' }, { key: 'grade', label: 'Grade' }, { key: 'subjectPosition', label: 'Position' },
  ],
  fees: [
    { key: 'admissionNo', label: 'Admission No.' }, { key: 'name', label: 'Student' }, { key: 'feeType', label: 'Fee Type' },
    { key: 'amountDue', label: 'Due', format: formatCurrency }, { key: 'amountPaid', label: 'Paid', format: formatCurrency },
    { key: 'balance', label: 'Balance', format: formatCurrency }, { key: 'status', label: 'Status' },
  ],
};

export default function ReportsHub() {
  const [type, setType] = useState('students');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({});
  const [rows, setRows] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
    listSubjects().then(setSubjects).catch(() => {});
    listTerms().then(setTerms).catch(() => {});
  }, []);

  // Switches type, filters, and rows together in one batched update — doing
  // this via a useEffect keyed on `type` left a single render frame where
  // `type` had already changed but `rows` still held the previous report's
  // shape (e.g. a financeSummary object with no `chronicAbsentees`), which
  // crashed SummaryView and got stuck in the error boundary.
  const handleTypeChange = (key) => {
    setType(key);
    setFilters({});
    setRows(null);
  };

  const handlePreview = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await previewReport(type, filters);
      setRows(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => downloadReportCsv(type, filters, CSV_FILENAMES[type] || `${type}.csv`);

  const canDownloadBroadsheet = type === 'results' && filters.classId && filters.subjectId && filters.academicTermId;
  const handleDownloadBroadsheet = () => {
    const classLabel = classes.find((c) => c.id === filters.classId)?.name || 'class';
    const subjectLabel = subjects.find((s) => s.id === filters.subjectId)?.name || 'subject';
    downloadBroadsheetPdf(filters, `broadsheet-${classLabel}-${subjectLabel}.pdf`.replace(/\s+/g, '-'));
  };
  const handleDownloadFinancePdf = () => downloadFinanceSummaryPdf(filters, 'finance-summary.pdf');
  const handleDownloadAttendanceSummaryPdf = () => downloadAttendanceSummaryPdf(filters, 'attendance-summary.pdf');

  const columns = COLUMNS[type];
  const isSummaryType = SUMMARY_TYPES.has(type);

  return (
    <div>
      <div className="toolbar"><h1>Reports</h1></div>

      <div className="panel">
        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={type === t.key ? 'btn-primary' : 'btn-secondary'}
              onClick={() => handleTypeChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {(type === 'students' || type === 'attendance' || type === 'results' || type === 'attendanceSummary') && (
            <select value={filters.classId || ''} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
            </select>
          )}
          {(type === 'financeSummary' || type === 'attendanceSummary') && (
            <select value={filters.academicTermId || ''} onChange={(e) => setFilters({ ...filters, academicTermId: e.target.value })}>
              <option value="">All terms</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {type === 'results' && (
            <>
              <select value={filters.subjectId || ''} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}>
                <option value="">All subjects</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filters.academicTermId || ''} onChange={(e) => setFilters({ ...filters, academicTermId: e.target.value })}>
                <option value="">All terms</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </>
          )}
          {type === 'attendance' && (
            <>
              <input type="date" value={filters.startDate || ''} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              <input type="date" value={filters.endDate || ''} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </>
          )}
          {type === 'fees' && (
            <select value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          )}
          <button type="button" className="btn-secondary" onClick={handlePreview}>Preview</button>
          <button type="button" className="btn-primary" onClick={handleDownload}>Download CSV</button>
          {type === 'results' && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleDownloadBroadsheet}
              disabled={!canDownloadBroadsheet}
              title={canDownloadBroadsheet ? '' : 'Select a class, subject, and term to generate a broadsheet'}
            >
              Download Broadsheet PDF
            </button>
          )}
          {type === 'financeSummary' && (
            <button type="button" className="btn-secondary" onClick={handleDownloadFinancePdf}>Download PDF</button>
          )}
          {type === 'attendanceSummary' && (
            <button type="button" className="btn-secondary" onClick={handleDownloadAttendanceSummaryPdf}>Download PDF</button>
          )}
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}

        {rows && !isLoading && isSummaryType && (
          <SummaryView type={type} summary={rows} />
        )}

        {rows && !isLoading && !isSummaryType && (
          <table>
            <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={i}>{columns.map((c) => <td key={c.key}>{c.format ? c.format(row[c.key]) : row[c.key]}</td>)}</tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={columns.length} className="muted">No data found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryView({ type, summary }) {
  if (type === 'financeSummary') {
    return (
      <div>
        <div className="stat-card-row" style={{ marginBottom: 20 }}>
          <div className="stat-card stat-card-accent"><div><div className="stat-card-label">Total Assigned</div><div className="stat-card-value">{formatCurrency(summary.totalAssigned)}</div></div></div>
          <div className="stat-card stat-card-success"><div><div className="stat-card-label">Total Collected</div><div className="stat-card-value">{formatCurrency(summary.totalCollected)}</div></div></div>
          <div className="stat-card stat-card-warning"><div><div className="stat-card-label">Total Outstanding</div><div className="stat-card-value">{formatCurrency(summary.totalOutstanding)}</div></div></div>
        </div>

        <h3>By Fee Category</h3>
        <table style={{ marginBottom: 20 }}>
          <thead><tr><th>Category</th><th>Assigned</th><th>Collected</th></tr></thead>
          <tbody>
            {summary.byCategory.map((c) => (
              <tr key={c.category}><td>{c.category}</td><td>{formatCurrency(c.assigned)}</td><td>{formatCurrency(c.collected)}</td></tr>
            ))}
            {summary.byCategory.length === 0 && <tr><td colSpan={3} className="muted">No data found.</td></tr>}
          </tbody>
        </table>

        <h3>Outstanding Arrears by Class</h3>
        <table style={{ marginBottom: 20 }}>
          <thead><tr><th>Class</th><th>Arrears</th></tr></thead>
          <tbody>
            {summary.byClass.map((c) => (
              <tr key={c.classId}><td>{c.className}</td><td>{formatCurrency(c.arrears)}</td></tr>
            ))}
            {summary.byClass.length === 0 && <tr><td colSpan={2} className="muted">No outstanding arrears.</td></tr>}
          </tbody>
        </table>

        <h3>Payments by Method</h3>
        <table>
          <thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead>
          <tbody>
            {summary.byMethod.map((m) => (
              <tr key={m.method}><td>{m.method}</td><td>{m.count}</td><td>{formatCurrency(m.total)}</td></tr>
            ))}
            {summary.byMethod.length === 0 && <tr><td colSpan={3} className="muted">No payments recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="stat-card-row" style={{ marginBottom: 20 }}>
        <div className="stat-card stat-card-accent"><div><div className="stat-card-label">Records</div><div className="stat-card-value">{summary.totalRecords}</div></div></div>
        <div className="stat-card stat-card-success"><div><div className="stat-card-label">Overall Attendance</div><div className="stat-card-value">{summary.overallPercent === null ? '—' : `${summary.overallPercent}%`}</div></div></div>
        <div className="stat-card stat-card-warning"><div><div className="stat-card-label">Chronic Absentees</div><div className="stat-card-value">{summary.chronicAbsentees.length}</div></div></div>
      </div>

      <h3>Monthly Trend</h3>
      <table style={{ marginBottom: 20 }}>
        <thead><tr><th>Month</th><th>Present/Total</th><th>%</th></tr></thead>
        <tbody>
          {summary.monthlyTrend.map((m) => (
            <tr key={m.month}><td>{m.month}</td><td>{m.present}/{m.total}</td><td>{m.percent}%</td></tr>
          ))}
          {summary.monthlyTrend.length === 0 && <tr><td colSpan={3} className="muted">No attendance recorded.</td></tr>}
        </tbody>
      </table>

      <h3>Chronic Absenteeism Flag List <span className="muted" style={{ fontWeight: 'normal', fontSize: 12.5 }}>(below 75% attendance, min. 5 recorded days)</span></h3>
      <table>
        <thead><tr><th>Admission No.</th><th>Student</th><th>Class</th><th>Present/Total</th><th>%</th></tr></thead>
        <tbody>
          {summary.chronicAbsentees.map((s) => (
            <tr key={s.studentId}><td>{s.admissionNo || '—'}</td><td>{s.name}</td><td>{s.className || '—'}</td><td>{s.present}/{s.total}</td><td>{s.percent}%</td></tr>
          ))}
          {summary.chronicAbsentees.length === 0 && <tr><td colSpan={5} className="muted">No students flagged.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
