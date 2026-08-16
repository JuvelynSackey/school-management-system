import apiClient from './client';

export const listAssignmentsForClass = (classId) => apiClient.get(`/assignments/class/${classId}`).then((res) => res.data.data);
export const createAssignment = (payload) => apiClient.post('/assignments', payload).then((res) => res.data.data);
export const deleteAssignment = (id) => apiClient.delete(`/assignments/${id}`).then((res) => res.data.data);
