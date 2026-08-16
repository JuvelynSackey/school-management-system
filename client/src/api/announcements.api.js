import apiClient from './client';

export const listAnnouncements = (params = {}) => apiClient.get('/announcements', { params }).then((res) => res.data.data);
export const getMyNoticeBoard = () => apiClient.get('/announcements/me').then((res) => res.data.data);
export const createAnnouncement = (payload) => apiClient.post('/announcements', payload).then((res) => res.data.data);
export const deleteAnnouncement = (id) => apiClient.delete(`/announcements/${id}`).then((res) => res.data.data);
