import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import DailyFeedingPanel from './DailyFeedingPanel';

export default function FeedingChargesPage() {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  return (
    <div>
      <div className="toolbar"><h1>Feeding Charges</h1></div>
      <DailyFeedingPanel classes={classes} />
    </div>
  );
}
