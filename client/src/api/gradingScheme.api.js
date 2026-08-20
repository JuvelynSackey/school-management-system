import apiClient from './client';

export const getGradingScheme = () => apiClient.get('/grading-scheme').then((res) => res.data.data);
export const updateGradingScheme = (payload) => apiClient.put('/grading-scheme', payload).then((res) => res.data.data);
