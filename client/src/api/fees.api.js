import apiClient from './client';

export const listFees = (params = {}) => apiClient.get('/fees', { params }).then((res) => res.data.data);
export const getMyFees = () => apiClient.get('/fees/me').then((res) => res.data.data);
export const getPayments = (feeId) => apiClient.get(`/fees/${feeId}/payments`).then((res) => res.data.data);
export const createFee = (payload) => apiClient.post('/fees', payload).then((res) => res.data.data);
export const updateFee = (id, payload) => apiClient.put(`/fees/${id}`, payload).then((res) => res.data.data);
export const deleteFee = (id) => apiClient.delete(`/fees/${id}`).then((res) => res.data.data);
export const recordPayment = (feeId, payload) => apiClient.post(`/fees/${feeId}/payments`, payload).then((res) => res.data.data);

export const downloadReceipt = async (feeId, paymentId) => {
  const response = await apiClient.get(`/fees/${feeId}/payments/${paymentId}/receipt`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `receipt-${paymentId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
