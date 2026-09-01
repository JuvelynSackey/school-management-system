import { useState } from 'react';
import { importPeople, importScores, downloadCredentialsCsv } from '../../api/migration.api';

function PeopleResultTable({ result }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const hasCredentials = result.created.some((r) => r.tempPassword || r.provisionedLogins?.length > 0);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      await downloadCredentialsCsv(result.created);
    } catch (err) {
      setExportError(err.response?.data?.message || 'Failed to export credentials.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <p style={{ margin: 0 }}>
          <strong>{result.createdCount}</strong> of <strong>{result.totalRows}</strong> row(s) created
          {result.failedCount > 0 && <span className="muted"> — {result.failedCount} failed</span>}.
        </p>
        {hasCredentials && (
          <button type="button" className="btn-secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting…' : 'Download Credentials CSV'}
          </button>
        )}
      </div>
      {exportError && <div className="alert-error">{exportError}</div>}

      {result.created.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Created</h3>
          <table style={{ marginBottom: 16 }}>
            <thead><tr><th>Row</th><th>Type</th><th>Name</th><th>ID / No.</th><th>Login</th><th>Notes</th></tr></thead>
            <tbody>
              {result.created.map((r) => (
                <tr key={`${r.row}-${r.name}`}>
                  <td>{r.row}</td>
                  <td>{r.recordType}</td>
                  <td>{r.name}</td>
                  <td>{r.admissionNo || r.staffNo}</td>
                  <td>
                    {r.tempPassword && <div>PIN/Password: <strong>{r.tempPassword}</strong></div>}
                    {r.provisionedLogins?.length > 0 && r.provisionedLogins.map((pl) => (
                      <div key={pl.guardianId} className="muted" style={{ fontSize: 12 }}>
                        Guardian {pl.fullName} ({pl.phone}) — PIN <strong>{pl.pin}</strong>
                      </div>
                    ))}
                  </td>
                  <td>
                    {r.warnings?.length > 0 && r.warnings.map((w) => (
                      <div key={w} className="muted" style={{ fontSize: 12, color: 'var(--warning, #b7791f)' }}>{w}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {result.failed.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Failed</h3>
          <table>
            <thead><tr><th>Row</th><th>Name</th><th>Reason</th></tr></thead>
            <tbody>
              {result.failed.map((r) => (
                <tr key={`${r.row}-${r.name}`}>
                  <td>{r.row}</td>
                  <td>{r.name || '—'}</td>
                  <td>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function ScoresResultTable({ result }) {
  return (
    <div>
      <p style={{ marginBottom: 12 }}>
        <strong>{result.createdCount}</strong> of <strong>{result.totalRows}</strong> score(s) imported
        {result.failedCount > 0 && <span className="muted"> — {result.failedCount} failed</span>}.
      </p>

      {result.created.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Imported</h3>
          <table style={{ marginBottom: 16 }}>
            <thead><tr><th>Row</th><th>Admission No.</th><th>Subject</th><th>Term</th><th>Total</th><th>Grade</th></tr></thead>
            <tbody>
              {result.created.map((r) => (
                <tr key={`${r.row}-${r.studentAdmissionNo}-${r.subject}`}>
                  <td>{r.row}</td>
                  <td>{r.studentAdmissionNo}</td>
                  <td>{r.subject}</td>
                  <td>{r.academicYear} — Term {r.termNumber}</td>
                  <td>{r.totalScore}</td>
                  <td>{r.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {result.failed.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Failed</h3>
          <table>
            <thead><tr><th>Row</th><th>Admission No.</th><th>Reason</th></tr></thead>
            <tbody>
              {result.failed.map((r) => (
                <tr key={`${r.row}-${r.studentAdmissionNo}`}>
                  <td>{r.row}</td>
                  <td>{r.studentAdmissionNo || '—'}</td>
                  <td>{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function ImportPanel({ title, description, onImport, ResultComponent }) {
  const [file, setFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setError('');
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    setError('');
    setResult(null);
    try {
      const data = await onImport(file);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p className="muted" style={{ marginBottom: 12 }}>{description}</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isImporting} />
        <button type="button" className="btn-primary" onClick={handleImport} disabled={!file || isImporting}>
          {isImporting ? 'Importing…' : 'Import'}
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {result && <ResultComponent result={result} />}
    </div>
  );
}

export default function DataMigration() {
  return (
    <div>
      <div className="toolbar"><h1>Data Migration</h1></div>

      <ImportPanel
        title="Students & Staff"
        description={(
          <>
            Upload a legacy spreadsheet export of students and staff — column headers don&apos;t need to match
            exactly (e.g. &quot;DOB&quot;, &quot;Parent Phone&quot;, &quot;Class Enrolled&quot; are all recognized).
            Each row needs a <code>recordType</code> column of either <strong>STUDENT</strong> or <strong>STAFF</strong>.
            Phone numbers are normalized to Ghanaian format and regions are matched against the 16 official regions
            even if spelled loosely (e.g. &quot;ashanti reg&quot;). Existing admission numbers are preserved; a row
            that fails is reported and skipped, never blocking the rest of the file.
          </>
        )}
        onImport={importPeople}
        ResultComponent={PeopleResultTable}
      />

      <ImportPanel
        title="Historical Scores"
        description={(
          <>
            Upload past term marks to backfill history — columns: <code>studentAdmissionNo</code>,{' '}
            <code>subject</code>, <code>academicYear</code>, <code>termNumber</code>, <code>classScore</code>,{' '}
            <code>examScore</code> (optionally <code>className</code>, if different from the student&apos;s current
            class). Imported scores are tagged as migrated and count toward report cards immediately — a term that
            no longer exists in Academic Terms is created automatically.
          </>
        )}
        onImport={importScores}
        ResultComponent={ScoresResultTable}
      />
    </div>
  );
}
