import apiClient from './client';

export const askAdminQuery = (question) => apiClient.post('/ai/query', { question }).then((res) => res.data.data);
