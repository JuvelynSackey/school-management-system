import apiClient from './client';

export const listAdmissions = (params = {}) => apiClient.get('/admissions', { params }).then((res) => res.data.data);
export const getSuggestedAdmissionNo = () => apiClient.get('/admissions/next-admission-no').then((res) => res.data.data);
export const createAdmission = (payload) => apiClient.post('/admissions', payload).then((res) => res.data.data);
export const updateAdmission = (id, payload) => apiClient.put(`/admissions/${id}`, payload).then((res) => res.data.data);
export const approveAdmission = (id) => apiClient.post(`/admissions/${id}/approve`).then((res) => res.data.data);
export const rejectAdmission = (id, rejectionReason) => apiClient.post(`/admissions/${id}/reject`, { rejectionReason }).then((res) => res.data.data);
export const enrollAdmission = (id, payload) => apiClient.post(`/admissions/${id}/enroll`, payload).then((res) => res.data.data);
export const deleteAdmission = (id) => apiClient.delete(`/admissions/${id}`).then((res) => res.data.data);
