import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ResultsEntry from './ResultsEntry';
import TerminalReports from './TerminalReports';
import MyResults from './MyResults';

function StaffResultsView() {
  const [tab, setTab] = useState('entry');
  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <button type="button" className={tab === 'entry' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('entry')}>Score Entry</button>
        <button type="button" className={tab === 'reports' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('reports')}>Terminal Reports</button>
      </div>
      {tab === 'entry' ? <ResultsEntry /> : <TerminalReports />}
    </div>
  );
}

export default function Results() {
  const { user } = useAuth();
  return user?.role === 'student' ? <MyResults /> : <StaffResultsView />;
}
