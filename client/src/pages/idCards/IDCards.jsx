import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { downloadIdCardsPdf } from '../../api/students.api';

export default function IDCards() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    listClasses().then(setClasses).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setSuccess('');
    try {
      const className = classes.find((c) => c.id === classId)?.name || 'class';
      await downloadIdCardsPdf(classId, `id-cards-${className}.pdf`.replace(/\s+/g, '-'));
      setSuccess('ID cards downloaded.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate ID cards.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="toolbar"><h1>Student ID Cards</h1></div>

      <div className="panel" style={{ maxWidth: 480 }}>
        <p className="muted" style={{ marginBottom: 16 }}>
          Pick a class to generate a printable A4 sheet of ID cards for every active student in it — 10 cards per page.
        </p>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <label className="field">
          <span>Class</span>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select a class...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select>
        </label>

        <button
          type="button"
          className="btn-primary"
          disabled={!classId || isGenerating}
          onClick={handleGenerate}
          style={{ marginTop: 12 }}
        >
          {isGenerating ? 'Generating...' : 'Download ID Cards PDF'}
        </button>
      </div>
    </div>
  );
}
