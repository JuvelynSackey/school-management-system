import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ResultsEntry from './ResultsEntry';
import TerminalReports from './TerminalReports';
import MyResults from './MyResults';
import MarkEntryMatrix from './MarkEntryMatrix';

function StaffResultsView({ isAdmin }) {
  const [tab, setTab] = useState('entry');
  // Lets the teacher dashboard's "Enter Scores" cards deep-link straight
  // into a pre-selected class/subject instead of landing on Score Entry's
  // own default (first class alphabetically) and making the teacher pick again.
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';
  const initialSubjectId = searchParams.get('subjectId') || '';
  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className={tab === 'entry' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('entry')}>Score Entry</button>
        <button type="button" className={tab === 'reports' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('reports')}>Terminal Reports</button>
        {isAdmin && (
          <button type="button" className={tab === 'matrix' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('matrix')}>Status Matrix</button>
        )}
      </div>
      {tab === 'entry' && <ResultsEntry initialClassId={initialClassId} initialSubjectId={initialSubjectId} />}
      {tab === 'reports' && <TerminalReports />}
      {tab === 'matrix' && isAdmin && <MarkEntryMatrix />}
    </div>
  );
}

export default function Results() {
  const { user } = useAuth();
  return user?.role === 'student' ? <MyResults /> : <StaffResultsView isAdmin={user?.role === 'admin'} />;
}
