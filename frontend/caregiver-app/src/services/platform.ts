import { apiClient } from './api';

// --- offlineQueue ---
const QUEUE_KEY = 'omnicare_offline_queue';

interface QueuedAction {
  id: string;
  type: string;
  endpoint: string;
  data: any;
  timestamp: number;
}

class OfflineQueueService {
  public getQueue(): QueuedAction[] {
    if (typeof window === 'undefined') return [];
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }

  private saveQueue(queue: QueuedAction[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async addToQueue(action: QueuedAction): Promise<void> {
    const queue = this.getQueue();
    queue.push(action);
    this.saveQueue(queue);
  }

  async removeFromQueue(actionId: string): Promise<void> {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== actionId);
    this.saveQueue(filtered);
  }

  async syncQueue(): Promise<number> {
    const queue = this.getQueue();
    let syncedCount = 0;

    for (const action of queue) {
      try {
        await apiClient.post(action.endpoint, action.data);
        syncedCount++;
      } catch (error) {
        break;
      }
    }

    const remaining = queue.slice(syncedCount);
    this.saveQueue(remaining);
    return syncedCount;
  }
}

export const offlineQueue = new OfflineQueueService();

// --- geolocation ---
export const geolocationService = {
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });
    });
  },

  watchPosition(callback: (position: GeolocationPosition) => void): number {
    return navigator.geolocation.watchPosition(callback, console.error, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  },

  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  },
};

// --- endpoints ---
export const ENDPOINTS = {
  todaySchedule: '/scheduling/visits/today',
  client: (id: string) => `/clients/${id}`,
  visitTasks: (id: string) => `/scheduling/sessions/${id}/tasks`,
  visitAssessments: (id: string) => `/scheduling/sessions/${id}/assessment-items`,
  visitMedications: (id: string) => `/scheduling/sessions/${id}/medications`,
  observations: '/assessments/observations',
} as const;