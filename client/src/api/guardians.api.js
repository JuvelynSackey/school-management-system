import apiClient from './client';

export const lookupGuardianByPhone = (phone) => apiClient.get('/guardians', { params: { phone } }).then((res) => res.data.data);
export const getGuardian = (id) => apiClient.get(`/guardians/${id}`).then((res) => res.data.data);
