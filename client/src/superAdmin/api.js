import superAdminApiClient from './apiClient';

export const login = (email, password) => superAdminApiClient.post('/auth/login', { email, password }).then((res) => res.data.data);
export const fetchMe = () => superAdminApiClient.get('/auth/me').then((res) => res.data.data);

export const getDashboard = () => superAdminApiClient.get('/dashboard').then((res) => res.data.data);

export const listSchools = () => superAdminApiClient.get('/schools').then((res) => res.data.data);
export const createSchool = (payload) => superAdminApiClient.post('/schools', payload).then((res) => res.data.data);
export const updateSchool = (id, payload) => superAdminApiClient.put(`/schools/${id}`, payload).then((res) => res.data.data);
export const createSchoolAdmin = (id, payload) => superAdminApiClient.post(`/schools/${id}/admin`, payload).then((res) => res.data.data);
export const uploadSchoolLogo = (id, file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return superAdminApiClient.post(`/schools/${id}/logo`, formData).then((res) => res.data.data);
};
export const updateSchoolBranding = (id, payload) => superAdminApiClient.put(`/schools/${id}/branding`, payload).then((res) => res.data.data);

export const listBackups = () => superAdminApiClient.get('/backups').then((res) => res.data.data);
export const triggerBackup = () => superAdminApiClient.post('/backups/run').then((res) => res.data.data);

export const listSchoolAdmins = () => superAdminApiClient.get('/school-admins').then((res) => res.data.data);
export const setSchoolAdminStatus = (id, status) => superAdminApiClient.put(`/school-admins/${id}/status`, { status }).then((res) => res.data.data);
export const resetSchoolAdminPassword = (id) => superAdminApiClient.post(`/school-admins/${id}/reset-password`).then((res) => res.data.data);

export const listSuperAdmins = () => superAdminApiClient.get('/super-admins').then((res) => res.data.data);
export const createSuperAdmin = (payload) => superAdminApiClient.post('/super-admins', payload).then((res) => res.data.data);
export const setSuperAdminStatus = (id, status) => superAdminApiClient.put(`/super-admins/${id}/status`, { status }).then((res) => res.data.data);

export const listAuditLogs = (params = {}) => superAdminApiClient.get('/audit-logs', { params }).then((res) => res.data.data);
export const getFailedLogins = (hours = 24) => superAdminApiClient.get('/security/failed-logins', { params: { hours } }).then((res) => res.data.data);

export const getPlatformSettings = () => superAdminApiClient.get('/settings').then((res) => res.data.data);
export const updatePlatformSettings = (payload) => superAdminApiClient.put('/settings', payload).then((res) => res.data.data);
