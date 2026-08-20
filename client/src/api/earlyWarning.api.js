import apiClient from './client';

export const getAtRiskStudents = () => apiClient.get('/early-warning/at-risk-students').then((res) => res.data.data);
