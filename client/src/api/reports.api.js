import apiClient from './client';

const REPORT_ENDPOINTS = {
  students: '/reports/students',
  attendance: '/reports/attendance',
  results: '/reports/results',
  fees: '/reports/fees',
  financeSummary: '/reports/finance-summary',
  attendanceSummary: '/reports/attendance-summary',
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

const downloadPdf = async (path, params, filename) => {
  const response = await apiClient.get(path, { params, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadBroadsheetPdf = (params, filename) => downloadPdf('/reports/broadsheet-pdf', params, filename || 'broadsheet.pdf');
export const downloadFinanceSummaryPdf = (params, filename) => downloadPdf('/reports/finance-summary-pdf', params, filename || 'finance-summary.pdf');
export const downloadAttendanceSummaryPdf = (params, filename) => downloadPdf('/reports/attendance-summary-pdf', params, filename || 'attendance-summary.pdf');
