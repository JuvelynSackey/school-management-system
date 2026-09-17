import apiClient from './client';

export const listQuestions = (params = {}) => apiClient.get('/question-bank', { params }).then((res) => res.data.data);
export const getQuestion = (id) => apiClient.get(`/question-bank/${id}`).then((res) => res.data.data);
export const createQuestion = (payload) => apiClient.post('/question-bank', payload).then((res) => res.data.data);
export const updateQuestion = (id, payload) => apiClient.put(`/question-bank/${id}`, payload).then((res) => res.data.data);
export const deleteQuestion = (id) => apiClient.delete(`/question-bank/${id}`).then((res) => res.data.data);
