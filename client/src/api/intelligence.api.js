import apiClient from './client';

export const getIntelligenceSummary = (params = {}) => apiClient.get('/intelligence/summary', { params }).then((res) => res.data.data);
export const getHealthScore = (params = {}) => apiClient.get('/intelligence/health-score', { params }).then((res) => res.data.data);
