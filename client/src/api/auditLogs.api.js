import apiClient from './client';

export const listAuditLogs = (params = {}) => apiClient.get('/audit-logs', { params }).then((res) => res.data.data);

export const downloadAuditLogExport = async (params = {}) => {
  try {
    const response = await apiClient.get('/audit-logs/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'audit-log-export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // responseType: 'blob' applies to error responses too, so a 403/500's
    // real JSON message arrives as an unreadable Blob unless converted
    // back — same fix downloadWaecExport (students.api.js) already needed.
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch { /* leave as-is if it wasn't JSON */ }
    }
    throw err;
  }
};
