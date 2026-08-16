import apiClient from './client';

export const listHouses = () => apiClient.get('/houses').then((res) => res.data.data);
export const createHouse = (payload) => apiClient.post('/houses', payload).then((res) => res.data.data);
export const updateHouse = (id, payload) => apiClient.put(`/houses/${id}`, payload).then((res) => res.data.data);
export const deleteHouse = (id) => apiClient.delete(`/houses/${id}`).then((res) => res.data.data);
