/**
 * Offline Queue React Hooks
 * 
 * React hooks for offline queue management.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  offlineQueueManager,
  type QueuedRequest,
  type QueueConfig,
  type QueueMetrics
} from '@/lib/offline-queue';

export interface UseOfflineQueueOptions {
  autoStart?: boolean;
  enableRealTimeUpdates?: boolean;
  onRequestAdded?: (request: QueuedRequest) => void;
  onRequestCompleted?: (request: QueuedRequest) => void;
  onRequestFailed?: (request: QueuedRequest) => void;
  onOnline?: () => void;
  onOffline?: () => void;
}

export interface OfflineQueueState {
  isOnline: boolean;
  metrics: QueueMetrics;
  pendingRequests: QueuedRequest[];
  failedRequests: QueuedRequest[];
  config: QueueConfig;
  lastUpdate: number | null;
  error: string | null;
}

export function useOfflineQueue(options: UseOfflineQueueOptions = {}) {
  const [state, setState] = useState<OfflineQueueState>({
    isOnline: navigator.onLine,
    metrics: offlineQueueManager.getMetrics(),
    pendingRequests: [],
    failedRequests: [],
    config: {
      maxQueueSize: 1000,
      batchSize: 10,
      batchTimeout: 5000,
      retryDelay: 2000,
      maxRetries: 3,
      priorityProcessing: true,
      persistQueue: true,
      autoProcessOnOnline: true
    },
    lastUpdate: null,
    error: null
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<OfflineQueueState>) => {
    setState(prev => ({ ...prev, ...updates, lastUpdate: Date.now() }));
  }, []);

  /**
   * Refresh data from manager
   */
  const refreshData = useCallback(() => {
    try {
      const metrics = offlineQueueManager.getMetrics();
      const pendingRequests = offlineQueueManager.getPendingRequests();
      const failedRequests = offlineQueueManager.getFailedRequests();

      updateState({
        metrics,
        pendingRequests,
        failedRequests,
        error: null
      });
    } catch (error) {
      updateState({ error: `Failed to refresh data: ${error}` });
    }
  }, [updateState]);

  /**
   * Add request to queue
   */
  const addRequest = useCallback(async (
    url: string,
    method: QueuedRequest['method'] = 'POST',
    body?: any,
    priority: QueuedRequest['priority'] = 'medium',
    metadata?: QueuedRequest['metadata']
  ): Promise<string> => {
    try {
      const requestId = await offlineQueueManager.addRequest(url, method, body, priority, metadata);
      refreshData();
      return requestId;
    } catch (error) {
      updateState({ error: `Failed to add request: ${error}` });
      throw error;
    }
  }, [refreshData, updateState]);

  /**
   * Cancel request
   */
  const cancelRequest = useCallback((requestId: string): boolean => {
    try {
      const success = offlineQueueManager.cancelRequest(requestId);
      refreshData();
      return success;
    } catch (error) {
      updateState({ error: `Failed to cancel request: ${error}` });
      return false;
    }
  }, [refreshData, updateState]);

  /**
   * Retry failed requests
   */
  const retryFailedRequests = useCallback(async (): Promise<void> => {
    try {
      await offlineQueueManager.retryFailedRequests();
      refreshData();
    } catch (error) {
      updateState({ error: `Failed to retry requests: ${error}` });
    }
  }, [refreshData, updateState]);

  /**
   * Clear completed requests
   */
  const clearCompletedRequests = useCallback((): number => {
    try {
      const clearedCount = offlineQueueManager.clearCompletedRequests();
      refreshData();
      return clearedCount;
    } catch (error) {
      updateState({ error: `Failed to clear completed requests: ${error}` });
      return 0;
    }
  }, [refreshData, updateState]);

  /**
   * Clear all requests
   */
  const clearAllRequests = useCallback(() => {
    try {
      offlineQueueManager.clearAllRequests();
      refreshData();
    } catch (error) {
      updateState({ error: `Failed to clear all requests: ${error}` });
    }
  }, [refreshData, updateState]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<QueueConfig>) => {
    try {
      offlineQueueManager.updateConfig(newConfig);
      updateState({ config: { ...state.config, ...newConfig } });
    } catch (error) {
      updateState({ error: `Failed to update config: ${error}` });
    }
  }, [state.config, updateState]);

  /**
   * Get requests by priority
   */
  const getRequestsByPriority = useCallback((priority: QueuedRequest['priority']) => {
    return offlineQueueManager.getRequestsByPriority(priority);
  }, []);

  /**
   * Get requests by resource
   */
  const getRequestsByResource = useCallback((resource: string) => {
    return offlineQueueManager.getRequestsByResource(resource);
  }, []);

  /**
   * Get queue statistics
   */
  const getQueueStatistics = useCallback(() => {
    const { metrics } = state;
    const criticalRequests = getRequestsByPriority('critical').length;
    const highRequests = getRequestsByPriority('high').length;
    const mediumRequests = getRequestsByPriority('medium').length;
    const lowRequests = getRequestsByPriority('low').length;

    return {
      ...metrics,
      priorityDistribution: {
        critical: criticalRequests,
        high: highRequests,
        medium: mediumRequests,
        low: lowRequests
      },
      queueUtilization: (metrics.queueSize / 1000) * 100, // Assuming max 1000
      averageRetryCount: state.pendingRequests.length > 0
        ? state.pendingRequests.reduce((sum, req) => sum + req.retryCount, 0) / state.pendingRequests.length
        : 0
    };
  }, [state, getRequestsByPriority]);

  // Event listeners
  useEffect(() => {
    const handleEvent = (event: string, data: any) => {
      switch (event) {
        case 'request-added':
          optionsRef.current.onRequestAdded?.(data);
          refreshData();
          break;
        
        case 'request-completed':
          optionsRef.current.onRequestCompleted?.(data);
          refreshData();
          break;
        
        case 'request-failed':
          optionsRef.current.onRequestFailed?.(data);
          refreshData();
          break;
        
        case 'online':
          updateState({ isOnline: true });
          optionsRef.current.onOnline?.();
          break;
        
        case 'offline':
          updateState({ isOnline: false });
          optionsRef.current.onOffline?.();
          break;
        
        case 'batch-completed':
        case 'batch-failed':
        case 'request-cancelled':
        case 'retry-failed':
        case 'completed-cleared':
        case 'queue-cleared':
          refreshData();
          break;
      }
    };

    // Register event listeners
    offlineQueueManager.on('request-added', handleEvent);
    offlineQueueManager.on('request-completed', handleEvent);
    offlineQueueManager.on('request-failed', handleEvent);
    offlineQueueManager.on('online', handleEvent);
    offlineQueueManager.on('offline', handleEvent);
    offlineQueueManager.on('batch-completed', handleEvent);
    offlineQueueManager.on('batch-failed', handleEvent);
    offlineQueueManager.on('request-cancelled', handleEvent);
    offlineQueueManager.on('retry-failed', handleEvent);
    offlineQueueManager.on('completed-cleared', handleEvent);
    offlineQueueManager.on('queue-cleared', handleEvent);

    return () => {
      // Cleanup event listeners
      offlineQueueManager.off('request-added', handleEvent);
      offlineQueueManager.off('request-completed', handleEvent);
      offlineQueueManager.off('request-failed', handleEvent);
      offlineQueueManager.off('online', handleEvent);
      offlineQueueManager.off('offline', handleEvent);
      offlineQueueManager.off('batch-completed', handleEvent);
      offlineQueueManager.off('batch-failed', handleEvent);
      offlineQueueManager.off('request-cancelled', handleEvent);
      offlineQueueManager.off('retry-failed', handleEvent);
      offlineQueueManager.off('completed-cleared', handleEvent);
      offlineQueueManager.off('queue-cleared', handleEvent);
    };
  }, [refreshData, updateState]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => updateState({ isOnline: true });
    const handleOffline = () => updateState({ isOnline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateState]);

  // Initial data load
  useEffect(() => {
    if (options.autoStart !== false) {
      refreshData();
    }
  }, [refreshData, options.autoStart]);

  // Real-time updates
  useEffect(() => {
    if (options.enableRealTimeUpdates) {
      const interval = setInterval(refreshData, 3000); // Update every 3 seconds
      return () => clearInterval(interval);
    }
  }, [refreshData, options.enableRealTimeUpdates]);

  return {
    // State
    ...state,
    
    // Actions
    addRequest,
    cancelRequest,
    retryFailedRequests,
    clearCompletedRequests,
    clearAllRequests,
    updateConfig,
    refreshData,
    
    // Queries
    getRequestsByPriority,
    getRequestsByResource,
    getQueueStatistics
  };
}

/**
 * Hook for offline queue monitoring
 */
export function useOfflineQueueMonitor() {
  const { metrics, isOnline, getQueueStatistics } = useOfflineQueue({
    enableRealTimeUpdates: true
  });

  const [alerts, setAlerts] = useState<Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: number;
  }>>([]);

  const addAlert = useCallback((type: 'warning' | 'error' | 'info', message: string) => {
    setAlerts(prev => [...prev, { type, message, timestamp: Date.now() }]);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Monitor queue health
  useEffect(() => {
    // Check for queue overflow
    if (metrics.queueSize > 800) {
      addAlert('warning', 'Queue is approaching maximum capacity');
    }

    // Check for high failure rate
    if (metrics.totalRequests > 10 && metrics.successRate < 70) {
      addAlert('error', 'High failure rate detected');
    }

    // Check for long processing times
    if (metrics.averageProcessingTime > 10000) {
      addAlert('warning', 'Average processing time is high');
    }

    // Check for offline status with pending requests
    if (!isOnline && metrics.pendingRequests > 0) {
      addAlert('info', `Offline: ${metrics.pendingRequests} requests pending`);
    }
  }, [metrics, isOnline, addAlert]);

  return {
    metrics,
    isOnline,
    alerts,
    addAlert,
    clearAlerts,
    getQueueStatistics
  };
}

/**
 * Hook for request management
 */
export function useRequestManager() {
  const { addRequest, cancelRequest, getRequestsByPriority, getRequestsByResource } = useOfflineQueue();

  const addFinancialRequest = useCallback(async (
    url: string,
    method: QueuedRequest['method'] = 'POST',
    body?: any
  ) => {
    return await addRequest(url, method, body, 'critical', {
      resource: 'financial',
      operation: 'transaction'
    });
  }, [addRequest]);

  const addUserRequest = useCallback(async (
    url: string,
    method: QueuedRequest['method'] = 'POST',
    body?: any
  ) => {
    return await addRequest(url, method, body, 'high', {
      resource: 'user',
      operation: 'profile'
    });
  }, [addRequest]);

  const addCacheRequest = useCallback(async (
    url: string,
    method: QueuedRequest['method'] = 'POST',
    body?: any
  ) => {
    return await addRequest(url, method, body, 'medium', {
      resource: 'cache',
      operation: 'sync'
    });
  }, [addRequest]);

  const addAnalyticsRequest = useCallback(async (
    url: string,
    method: QueuedRequest['method'] = 'POST',
    body?: any
  ) => {
    return await addRequest(url, method, body, 'low', {
      resource: 'analytics',
      operation: 'tracking'
    });
  }, [addRequest]);

  const getHighPriorityRequests = useCallback(() => {
    return [
      ...getRequestsByPriority('critical'),
      ...getRequestsByPriority('high')
    ];
  }, [getRequestsByPriority]);

  const getFinancialRequests = useCallback(() => {
    return getRequestsByResource('financial');
  }, [getRequestsByResource]);

  return {
    addRequest,
    addFinancialRequest,
    addUserRequest,
    addCacheRequest,
    addAnalyticsRequest,
    cancelRequest,
    getRequestsByPriority,
    getRequestsByResource,
    getHighPriorityRequests,
    getFinancialRequests
  };
}