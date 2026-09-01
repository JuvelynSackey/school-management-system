import apiClient from './client';

export const importCsv = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post('/bulk-import/csv', formData).then((res) => res.data.data);
};
