import { useEffect, useState } from 'react';
import { getMyStudentProfile } from '../../api/students.api';
import { StudentProfileView } from './StudentProfile';

export default function MyProfile() {
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyStudentProfile()
      .then(setStudent)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load your profile.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1>My Profile</h1>
      {isLoading && <p className="muted">Loading...</p>}
      {error && <div className="alert-error">{error}</div>}
      {!isLoading && !error && <StudentProfileView student={student} />}
    </div>
  );
}
