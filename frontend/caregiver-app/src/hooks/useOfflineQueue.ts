'use client';

import { useState, useEffect } from 'react';
import { offlineQueue } from '@/services/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline]);

  const loadQueue = async () => {
    const items = await offlineQueue.getQueue();
    setQueue(items);
  };

  const queueOfflineAction = async (action: any) => {
    const newAction = {
      ...action,
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
    };
    
    await offlineQueue.addToQueue(newAction);
    setQueue(prev => [...prev, newAction]);
  };

  const syncQueue = async () => {
    const synced = await offlineQueue.syncQueue();
    if (synced > 0) {
      await loadQueue();
    }
  };

  return {
    queue,
    queueOfflineAction,
    syncQueue,
    pendingCount: queue.length,
  };
}