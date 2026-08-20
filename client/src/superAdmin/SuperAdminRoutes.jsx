import { Route, Routes } from 'react-router-dom';
import { SuperAdminAuthProvider } from './SuperAdminAuthContext';
import SuperAdminProtectedRoute from './SuperAdminProtectedRoute';
import SuperAdminShell from './SuperAdminShell';
import SuperAdminLogin from './SuperAdminLogin';
import SchoolList from './SchoolList';
import BackupsPage from './BackupsPage';
import DashboardPage from './DashboardPage';
import PlatformUsersPage from './PlatformUsersPage';
import AuditLogPage from './AuditLogPage';
import SecurityCenterPage from './SecurityCenterPage';
import PlatformSettingsPage from './PlatformSettingsPage';

export default function SuperAdminRoutes() {
  return (
    <SuperAdminAuthProvider>
      <Routes>
        <Route path="login" element={<SuperAdminLogin />} />
        <Route element={<SuperAdminProtectedRoute />}>
          <Route element={<SuperAdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="schools" element={<SchoolList />} />
            <Route path="users" element={<PlatformUsersPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="security" element={<SecurityCenterPage />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
            <Route path="backups" element={<BackupsPage />} />
          </Route>
        </Route>
      </Routes>
    </SuperAdminAuthProvider>
  );
}
