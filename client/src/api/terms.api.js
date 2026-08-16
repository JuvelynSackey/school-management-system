import apiClient from './client';

export const listTerms = () => apiClient.get('/terms').then((res) => res.data.data);
export const createTerm = (payload) => apiClient.post('/terms', payload).then((res) => res.data.data);
export const updateTerm = (id, payload) => apiClient.put(`/terms/${id}`, payload).then((res) => res.data.data);
export const deleteTerm = (id) => apiClient.delete(`/terms/${id}`).then((res) => res.data.data);
