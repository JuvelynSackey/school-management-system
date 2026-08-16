import apiClient from './client';

export const getSchoolSettings = () => apiClient.get('/school-settings').then((res) => res.data.data);
export const updateSchoolSettings = (payload) => apiClient.put('/school-settings', payload).then((res) => res.data.data);
