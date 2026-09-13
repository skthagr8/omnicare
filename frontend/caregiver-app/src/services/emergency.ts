import { apiClient } from './api';

export const emergencyService = {
  async raiseEmergency(data: any) {
    const response = await apiClient.post('/emergency/raise', data);
    return response.data;
  },

  async getActiveEmergencies() {
    const response = await apiClient.get('/emergency/active');
    return response.data;
  },
};