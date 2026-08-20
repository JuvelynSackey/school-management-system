import apiClient from './client';

export const listPersonalAttributes = (params) => apiClient.get('/personal-attributes', { params }).then((res) => res.data.data);
export const createPersonalAttribute = (payload) => apiClient.post('/personal-attributes', payload).then((res) => res.data.data);
export const updatePersonalAttribute = (id, payload) => apiClient.put(`/personal-attributes/${id}`, payload).then((res) => res.data.data);
export const deletePersonalAttribute = (id) => apiClient.delete(`/personal-attributes/${id}`).then((res) => res.data.data);
