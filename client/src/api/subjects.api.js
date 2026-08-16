import apiClient from './client';

export const listSubjects = () => apiClient.get('/subjects').then((res) => res.data.data);
export const createSubject = (payload) => apiClient.post('/subjects', payload).then((res) => res.data.data);
export const updateSubject = (id, payload) => apiClient.put(`/subjects/${id}`, payload).then((res) => res.data.data);
export const deleteSubject = (id) => apiClient.delete(`/subjects/${id}`).then((res) => res.data.data);

export const listSubjectsForClass = (classId) => apiClient.get(`/subjects/class/${classId}`).then((res) => res.data.data);
export const assignSubjectToClass = (payload) => apiClient.post('/subjects/assign', payload).then((res) => res.data.data);
export const unassignSubjectFromClass = (linkId) => apiClient.delete(`/subjects/assign/${linkId}`).then((res) => res.data.data);
