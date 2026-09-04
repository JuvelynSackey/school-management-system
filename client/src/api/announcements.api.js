import apiClient from './client';

export const listAnnouncements = (params = {}) => apiClient.get('/announcements', { params }).then((res) => res.data.data);
export const getMyNoticeBoard = () => apiClient.get('/announcements/me').then((res) => res.data.data);
export const getAnnouncementBanner = () => apiClient.get('/announcements/banner').then((res) => res.data.data);
export const getUnreadAnnouncementCount = () => apiClient.get('/announcements/unread-count').then((res) => res.data.data.count);
export const markAnnouncementRead = (id) => apiClient.post(`/announcements/${id}/read`).then((res) => res.data.data);
export const createAnnouncement = (payload) => apiClient.post('/announcements', payload).then((res) => res.data.data);
export const deleteAnnouncement = (id) => apiClient.delete(`/announcements/${id}`).then((res) => res.data.data);
