import apiClient from './client';

export const listAssessments = (params = {}) => apiClient.get('/assessments', { params }).then((res) => res.data.data);
export const getAssessment = (id) => apiClient.get(`/assessments/${id}`).then((res) => res.data.data);
export const createAssessment = (payload) => apiClient.post('/assessments', payload).then((res) => res.data.data);
export const updateAssessment = (id, payload) => apiClient.put(`/assessments/${id}`, payload).then((res) => res.data.data);
export const deleteAssessment = (id) => apiClient.delete(`/assessments/${id}`).then((res) => res.data.data);
