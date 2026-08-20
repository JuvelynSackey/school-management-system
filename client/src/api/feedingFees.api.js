import apiClient from './client';

export const getDailyFeedingRoster = (classId, date) => apiClient.get('/feeding-fees/daily', { params: { classId, date } }).then((res) => res.data.data);
export const chargeFeedingDay = (payload) => apiClient.post('/feeding-fees/charge', payload).then((res) => res.data.data);
export const getFeedingDaySummary = (classId, date) => apiClient.get('/feeding-fees/summary', { params: { classId, date } }).then((res) => res.data.data);
