import apiClient from './client';

export const suggestRemark = (reportId, remarkType = 'teacher') => apiClient.post('/ai/remarks/suggest', { reportId, remarkType }).then((res) => res.data.data);

export const composeAnnouncement = (payload) => apiClient.post('/ai/compose-announcement', payload).then((res) => res.data.data);

export const getPerformanceSummary = (academicTermId) => apiClient.get('/ai/performance-summary', { params: { academicTermId } }).then((res) => res.data.data);
