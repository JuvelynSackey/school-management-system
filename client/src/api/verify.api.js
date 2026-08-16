import apiClient from './client';

export const verifyDocument = (type, id) => apiClient.get(`/verify/${type}/${id}`).then((res) => res.data.data);
