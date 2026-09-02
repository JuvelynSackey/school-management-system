import apiClient from './client';

export const getAcademicAnalytics = (academicTermId) => apiClient.get('/analytics/academic', { params: { academicTermId } }).then((res) => res.data.data);
export const getFinancialAnalytics = (academicTermId) => apiClient.get('/analytics/financial', { params: { academicTermId } }).then((res) => res.data.data);
export const getDataQualityReport = () => apiClient.get('/analytics/data-quality').then((res) => res.data.data);
