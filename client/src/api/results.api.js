import apiClient from './client';

export const getResultsRoster = (params) => apiClient.get('/results/roster', { params }).then((res) => res.data.data);
export const getResultAnomalies = (params) => apiClient.get('/results/anomalies', { params }).then((res) => res.data.data);
export const getResultInsights = (studentId) => apiClient.get(`/results/insights/${studentId}`).then((res) => res.data.data);
export const getAcademicHistory = (studentId) => apiClient.get(`/results/academic-history/${studentId}`).then((res) => res.data.data);
export const recordResults = (payload) => apiClient.post('/results/bulk', payload).then((res) => res.data.data);
export const amendResult = (id, payload) => apiClient.post(`/results/${id}/amend`, payload).then((res) => res.data.data);
export const reportResultConflict = (payload) => apiClient.post('/results/report-conflict', payload).then((res) => res.data.data);
export const getStudentResults = (studentId) => apiClient.get(`/results/student/${studentId}`).then((res) => res.data.data);
export const getMyResults = () => apiClient.get('/results/me').then((res) => res.data.data);
