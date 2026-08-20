import apiClient from './client';

export const listAssessmentSubjects = (classId, academicTermId) => apiClient.get('/assessment-sheets/subjects', { params: { classId, academicTermId } }).then((res) => res.data.data);

const downloadFile = async (url, params, filename) => {
  try {
    const response = await apiClient.get(url, { params, responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
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

export const downloadSingleAssessmentSheet = (classId, subjectId, academicTermId, mode, filename) => downloadFile('/assessment-sheets/single/pdf', { classId, subjectId, academicTermId, mode }, filename);

export const downloadBulkAssessmentSheets = (classId, academicTermId, mode, filename) => downloadFile('/assessment-sheets/bulk/pdf', { classId, academicTermId, mode }, filename);
