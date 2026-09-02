import apiClient from './client';

export const askAdminQuery = (question, includeInspector = false) => apiClient.post('/ai/query', { question, includeInspector }).then((res) => res.data.data);
