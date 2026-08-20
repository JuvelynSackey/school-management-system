import apiClient from './client';

export const getChannelStatus = () => apiClient.get('/notifications/status').then((res) => res.data.data);
