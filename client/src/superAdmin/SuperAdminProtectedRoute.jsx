import { Navigate, Outlet } from 'react-router-dom';
import { useSuperAdminAuth } from './SuperAdminAuthContext';

export default function SuperAdminProtectedRoute() {
  const { isAuthenticated, isLoading } = useSuperAdminAuth();

  if (isLoading) {
    return <div className="page-loader">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <Outlet />;
}
