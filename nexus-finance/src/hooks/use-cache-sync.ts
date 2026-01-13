/**
 * Cache Sync React Hooks
 * 
 * React hooks for cache synchronization management.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  cacheSyncManager,
  type SyncOperation,
  type SyncConflict,
  type SyncMetrics,
  type SyncConfig,
  type SyncStrategy
} from '@/lib/cache-sync';

export interface UseCacheSyncOptions {
  autoStart?: boolean;
  enableRealTimeUpdates?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (duration: number) => void;
  onConflictDetected?: (conflict: SyncConflict) => void;
  onConflictResolved?: (conflict: SyncConflict) => void;
  onOperationFailed?: (operation: SyncOperation) => void;
}

export interface CacheSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  metrics: SyncMetrics;
  pendingOperations: SyncOperation[];
  conflicts: SyncConflict[];
  config: SyncConfig;
  lastUpdate: number | null;
  error: string | null;
}

export function useCacheSync(options: UseCacheSyncOptions = {}) {
  const [state, setState] = useState<CacheSyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    metrics: cacheSyncManager.getMetrics(),
    pendingOperations: [],
    conflicts: [],
    config: {
      autoSync: true,
      syncInterval: 30000,
      maxConcurrentSyncs: 3,
      enableDeltaSync: true,
      conflictResolutionStrategy: 'auto',
      backgroundSync: true,
      retryAttempts: 3,
      syncTimeout: 10000
    },
    lastUpdate: null,
    error: null
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<CacheSyncState>) => {
    setState(prev => ({ ...prev, ...updates, lastUpdate: Date.now() }));
  }, []);

  /**
   * Refresh data from manager
   */
  const refreshData = useCallback(() => {
    try {
      const metrics = cacheSyncManager.getMetrics();
      const pendingOperations = cacheSyncManager.getPendingOperations();
      const conflicts = cacheSyncManager.getConflicts();

      updateState({
        metrics,
        pendingOperations,
        conflicts,
        isSyncing: metrics.syncInProgress,
        error: null
      });
    } catch (error) {
      updateState({ error: `Failed to refresh data: ${error}` });
    }
  }, [updateState]);

  /**
   * Add sync operation
   */
  const addOperation = useCallback(async (
    type: SyncOperation['type'],
    resource: string,
    resourceId: string,
    data: any,
    priority: SyncOperation['priority'] = 'medium'
  ): Promise<string> => {
    try {
      const operationId = await cacheSyncManager.addOperation(type, resource, resourceId, data, priority);
      refreshData();
      return operationId;
    } catch (error) {
      updateState({ error: `Failed to add operation: ${error}` });
      throw error;
    }
  }, [refreshData, updateState]);

  /**
   * Force sync
   */
  const forceSync = useCallback(async () => {
    try {
      await cacheSyncManager.forceSync();
      refreshData();
    } catch (error) {
      updateState({ error: `Force sync failed: ${error}` });
      throw error;
    }
  }, [refreshData, updateState]);

  /**
   * Resolve conflict
   */
  const resolveConflict = useCallback(async (conflictId: string, resolution: SyncConflict['resolution']) => {
    try {
      await cacheSyncManager.resolveConflict(conflictId, resolution);
      refreshData();
    } catch (error) {
      updateState({ error: `Failed to resolve conflict: ${error}` });
      throw error;
    }
  }, [refreshData, updateState]);

  /**
   * Clear all data
   */
  const clearAll = useCallback(() => {
    try {
      cacheSyncManager.clearAll();
      refreshData();
    } catch (error) {
      updateState({ error: `Failed to clear data: ${error}` });
    }
  }, [refreshData, updateState]);

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<SyncConfig>) => {
    try {
      cacheSyncManager.updateConfig(newConfig);
      updateState({ config: { ...state.config, ...newConfig } });
    } catch (error) {
      updateState({ error: `Failed to update config: ${error}` });
    }
  }, [state.config, updateState]);

  /**
   * Get operations by resource
   */
  const getOperationsByResource = useCallback((resource: string) => {
    return state.pendingOperations.filter(op => op.resource === resource);
  }, [state.pendingOperations]);

  /**
   * Get conflicts by resource
   */
  const getConflictsByResource = useCallback((resource: string) => {
    return state.conflicts.filter(conflict => conflict.resource === resource);
  }, [state.conflicts]);

  /**
   * Get operations by priority
   */
  const getOperationsByPriority = useCallback((priority: SyncOperation['priority']) => {
    return state.pendingOperations.filter(op => op.priority === priority);
  }, [state.pendingOperations]);

  /**
   * Get conflicts by type
   */
  const getConflictsByType = useCallback((type: SyncConflict['conflictType']) => {
    return state.conflicts.filter(conflict => conflict.conflictType === type);
  }, [state.conflicts]);

  /**
   * Get sync statistics
   */
  const getSyncStatistics = useCallback(() => {
    const { metrics } = state;
    const successRate = metrics.totalOperations > 0 
      ? (metrics.successfulSyncs / metrics.totalOperations) * 100 
      : 0;

    return {
      ...metrics,
      successRate: Math.round(successRate * 100) / 100,
      queueSize: state.pendingOperations.length,
      conflictCount: state.conflicts.length,
      averageRetryCount: state.pendingOperations.length > 0
        ? state.pendingOperations.reduce((sum, op) => sum + op.retryCount, 0) / state.pendingOperations.length
        : 0
    };
  }, [state]);

  // Event listeners
  useEffect(() => {
    const handleEvent = (event: string, data: any) => {
      switch (event) {
        case 'sync-started':
          updateState({ isSyncing: true });
          optionsRef.current.onSyncStart?.();
          break;
        
        case 'sync-completed':
          updateState({ isSyncing: false });
          optionsRef.current.onSyncComplete?.(data.duration);
          refreshData();
          break;
        
        case 'conflict-detected':
          optionsRef.current.onConflictDetected?.(data);
          refreshData();
          break;
        
        case 'conflict-resolved':
          optionsRef.current.onConflictResolved?.(data);
          refreshData();
          break;
        
        case 'operation-failed':
          optionsRef.current.onOperationFailed?.(data);
          refreshData();
          break;
        
        case 'operation-completed':
        case 'operation-added':
        case 'operation-syncing':
          refreshData();
          break;
      }
    };

    // Register event listeners
    cacheSyncManager.on('sync-started', handleEvent);
    cacheSyncManager.on('sync-completed', handleEvent);
    cacheSyncManager.on('conflict-detected', handleEvent);
    cacheSyncManager.on('conflict-resolved', handleEvent);
    cacheSyncManager.on('operation-failed', handleEvent);
    cacheSyncManager.on('operation-completed', handleEvent);
    cacheSyncManager.on('operation-added', handleEvent);
    cacheSyncManager.on('operation-syncing', handleEvent);

    return () => {
      // Cleanup event listeners
      cacheSyncManager.off('sync-started', handleEvent);
      cacheSyncManager.off('sync-completed', handleEvent);
      cacheSyncManager.off('conflict-detected', handleEvent);
      cacheSyncManager.off('conflict-resolved', handleEvent);
      cacheSyncManager.off('operation-failed', handleEvent);
      cacheSyncManager.off('operation-completed', handleEvent);
      cacheSyncManager.off('operation-added', handleEvent);
      cacheSyncManager.off('operation-syncing', handleEvent);
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
      const interval = setInterval(refreshData, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [refreshData, options.enableRealTimeUpdates]);

  return {
    // State
    ...state,
    
    // Actions
    addOperation,
    forceSync,
    resolveConflict,
    clearAll,
    updateConfig,
    refreshData,
    
    // Queries
    getOperationsByResource,
    getConflictsByResource,
    getOperationsByPriority,
    getConflictsByType,
    getSyncStatistics
  };
}

/**
 * Hook for sync conflict management
 */
export function useSyncConflicts() {
  const { conflicts, resolveConflict, getConflictsByResource, getConflictsByType } = useCacheSync();
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set());

  const resolveConflictWithLoading = useCallback(async (conflictId: string, resolution: SyncConflict['resolution']) => {
    setResolvingConflicts(prev => new Set([...prev, conflictId]));
    try {
      await resolveConflict(conflictId, resolution);
    } finally {
      setResolvingConflicts(prev => {
        const newSet = new Set(prev);
        newSet.delete(conflictId);
        return newSet;
      });
    }
  }, [resolveConflict]);

  const getUnresolvedConflicts = useCallback(() => {
    return conflicts.filter(conflict => conflict.status === 'pending');
  }, [conflicts]);

  const getResolvedConflicts = useCallback(() => {
    return conflicts.filter(conflict => conflict.status === 'resolved');
  }, [conflicts]);

  const getConflictsByResolution = useCallback((resolution: SyncConflict['resolution']) => {
    return conflicts.filter(conflict => conflict.resolution === resolution);
  }, [conflicts]);

  return {
    conflicts,
    resolvingConflicts,
    resolveConflict: resolveConflictWithLoading,
    getUnresolvedConflicts,
    getResolvedConflicts,
    getConflictsByResource,
    getConflictsByType,
    getConflictsByResolution
  };
}

/**
 * Hook for sync operations management
 */
export function useSyncOperations() {
  const { 
    pendingOperations, 
    addOperation, 
    getOperationsByResource, 
    getOperationsByPriority,
    forceSync 
  } = useCacheSync();

  const addFinancialOperation = useCallback(async (
    type: SyncOperation['type'],
    resourceId: string,
    data: any
  ) => {
    return await addOperation(type, 'financial', resourceId, data, 'critical');
  }, [addOperation]);

  const addCacheOperation = useCallback(async (
    type: SyncOperation['type'],
    resourceId: string,
    data: any
  ) => {
    return await addOperation(type, 'cache', resourceId, data, 'medium');
  }, [addOperation]);

  const addPreferenceOperation = useCallback(async (
    type: SyncOperation['type'],
    resourceId: string,
    data: any
  ) => {
    return await addOperation(type, 'preferences', resourceId, data, 'low');
  }, [addOperation]);

  const getHighPriorityOperations = useCallback(() => {
    return getOperationsByPriority('high').concat(getOperationsByPriority('critical'));
  }, [getOperationsByPriority]);

  const getFailedOperations = useCallback(() => {
    return pendingOperations.filter(op => op.status === 'failed');
  }, [pendingOperations]);

  const retryFailedOperations = useCallback(async () => {
    const failedOps = getFailedOperations();
    for (const op of failedOps) {
      // Reset status to pending for retry
      op.status = 'pending';
      op.retryCount = 0;
    }
    await forceSync();
  }, [getFailedOperations, forceSync]);

  return {
    pendingOperations,
    addOperation,
    addFinancialOperation,
    addCacheOperation,
    addPreferenceOperation,
    getOperationsByResource,
    getOperationsByPriority,
    getHighPriorityOperations,
    getFailedOperations,
    retryFailedOperations,
    forceSync
  };
}

/**
 * Hook for sync metrics and monitoring
 */
export function useSyncMetrics() {
  const { metrics, getSyncStatistics, lastUpdate } = useCacheSync();
  const [historicalMetrics, setHistoricalMetrics] = useState<SyncMetrics[]>([]);

  const recordMetrics = useCallback(() => {
    const currentMetrics = getSyncStatistics();
    setHistoricalMetrics(prev => [...prev.slice(-23), currentMetrics]); // Keep last 24
  }, [getSyncStatistics]);

  const getSyncTrend = useCallback(() => {
    if (historicalMetrics.length < 2) return 'stable';
    
    const recent = historicalMetrics.slice(-5);
    const older = historicalMetrics.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentSuccessRate = recent.reduce((sum, m) => sum + (m.successfulSyncs / Math.max(m.totalOperations, 1)), 0) / recent.length;
    const olderSuccessRate = older.reduce((sum, m) => sum + (m.successfulSyncs / Math.max(m.totalOperations, 1)), 0) / older.length;
    
    if (recentSuccessRate > olderSuccessRate * 1.05) return 'improving';
    if (recentSuccessRate < olderSuccessRate * 0.95) return 'declining';
    return 'stable';
  }, [historicalMetrics]);

  const getPerformanceGrade = useCallback(() => {
    const stats = getSyncStatistics();
    const { successRate, averageSyncTime, queueSize } = stats;
    
    let score = 0;
    if (successRate >= 95) score += 40;
    else if (successRate >= 90) score += 30;
    else if (successRate >= 80) score += 20;
    else if (successRate >= 70) score += 10;
    
    if (averageSyncTime <= 1000) score += 30;
    else if (averageSyncTime <= 3000) score += 20;
    else if (averageSyncTime <= 5000) score += 10;
    
    if (queueSize === 0) score += 30;
    else if (queueSize <= 5) score += 20;
    else if (queueSize <= 10) score += 10;
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, [getSyncStatistics]);

  // Record metrics periodically
  useEffect(() => {
    const interval = setInterval(recordMetrics, 30000); // Record every 30 seconds
    return () => clearInterval(interval);
  }, [recordMetrics]);

  return {
    metrics,
    historicalMetrics,
    getSyncStatistics,
    getSyncTrend,
    getPerformanceGrade,
    recordMetrics,
    lastUpdate
  };
}