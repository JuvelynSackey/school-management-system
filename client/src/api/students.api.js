import apiClient from './client';

export const listStudents = (params = {}) => apiClient.get('/students', { params }).then((res) => res.data.data);
export const getStudent = (id) => apiClient.get(`/students/${id}`).then((res) => res.data.data);
export const getMyStudentProfile = () => apiClient.get('/students/me').then((res) => res.data.data);
export const createStudent = (payload) => apiClient.post('/students', payload).then((res) => res.data.data);
export const updateStudent = (id, payload) => apiClient.put(`/students/${id}`, payload).then((res) => res.data.data);
export const deleteStudent = (id) => apiClient.delete(`/students/${id}`).then((res) => res.data.data);
