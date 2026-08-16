import { useAuth } from '../../context/AuthContext';
import AttendanceRecord from './AttendanceRecord';
import MyAttendance from './MyAttendance';

export default function Attendance() {
  const { user } = useAuth();
  return user?.role === 'student' ? <MyAttendance /> : <AttendanceRecord />;
}
