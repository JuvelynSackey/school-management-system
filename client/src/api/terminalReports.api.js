import apiClient from './client';

export const generateTerminalReports = (payload) => apiClient.post('/terminal-reports/generate', payload).then((res) => res.data.data);
export const listTerminalReports = (params) => apiClient.get('/terminal-reports', { params }).then((res) => res.data.data);
export const submitTerminalReport = (id, payload) => apiClient.post(`/terminal-reports/${id}/submit`, payload).then((res) => res.data.data);
export const lockTerminalReport = (id, payload) => apiClient.post(`/terminal-reports/${id}/lock`, payload).then((res) => res.data.data);
export const unlockTerminalReport = (id) => apiClient.post(`/terminal-reports/${id}/unlock`).then((res) => res.data.data);

export const downloadReportCardsPdf = async (classId, academicTermId, filename) => {
  const response = await apiClient.get('/terminal-reports/pdf', { params: { classId, academicTermId }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'report-cards.pdf');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
