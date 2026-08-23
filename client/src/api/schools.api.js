import apiClient from './client';

export const registerSchool = (payload) => apiClient.post('/schools/register', payload).then((res) => res.data.data);
