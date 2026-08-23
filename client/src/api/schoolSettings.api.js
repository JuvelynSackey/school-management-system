import apiClient from './client';

export const getSchoolSettings = () => apiClient.get('/school-settings').then((res) => res.data.data);
export const updateSchoolSettings = (payload) => apiClient.put('/school-settings', payload).then((res) => res.data.data);

export const uploadSchoolLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return apiClient.post('/school-settings/logo', formData).then((res) => res.data.data);
};
