import apiClient from './client';

export const listTeachers = () => apiClient.get('/teachers').then((res) => res.data.data);
export const getTeacher = (id) => apiClient.get(`/teachers/${id}`).then((res) => res.data.data);
export const createTeacher = (payload) => apiClient.post('/teachers', payload).then((res) => res.data.data);
export const updateTeacher = (id, payload) => apiClient.put(`/teachers/${id}`, payload).then((res) => res.data.data);
export const deleteTeacher = (id) => apiClient.delete(`/teachers/${id}`).then((res) => res.data.data);
