import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import ArrearsPanel from './ArrearsPanel';

export default function ArrearsPage() {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  return (
    <div>
      <div className="toolbar"><h1>Arrears</h1></div>
      <ArrearsPanel classes={classes} />
    </div>
  );
}
