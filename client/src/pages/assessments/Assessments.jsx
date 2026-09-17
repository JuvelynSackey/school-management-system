import { useAuth } from '../../context/AuthContext';
import AssessmentBuilder from './AssessmentBuilder';
import MyAssessments from './MyAssessments';

export default function Assessments() {
  const { user } = useAuth();
  return user?.role === 'student' ? <MyAssessments /> : <AssessmentBuilder />;
}
