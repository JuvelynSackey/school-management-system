import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ResultsEntry from './ResultsEntry';
import TerminalReports from './TerminalReports';
import MyResults from './MyResults';
import MarkEntryMatrix from './MarkEntryMatrix';

function StaffResultsView({ isAdmin }) {
  const [tab, setTab] = useState('entry');
  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className={tab === 'entry' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('entry')}>Score Entry</button>
        <button type="button" className={tab === 'reports' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('reports')}>Terminal Reports</button>
        {isAdmin && (
          <button type="button" className={tab === 'matrix' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('matrix')}>Status Matrix</button>
        )}
      </div>
      {tab === 'entry' && <ResultsEntry />}
      {tab === 'reports' && <TerminalReports />}
      {tab === 'matrix' && isAdmin && <MarkEntryMatrix />}
    </div>
  );
}

export default function Results() {
  const { user } = useAuth();
  return user?.role === 'student' ? <MyResults /> : <StaffResultsView isAdmin={user?.role === 'admin'} />;
}
