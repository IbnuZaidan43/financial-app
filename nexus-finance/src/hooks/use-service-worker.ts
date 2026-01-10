'use client';

import { useEffect, useState, useCallback } from 'react';
import { swManager, type SyncQueueItem, type CacheStatus } from '@/lib/service-worker';

interface UseServiceWorkerReturn {
  isSupported: boolean;
  isActive: boolean;
  isOnline: boolean;
  syncQueue: SyncQueueItem[];
  cacheStatus: CacheStatus | null;
  installPrompt: any;
  isInstalled: boolean;
  error: string | null;
  loading: boolean;
  
  // Actions
  forceSync: () => Promise<void>;
  clearSyncQueue: () => Promise<void>;
  getCacheStatus: () => Promise<void>;
  checkForUpdate: () => Promise<boolean>;
  installApp: () => Promise<void>;
  addToSyncQueue: (operation: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) => Promise<void>;
  
  // Enhanced cache actions
  clearCache: (cacheType: string) => Promise<void>;
  clearExpiredCache: () => Promise<number>;
  warmCache: (urls: string[]) => Promise<string[]>;
  getCacheAnalytics: () => Promise<any>;
  forceCacheCleanup: () => Promise<void>;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refresh data functions
  const refreshSyncQueue = useCallback(async () => {
    try {
      const queue = await swManager.getSyncQueue();
      setSyncQueue(queue);
    } catch (err) {
      console.error('Failed to refresh sync queue:', err);
    }
  }, []);

  const refreshCacheStatus = useCallback(async () => {
    try {
      const status = await swManager.getCacheStatus();
      setCacheStatus(status);
    } catch (err) {
      console.error('Failed to refresh cache status:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([
      refreshSyncQueue(),
      refreshCacheStatus()
    ]);
  }, [refreshSyncQueue, refreshCacheStatus]);

  // Initialize service worker
  useEffect(() => {
    const initSW = async () => {
      try {
        setIsSupported('serviceWorker' in navigator);
        setIsOnline(navigator.onLine);
        
        if ('serviceWorker' in navigator) {
          // Wait for SW ready event from layout
          const handleSWReady = (event: CustomEvent) => {
            console.log('🔧 Hook: SW ready event received');
            setIsActive(true);
            refreshData();
          };

          const handleSWError = (event: CustomEvent) => {
            console.error('🔧 Hook: SW error event received', event.detail.error);
            setError(event.detail.error.message || 'Service Worker initialization failed');
          };

          window.addEventListener('swReady', handleSWReady as EventListener);
          window.addEventListener('swError', handleSWError as EventListener);

          // Also try direct initialization as fallback
          const success = await swManager.init();
          if (success) {
            setIsActive(true);
            await refreshData();
          }

          // Cleanup
          return () => {
            window.removeEventListener('swReady', handleSWReady as EventListener);
            window.removeEventListener('swError', handleSWError as EventListener);
          };
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize service worker');
      } finally {
        setLoading(false);
      }
    };

    initSW();
  }, [refreshData]);

  // Setup event listeners
  useEffect(() => {
    if (!isSupported) return;

    // Listen for online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for enhanced events from layout
    const handleNetworkStatusChanged = (event: CustomEvent) => {
      setIsOnline(event.detail.online);
    };

    const handleAPIOffline = (event: CustomEvent) => {
      console.warn('🔧 Hook: API offline detected');
      // Could trigger UI notifications here
    };

    const handleSyncQueueUpdate = (event: CustomEvent) => {
      refreshSyncQueue();
    };

    const handleSyncCompleted = (event: CustomEvent) => {
      refreshSyncQueue();
      refreshCacheStatus();
    };

    const handleCacheStatus = (event: CustomEvent) => {
      setCacheStatus(event.detail);
    };

    const handleInstallPrompt = (event: CustomEvent) => {
      setInstallPrompt(event.detail);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const handleSWUpdateAvailable = (event: CustomEvent) => {
      console.log('🔧 Hook: SW update available');
      // Could trigger update notification
    };

    // Window events from layout
    window.addEventListener('networkStatusChanged', handleNetworkStatusChanged as EventListener);
    window.addEventListener('apiOffline', handleAPIOffline as EventListener);
    window.addEventListener('syncQueueUpdated', handleSyncQueueUpdate as EventListener);
    window.addEventListener('syncCompleted', handleSyncCompleted as EventListener);
    window.addEventListener('cacheStatus', handleCacheStatus as EventListener);
    window.addEventListener('beforeInstallPrompt', handleInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('swUpdateAvailable', handleSWUpdateAvailable as EventListener);

    // Service worker manager events
    swManager.on('SYNC_QUEUE_UPDATED', handleSyncQueueUpdate);
    swManager.on('SYNC_COMPLETED', handleSyncCompleted);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('networkStatusChanged', handleNetworkStatusChanged as EventListener);
      window.removeEventListener('apiOffline', handleAPIOffline as EventListener);
      window.removeEventListener('syncQueueUpdated', handleSyncQueueUpdate as EventListener);
      window.removeEventListener('syncCompleted', handleSyncCompleted as EventListener);
      window.removeEventListener('cacheStatus', handleCacheStatus as EventListener);
      window.removeEventListener('beforeInstallPrompt', handleInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('swUpdateAvailable', handleSWUpdateAvailable as EventListener);
      swManager.off('SYNC_QUEUE_UPDATED', handleSyncQueueUpdate);
      swManager.off('SYNC_COMPLETED', handleSyncCompleted);
    };
  }, [isSupported, refreshSyncQueue, refreshCacheStatus]);

  // Action functions
  const forceSync = useCallback(async () => {
    try {
      await swManager.forceSync();
      await refreshSyncQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force sync');
    }
  }, [refreshSyncQueue]);

  const clearSyncQueue = useCallback(async () => {
    try {
      await swManager.clearSyncQueue();
      await refreshSyncQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear sync queue');
    }
  }, [refreshSyncQueue]);

  const getCacheStatus = useCallback(async () => {
    await refreshCacheStatus();
  }, [refreshCacheStatus]);

  const checkForUpdate = useCallback(async () => {
    try {
      return await swManager.checkForUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for update');
      return false;
    }
  }, []);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install app');
    }
  }, [installPrompt]);

  const addToSyncQueue = useCallback(async (operation: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) => {
    try {
      await swManager.addToSyncQueue(operation);
      await refreshSyncQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to sync queue');
    }
  }, [refreshSyncQueue]);

  // Enhanced cache actions
  const clearCache = useCallback(async (cacheType: string) => {
    try {
      await swManager.clearCache(cacheType);
      await refreshCacheStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  }, [refreshCacheStatus]);

  const clearExpiredCache = useCallback(async () => {
    try {
      const cleared = await swManager.clearExpiredCache();
      await refreshCacheStatus();
      return cleared;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear expired cache');
      return 0;
    }
  }, [refreshCacheStatus]);

  const warmCache = useCallback(async (urls: string[]) => {
    try {
      const warmed = await swManager.warmCache(urls);
      await refreshCacheStatus();
      return warmed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to warm cache');
      return [];
    }
  }, [refreshCacheStatus]);

  const getCacheAnalytics = useCallback(async () => {
    try {
      return await swManager.getCacheAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get cache analytics');
      return null;
    }
  }, []);

  const forceCacheCleanup = useCallback(async () => {
    try {
      await swManager.forceCacheCleanup();
      await refreshCacheStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force cache cleanup');
    }
  }, [refreshCacheStatus]);

  return {
    isSupported,
    isActive,
    isOnline,
    syncQueue,
    cacheStatus,
    installPrompt,
    isInstalled,
    error,
    loading,
    
    forceSync,
    clearSyncQueue,
    getCacheStatus,
    checkForUpdate,
    installApp,
    addToSyncQueue,
    
    // Enhanced cache actions
    clearCache,
    clearExpiredCache,
    warmCache,
    getCacheAnalytics,
    forceCacheCleanup
  };
}