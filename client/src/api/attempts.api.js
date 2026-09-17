import apiClient from './client';

export const startAttempt = (assessmentId) => apiClient.post(`/assessments/${assessmentId}/attempts`).then((res) => res.data.data);
export const getMyAttempt = (assessmentId) => apiClient.get(`/assessments/${assessmentId}/my-attempt`).then((res) => res.data.data);
export const saveAnswer = (attemptId, questionId, response) => apiClient
  .put(`/attempts/${attemptId}/answer`, { questionId, response })
  .then((res) => res.data.data);
export const submitAttempt = (attemptId) => apiClient.post(`/attempts/${attemptId}/submit`).then((res) => res.data.data);
export const releaseAttempt = (attemptId) => apiClient.post(`/attempts/${attemptId}/release`).then((res) => res.data.data);
export const listAttemptsForAssessment = (assessmentId) => apiClient.get(`/assessments/${assessmentId}/attempts`).then((res) => res.data.data);
