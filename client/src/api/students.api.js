import apiClient from './client';

export const listStudents = (params = {}) => apiClient.get('/students', { params }).then((res) => res.data.data);
export const getStudent = (id) => apiClient.get(`/students/${id}`).then((res) => res.data.data);
export const getMyStudentProfile = () => apiClient.get('/students/me').then((res) => res.data.data);
export const getMyChildren = () => apiClient.get('/students/my-children').then((res) => res.data.data);
export const createStudent = (payload) => apiClient.post('/students', payload).then((res) => res.data.data);
export const updateStudent = (id, payload) => apiClient.put(`/students/${id}`, payload).then((res) => res.data.data);
export const deleteStudent = (id) => apiClient.delete(`/students/${id}`).then((res) => res.data.data);
export const uploadStudentPhoto = (id, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return apiClient.post(`/students/${id}/photo`, formData).then((res) => res.data.data);
};

export const downloadIdCardsPdf = async (classId, filename) => {
  try {
    const response = await apiClient.get('/students/id-cards/pdf', { params: { classId }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'id-cards.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // A blob-typed error response body arrives as a Blob, not parsed JSON —
    // recover the real { message } so callers can use err.response?.data?.message as usual.
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch { /* leave as-is if it wasn't JSON */ }
    }
    throw err;
  }
};

export const getWaecExportPreview = (classId) => apiClient.get('/students/waec-preview', { params: { classId } }).then((res) => res.data.data);

export const downloadWaecExport = async (classId, filename) => {
  try {
    const response = await apiClient.get('/students/waec-export', { params: { classId }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'waec-candidates.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch { /* leave as-is if it wasn't JSON */ }
    }
    throw err;
  }
};
