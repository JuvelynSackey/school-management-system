import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/guards/ProtectedRoute';
import RoleRoute from '../components/guards/RoleRoute';
import AppShell from '../components/layout/AppShell';
import LandingPage from '../pages/landing/LandingPage';
import Login from '../pages/auth/Login';
import RegisterSchool from '../pages/auth/RegisterSchool';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import VerifyEmail from '../pages/auth/VerifyEmail';
import ForcedPasswordChange from '../pages/auth/ForcedPasswordChange';
import Dashboard from '../pages/dashboard/Dashboard';
import TermList from '../pages/terms/TermList';
import ClassList from '../pages/classes/ClassList';
import SubjectList from '../pages/subjects/SubjectList';
import TeacherList from '../pages/teachers/TeacherList';
import StudentList from '../pages/students/StudentList';
import AdmissionsList from '../pages/admissions/AdmissionsList';
import StudentProfile from '../pages/students/StudentProfile';
import MyProfile from '../pages/students/MyProfile';
import Attendance from '../pages/attendance/Attendance';
import Results from '../pages/results/Results';
import Fees from '../pages/fees/Fees';
import FeeStructuresPage from '../pages/fees/FeeStructuresPage';
import FeedingChargesPage from '../pages/fees/FeedingChargesPage';
import ArrearsPage from '../pages/fees/ArrearsPage';
import TerminalReports from '../pages/results/TerminalReports';
import ReportsHub from '../pages/reports/ReportsHub';
import SchoolSettings from '../pages/settings/SchoolSettings';
import DataMigration from '../pages/system/DataMigration';
import AuditLogPage from '../pages/audit/AuditLogPage';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import DataQualityCenter from '../pages/analytics/DataQualityCenter';
import BeceReadinessDashboard from '../pages/analytics/BeceReadinessDashboard';
import OperationsOverviewDashboard from '../pages/analytics/OperationsOverviewDashboard';
import AssessmentSheetsPage from '../pages/assessmentSheets/AssessmentSheetsPage';
import MyAccount from '../pages/account/MyAccount';
import Announcements from '../pages/announcements/Announcements';
import ExamTimetable from '../pages/examSchedule/ExamTimetable';
import Intelligence from '../pages/intelligence/Intelligence';
import Parents from '../pages/parents/Parents';
import IDCards from '../pages/idCards/IDCards';
import Unauthorized from '../pages/errors/Unauthorized';
import NotFound from '../pages/errors/NotFound';
import VerifyDocument from '../pages/verify/VerifyDocument';
import SuperAdminRoutes from '../superAdmin/SuperAdminRoutes';
import DemoPage from '../pages/demo/DemoPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register-school" element={<RegisterSchool />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify/:type/:schoolSlug/:id" element={<VerifyDocument />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/super-admin/*" element={<SuperAdminRoutes />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ForcedPasswordChange />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/account" element={<MyAccount />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/admissions" element={<AdmissionsList />} />
            <Route path="/terms" element={<TermList />} />
            <Route path="/classes" element={<ClassList />} />
            <Route path="/subjects" element={<SubjectList />} />
            <Route path="/teachers" element={<TeacherList />} />
            <Route path="/reports" element={<ReportsHub />} />
            <Route path="/id-cards" element={<IDCards />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/analytics/data-quality" element={<DataQualityCenter />} />
            <Route path="/analytics/bece-readiness" element={<BeceReadinessDashboard />} />
            <Route path="/analytics/operations-overview" element={<OperationsOverviewDashboard />} />
            <Route path="/school-settings" element={<SchoolSettings />} />
            <Route path="/migration" element={<DataMigration />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/fee-structures" element={<FeeStructuresPage />} />
            <Route path="/arrears" element={<ArrearsPage />} />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'teacher']} />}>
            <Route path="/students" element={<StudentList />} />
            <Route path="/assessment-sheets" element={<AssessmentSheetsPage />} />
            <Route path="/parents" element={<Parents />} />
            <Route path="/feeding-charges" element={<FeedingChargesPage />} />
            <Route path="/terminal-reports" element={<TerminalReports />} />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'teacher', 'parent']} />}>
            <Route path="/students/:id" element={<StudentProfile />} />
          </Route>

          <Route element={<RoleRoute roles={['student']} />}>
            <Route path="/profile" element={<MyProfile />} />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'teacher', 'student']} />}>
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/results" element={<Results />} />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'student']} />}>
            <Route path="/fees" element={<Fees />} />
          </Route>

          <Route path="/announcements" element={<Announcements />} />
          <Route path="/exam-timetable" element={<ExamTimetable />} />
        </Route>
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
