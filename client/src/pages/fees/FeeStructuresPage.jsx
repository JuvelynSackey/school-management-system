import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.api';
import { listTerms } from '../../api/terms.api';
import FeeStructures from './FeeStructures';

export default function FeeStructuresPage() {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    listClasses().then(setClasses).catch(() => setClasses([]));
    listTerms().then(setTerms).catch(() => setTerms([]));
  }, []);

  return (
    <div>
      <div className="toolbar"><h1>Fee Structures</h1></div>
      <FeeStructures classes={classes} terms={terms} />
    </div>
  );
}
