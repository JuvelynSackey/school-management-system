import { useEffect, useState } from 'react';
import { previewReport, downloadReportCsv } from '../../api/reports.api';
import { listClasses } from '../../api/classes.api';
import { listSubjects } from '../../api/subjects.api';
import { listTerms } from '../../api/terms.api';
import { formatCurrency } from '../../utils/currency';

const REPORT_TYPES = [
  { key: 'students', label: 'Student List' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'results', label: 'Academic Results' },
  { key: 'fees', label: 'Fees' },
];

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

  useEffect(() => {
    setFilters({});
    setRows(null);
  }, [type]);

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

  const handleDownload = () => downloadReportCsv(type, filters, `${type}.csv`);

  const columns = COLUMNS[type];

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
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="toolbar" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {(type === 'students' || type === 'attendance' || type === 'results') && (
            <select value={filters.classId || ''} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
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
        </div>

        {isLoading && <p className="muted">Loading...</p>}
        {error && <div className="alert-error">{error}</div>}

        {rows && !isLoading && (
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
