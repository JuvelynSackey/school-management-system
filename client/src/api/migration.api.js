import apiClient from './client';

export const importPeople = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/migration/students', formData).then((res) => res.data.data);
};

export const importScores = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/migration/scores', formData).then((res) => res.data.data);
};

export const downloadCredentialsCsv = async (created, filename = 'migration-credentials.csv') => {
  try {
    const response = await apiClient.post('/migration/credentials-csv', { created }, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
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
