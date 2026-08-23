import apiClient from './client';

export const suggestRemark = (reportId) => apiClient.post('/ai/remarks/suggest', { reportId }).then((res) => res.data.data);

export const composeAnnouncement = (payload) => apiClient.post('/ai/compose-announcement', payload).then((res) => res.data.data);

export const getPerformanceSummary = (academicTermId) => apiClient.get('/ai/performance-summary', { params: { academicTermId } }).then((res) => res.data.data);
