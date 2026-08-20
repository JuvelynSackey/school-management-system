import apiClient from './client';

export const suggestRemark = (reportId) => apiClient.post('/ai/remarks/suggest', { reportId }).then((res) => res.data.data);
