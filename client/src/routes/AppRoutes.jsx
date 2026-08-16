import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/guards/ProtectedRoute';
import RoleRoute from '../components/guards/RoleRoute';
import AppShell from '../components/layout/AppShell';
import LandingPage from '../pages/landing/LandingPage';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import TermList from '../pages/terms/TermList';
import ClassList from '../pages/classes/ClassList';
import SubjectList from '../pages/subjects/SubjectList';
import HouseList from '../pages/houses/HouseList';
import TeacherList from '../pages/teachers/TeacherList';
import StudentList from '../pages/students/StudentList';
import StudentProfile from '../pages/students/StudentProfile';
import MyProfile from '../pages/students/MyProfile';
import Attendance from '../pages/attendance/Attendance';
import Results from '../pages/results/Results';
import Fees from '../pages/fees/Fees';
import ReportsHub from '../pages/reports/ReportsHub';
import SchoolSettings from '../pages/settings/SchoolSettings';
import Announcements from '../pages/announcements/Announcements';
import Unauthorized from '../pages/errors/Unauthorized';
import NotFound from '../pages/errors/NotFound';
import VerifyDocument from '../pages/verify/VerifyDocument';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify/:type/:id" element={<VerifyDocument />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/terms" element={<TermList />} />
            <Route path="/classes" element={<ClassList />} />
            <Route path="/subjects" element={<SubjectList />} />
            <Route path="/houses" element={<HouseList />} />
            <Route path="/teachers" element={<TeacherList />} />
            <Route path="/reports" element={<ReportsHub />} />
            <Route path="/school-settings" element={<SchoolSettings />} />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'teacher']} />}>
            <Route path="/students" element={<StudentList />} />
            <Route path="/students/:id" element={<StudentProfile />} />
          </Route>

          <Route element={<RoleRoute roles={['student']} />}>
            <Route path="/profile" element={<MyProfile />} />
          </Route>

          <Route path="/attendance" element={<Attendance />} />
          <Route path="/results" element={<Results />} />

          <Route element={<RoleRoute roles={['admin', 'student']} />}>
            <Route path="/fees" element={<Fees />} />
          </Route>

          <Route path="/announcements" element={<Announcements />} />
        </Route>
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
