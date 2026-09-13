import { apiClient } from './api';

export const notificationsService = {
  async getNotifications() {
    const response = await apiClient.get('/notifications');
    return response.data;
  },

  async markAsRead(notificationId: string) {
    const response = await apiClient.post(`/notifications/${notificationId}/read`);
    return response.data;
  },
};