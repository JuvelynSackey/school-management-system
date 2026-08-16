import apiClient from './client';

export const login = (email, password) => apiClient.post('/auth/login', { email, password }).then((res) => res.data.data);

export const fetchMe = () => apiClient.get('/auth/me').then((res) => res.data.data);
