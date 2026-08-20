import apiClient from './client';

export const login = (schoolCode, identifier, password) => apiClient.post('/auth/login', { schoolCode, identifier, password }).then((res) => res.data.data);

export const fetchMe = () => apiClient.get('/auth/me').then((res) => res.data.data);

export const updateMe = (payload) => apiClient.put('/auth/me', payload).then((res) => res.data.data);

export const changePassword = (payload) => apiClient.post('/auth/change-password', payload).then((res) => res.data.data);

export const forgotPassword = (schoolCode, identifier) => apiClient.post('/auth/forgot-password', { schoolCode, identifier }).then((res) => res.data.data);
export const resetPassword = (schoolCode, token, newPassword) => apiClient.post('/auth/reset-password', { schoolCode, token, newPassword }).then((res) => res.data.data);
export const verifyEmail = (schoolCode, token) => apiClient.post('/auth/verify-email', { schoolCode, token }).then((res) => res.data.data);
