import apiClient from './client';

export const getAcademicAnalytics = (academicTermId) => apiClient.get('/analytics/academic', { params: { academicTermId } }).then((res) => res.data.data);
export const getFinancialAnalytics = (academicTermId) => apiClient.get('/analytics/financial', { params: { academicTermId } }).then((res) => res.data.data);
export const getDataQualityReport = () => apiClient.get('/analytics/data-quality').then((res) => res.data.data);
export const getBeceReadinessReport = () => apiClient.get('/analytics/bece-readiness').then((res) => res.data.data);
export const getOperationsOverviewReport = () => apiClient.get('/analytics/operations-overview').then((res) => res.data.data);
