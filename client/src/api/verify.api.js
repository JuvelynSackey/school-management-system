import apiClient from './client';

export const verifyDocument = (type, schoolSlug, id) => apiClient.get(`/verify/${type}/${schoolSlug}/${id}`).then((res) => res.data.data);
