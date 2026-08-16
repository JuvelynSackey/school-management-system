import apiClient from './client';

export const listClasses = () => apiClient.get('/classes').then((res) => res.data.data);
export const getClass = (id) => apiClient.get(`/classes/${id}`).then((res) => res.data.data);
export const createClass = (payload) => apiClient.post('/classes', payload).then((res) => res.data.data);
export const updateClass = (id, payload) => apiClient.put(`/classes/${id}`, payload).then((res) => res.data.data);
export const deleteClass = (id) => apiClient.delete(`/classes/${id}`).then((res) => res.data.data);
