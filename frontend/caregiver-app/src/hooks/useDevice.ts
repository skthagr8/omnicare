'use client';

import { useState, useEffect } from 'react';
import { offlineQueue } from '../services/platform';

// --- useOnlineStatus ---
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// --- useOfflineQueue ---
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

// --- usePushNotifications ---
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const subscribe = async () => {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    setSubscription(subscription);
    return subscription;
  };

  return {
    permission,
    subscription,
    requestPermission,
    subscribe,
  };
}