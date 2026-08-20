import { useState } from 'react';
import useApiResource from '../../hooks/useApiResource';
import { getArrearsSummary } from '../../api/fees.api';
import { formatCurrency } from '../../utils/currency';

const CATEGORIES = ['Tuition', 'Feeding', 'ClassActivity', 'PTA', 'Other'];

export default function ArrearsPanel({ classes }) {
  const [classFilter, setClassFilter] = useState('');
  const params = classFilter ? { classId: classFilter } : {};
  const { data: rows, isLoading, error } = useApiResource(() => getArrearsSummary(params), [classFilter]);

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
        </select>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {isLoading && <p className="muted">Loading...</p>}

      {!isLoading && !error && (
        <table>
          <thead>
            <tr>
              <th>Student</th>
              {CATEGORIES.map((c) => <th key={c}>{c}</th>)}
              <th>Total Owed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td>{r.firstName} {r.lastName} <span className="muted" style={{ fontSize: 12 }}>({r.admissionNo})</span></td>
                {CATEGORIES.map((c) => <td key={c}>{r.byCategory[c] > 0 ? formatCurrency(r.byCategory[c]) : '—'}</td>)}
                <td><strong>{formatCurrency(r.total)}</strong></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={CATEGORIES.length + 2} className="muted">No outstanding balances.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
