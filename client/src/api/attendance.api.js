import apiClient from './client';

export const getRoster = (classId, date) => apiClient.get('/attendance', { params: { classId, date } }).then((res) => res.data.data);
export const recordAttendance = (payload) => apiClient.post('/attendance/bulk', payload).then((res) => res.data.data);
export const getClassSummary = (classId) => apiClient.get(`/attendance/class/${classId}/summary`).then((res) => res.data.data);
export const getStudentAttendance = (studentId) => apiClient.get(`/attendance/student/${studentId}`).then((res) => res.data.data);
export const getMyAttendance = () => apiClient.get('/attendance/me').then((res) => res.data.data);
