import apiClient from './client';

export const listFeeStructures = () => apiClient.get('/fee-structures').then((res) => res.data.data);
export const createFeeStructure = (payload) => apiClient.post('/fee-structures', payload).then((res) => res.data.data);
export const updateFeeStructure = (id, payload) => apiClient.put(`/fee-structures/${id}`, payload).then((res) => res.data.data);
export const deleteFeeStructure = (id) => apiClient.delete(`/fee-structures/${id}`).then((res) => res.data.data);
export const applyFeeStructure = (id, payload) => apiClient.post(`/fee-structures/${id}/apply`, payload).then((res) => res.data.data);
