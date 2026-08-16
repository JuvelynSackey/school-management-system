import apiClient from './client';

export const getResultsRoster = (params) => apiClient.get('/results/roster', { params }).then((res) => res.data.data);
export const recordResults = (payload) => apiClient.post('/results/bulk', payload).then((res) => res.data.data);
export const getStudentResults = (studentId) => apiClient.get(`/results/student/${studentId}`).then((res) => res.data.data);
export const getMyResults = () => apiClient.get('/results/me').then((res) => res.data.data);
