import apiClient from './client';

export const listAuditLogs = (params = {}) => apiClient.get('/audit-logs', { params }).then((res) => res.data.data);
