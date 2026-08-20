import axios from 'axios';

const TOKEN_KEY = 'sms_superadmin_token';

// Separate storage key and axios instance from the tenant app's apiClient
// so a super-admin session and a tenant session can coexist in the same
// browser without clobbering each other's token.
export const getSuperAdminToken = () => localStorage.getItem(TOKEN_KEY);
export const setSuperAdminToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearSuperAdminToken = () => localStorage.removeItem(TOKEN_KEY);

const superAdminApiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/super-admin`,
});

superAdminApiClient.interceptors.request.use((config) => {
  const token = getSuperAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default superAdminApiClient;
