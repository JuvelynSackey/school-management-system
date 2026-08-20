import { useEffect, useState } from 'react';
import { getResultSheetMatrix } from '../../api/resultSheets.api';
import { listTerms } from '../../api/terms.api';

const STATUS_STYLE = {
  not_started: { icon: '🟥', label: 'Not Started' },
  draft: { icon: '🟦', label: 'Draft' },
  submitted: { icon: '🟨', label: 'Pending Review' },
  rejected: { icon: '🟧', label: 'Rejected' },
  approved: { icon: '🟩', label: 'Approved' },
};

// Stage 7 — a whole-school Classes x Subjects overview so an admin can spot
// which subjects still need attention without opening each class one at a
// time. Read-only: clicking a cell doesn't change anything here; it's a
// map, not a control — actual review/approval still happens on the
// existing per-class Terminal Reports tab.
export default function MarkEntryMatrix() {
  const [terms, setTerms] = useState([]);
  const [academicTermId, setAcademicTermId] = useState('');
  const [matrix, setMatrix] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listTerms().then((rows) => {
      setTerms(rows);
      const current = rows.find((t) => t.isCurrent);
      setAcademicTermId(String((current || rows[0])?.id || ''));
    }).catch(() => setTerms([]));
  }, []);

  useEffect(() => {
    if (!academicTermId) return;
    setError('');
    getResultSheetMatrix({ academicTermId })
      .then(setMatrix)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the matrix.'));
  }, [academicTermId]);

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <label className="field" style={{ maxWidth: 260, marginBottom: 0 }}>
          <span>Term</span>
          <select value={academicTermId} onChange={(e) => setAcademicTermId(e.target.value)}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <span key={key} className="muted" style={{ fontSize: 12.5 }}>{s.icon} {s.label}</span>
        ))}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {matrix && (
        matrix.subjects.length === 0 ? (
          <p className="muted">No subjects are assigned to any class yet.</p>
        ) : (
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  {matrix.subjects.map((s) => <th key={s.id}>{s.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.classes.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name} {c.section || ''}</td>
                    {matrix.subjects.map((s) => {
                      const cell = matrix.cells.find((cl) => cl.classId === c.id && cl.subjectId === s.id);
                      if (!cell) return <td key={s.id} className="muted">—</td>;
                      const style = STATUS_STYLE[cell.status];
                      return <td key={s.id} title={style.label} style={{ textAlign: 'center', fontSize: 18 }}>{style.icon}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
