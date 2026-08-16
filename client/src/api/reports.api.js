import apiClient from './client';

const REPORT_ENDPOINTS = {
  students: '/reports/students',
  attendance: '/reports/attendance',
  results: '/reports/results',
  fees: '/reports/fees',
};

export const previewReport = (type, params = {}) => apiClient.get(REPORT_ENDPOINTS[type], { params }).then((res) => res.data.data);

export const downloadReportCsv = async (type, params = {}, filename) => {
  const response = await apiClient.get(REPORT_ENDPOINTS[type], { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || `${type}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
