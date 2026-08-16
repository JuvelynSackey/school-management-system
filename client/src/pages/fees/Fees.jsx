import { useAuth } from '../../context/AuthContext';
import FeeList from './FeeList';
import MyFees from './MyFees';

export default function Fees() {
  const { user } = useAuth();
  return user?.role === 'student' ? <MyFees /> : <FeeList />;
}
