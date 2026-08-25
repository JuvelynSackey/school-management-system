import apiClient from './client';

export const listExamSchedules = (params = {}) => apiClient.get('/exam-schedules', { params }).then((res) => res.data.data);
export const createExamSchedule = (payload) => apiClient.post('/exam-schedules', payload).then((res) => res.data.data);
export const updateExamSchedule = (id, payload) => apiClient.put(`/exam-schedules/${id}`, payload).then((res) => res.data.data);
export const deleteExamSchedule = (id) => apiClient.delete(`/exam-schedules/${id}`).then((res) => res.data.data);
