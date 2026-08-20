import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as loginRequest, fetchMe } from './api';
import { getSuperAdminToken, setSuperAdminToken, clearSuperAdminToken } from './apiClient';

const SuperAdminAuthContext = createContext(null);

export function SuperAdminAuthProvider({ children }) {
  const [superAdmin, setSuperAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearSuperAdminToken();
    setSuperAdmin(null);
  }, []);

  useEffect(() => {
    const token = getSuperAdminToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setSuperAdmin)
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token, superAdmin: loggedIn } = await loginRequest(email, password);
    setSuperAdminToken(token);
    setSuperAdmin(loggedIn);
    return loggedIn;
  }, []);

  const value = useMemo(() => ({
    superAdmin,
    isLoading,
    isAuthenticated: Boolean(superAdmin),
    login,
    logout,
  }), [superAdmin, isLoading, login, logout]);

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>;
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  }
  return ctx;
}
