import apiClient from './client';

export const listResultSheets = (params) => apiClient.get('/result-sheets', { params }).then((res) => res.data.data);
export const getResultSheetMatrix = (params) => apiClient.get('/result-sheets/matrix', { params }).then((res) => res.data.data);
export const submitResultSheet = (id) => apiClient.post(`/result-sheets/${id}/submit`).then((res) => res.data.data);
export const submitAllResultSheets = (payload) => apiClient.post('/result-sheets/submit-all', payload).then((res) => res.data.data);
export const approveResultSheet = (id) => apiClient.post(`/result-sheets/${id}/approve`).then((res) => res.data.data);
export const rejectResultSheet = (id, rejectionReason) => apiClient.post(`/result-sheets/${id}/reject`, { rejectionReason }).then((res) => res.data.data);
export const reopenResultSheet = (id) => apiClient.post(`/result-sheets/${id}/reopen`).then((res) => res.data.data);
