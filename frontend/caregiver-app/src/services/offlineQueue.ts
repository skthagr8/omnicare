import { apiClient } from './api';

const QUEUE_KEY = 'omnicare_offline_queue';

interface QueuedAction {
  id: string;
  type: string;
  endpoint: string;
  data: any;
  timestamp: number;
}

class OfflineQueueService {
  private getQueue(): QueuedAction[] {
    if (typeof window === 'undefined') return [];
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }

  private saveQueue(queue: QueuedAction[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async getQueue(): Promise<QueuedAction[]> {
    return this.getQueue();
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