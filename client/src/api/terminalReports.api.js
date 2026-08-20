import apiClient from './client';

export const generateTerminalReports = (payload) => apiClient.post('/terminal-reports/generate', payload).then((res) => res.data.data);
export const listTerminalReports = (params) => apiClient.get('/terminal-reports', { params }).then((res) => res.data.data);
export const submitTerminalReport = (id, payload) => apiClient.post(`/terminal-reports/${id}/submit`, payload).then((res) => res.data.data);
export const lockTerminalReport = (id, payload) => apiClient.post(`/terminal-reports/${id}/lock`, payload).then((res) => res.data.data);
export const rejectTerminalReport = (id, rejectionReason) => apiClient.post(`/terminal-reports/${id}/reject`, { rejectionReason }).then((res) => res.data.data);
export const unlockTerminalReport = (id) => apiClient.post(`/terminal-reports/${id}/unlock`).then((res) => res.data.data);
export const publishTerminalReport = (id) => apiClient.post(`/terminal-reports/${id}/publish`).then((res) => res.data.data);
export const unpublishTerminalReport = (id) => apiClient.post(`/terminal-reports/${id}/unpublish`).then((res) => res.data.data);
export const publishAllTerminalReports = (payload) => apiClient.post('/terminal-reports/publish-all', payload).then((res) => res.data.data);
export const lockAllTerminalReports = (payload) => apiClient.post('/terminal-reports/lock-all', payload).then((res) => res.data.data);
export const submitAllTerminalReports = (payload) => apiClient.post('/terminal-reports/submit-all', payload).then((res) => res.data.data);
export const listPublishedReportsForStudent = (studentId) => apiClient.get(`/terminal-reports/student/${studentId}`).then((res) => res.data.data);

const triggerBlobDownload = async (request, defaultFilename) => {
  try {
    const response = await request();
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // responseType: 'blob' means an error response's body arrives as a Blob
    // too, not parsed JSON -- recover the real { message } so callers can
    // keep using their usual err.response?.data?.message pattern.
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch { /* leave as-is if it wasn't JSON */ }
    }
    throw err;
  }
};

export const downloadStudentReportCard = (reportId, filename) => triggerBlobDownload(
  () => apiClient.get(`/terminal-reports/${reportId}/pdf`, { responseType: 'blob' }),
  filename || 'report-card.pdf',
);

export const downloadReportCardsPdf = (classId, academicTermId, filename) => triggerBlobDownload(
  () => apiClient.get('/terminal-reports/pdf', { params: { classId, academicTermId }, responseType: 'blob' }),
  filename || 'report-cards.pdf',
);

export const downloadSelectedReportCardsPdf = (classId, academicTermId, studentIds, filename) => triggerBlobDownload(
  () => apiClient.post('/terminal-reports/pdf-selected', { classId, academicTermId, studentIds }, { responseType: 'blob' }),
  filename || 'report-cards-selected.pdf',
);

export const downloadReportCardsZip = (classId, academicTermId, filename) => triggerBlobDownload(
  () => apiClient.get('/terminal-reports/zip', { params: { classId, academicTermId }, responseType: 'blob' }),
  filename || 'report-cards.zip',
);
