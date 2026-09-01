import { useState } from 'react';
import { importCsv } from '../../api/bulkImport.api';

export default function BulkImport() {
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
      const data = await importCsv(file);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import CSV.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Bulk Import</h1></div>

      <div className="panel">
        <p className="muted" style={{ marginBottom: 12 }}>
          Upload a CSV of students and staff to create accounts in bulk. Each row needs a{' '}
          <code>recordType</code> column of either <strong>STUDENT</strong> or <strong>STAFF</strong>.
          Guardian phone numbers on student rows auto-provision a parent portal login, same as adding a
          student one at a time. A row that fails is reported below and skipped — it never blocks the rest
          of the file.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isImporting} />
          <button type="button" className="btn-primary" onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? 'Importing…' : 'Import'}
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {result && (
          <div>
            <p style={{ marginBottom: 12 }}>
              <strong>{result.createdCount}</strong> of <strong>{result.totalRows}</strong> row(s) created
              {result.failedCount > 0 && <span className="muted"> — {result.failedCount} failed</span>}.
            </p>

            {result.created.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, margin: '16px 0 8px' }}>Created</h3>
                <table style={{ marginBottom: 16 }}>
                  <thead>
                    <tr><th>Row</th><th>Type</th><th>Name</th><th>ID / No.</th><th>Login</th><th>Notes</th></tr>
                  </thead>
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
        )}
      </div>
    </div>
  );
}
