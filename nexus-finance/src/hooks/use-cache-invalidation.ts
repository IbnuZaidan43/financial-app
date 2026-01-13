/**
 * Cache Invalidation React Hooks
 * 
 * React hooks for cache invalidation management and monitoring.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  cacheInvalidationManager, 
  CacheInvalidationResult,
  CacheInvalidationEvent,
  invalidateFinancialData,
  invalidateUserData,
  invalidateOnLogout,
  invalidateOnTransactionComplete,
  invalidateStaticAssets,
  invalidateAPIResponses,
  updateAPIVersion,
  updateAssetVersion
} from '@/lib/cache-invalidation';

// Re-export types for convenience
export type { CacheInvalidationResult, CacheInvalidationEvent } from '@/lib/cache-invalidation';

export interface UseCacheInvalidationOptions {
  autoInvalidate?: boolean;
  invalidateOnEvents?: string[];
  onInvalidationComplete?: (result: CacheInvalidationResult) => void;
  onInvalidationError?: (error: string) => void;
}

export interface CacheInvalidationState {
  isInvalidating: boolean;
  lastInvalidation: CacheInvalidationResult | null;
  invalidationHistory: CacheInvalidationResult[];
  stats: any;
}

export function useCacheInvalidation(options: UseCacheInvalidationOptions = {}) {
  const [state, setState] = useState<CacheInvalidationState>({
    isInvalidating: false,
    lastInvalidation: null,
    invalidationHistory: [],
    stats: null
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<CacheInvalidationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle invalidation completion
   */
  const handleInvalidationComplete = useCallback((result: CacheInvalidationResult) => {
    setState(prev => ({
      ...prev,
      isInvalidating: false,
      lastInvalidation: result,
      invalidationHistory: [...prev.invalidationHistory.slice(-9), result] // Keep last 10
    }));

    // Trigger callback
    if (result.success && optionsRef.current.onInvalidationComplete) {
      optionsRef.current.onInvalidationComplete(result);
    }

    if (!result.success && optionsRef.current.onInvalidationError) {
      result.errors.forEach(error => optionsRef.current.onInvalidationError!(error));
    }
  }, []);

  /**
   * Invalidate by pattern
   */
  const invalidateByPattern = useCallback(async (pattern: string | RegExp) => {
    updateState({ isInvalidating: true });
    
    try {
      const result = await cacheInvalidationManager.invalidateByPattern(pattern);
      handleInvalidationComplete(result);
      return result;
    } catch (error) {
      const errorResult: CacheInvalidationResult = {
        success: false,
        invalidatedKeys: [],
        errors: [String(error)],
        duration: 0
      };
      handleInvalidationComplete(errorResult);
      return errorResult;
    }
  }, [handleInvalidationComplete, updateState]);

  /**
   * Invalidate by tags
   */
  const invalidateByTags = useCallback(async (tags: string[]) => {
    updateState({ isInvalidating: true });
    
    try {
      const result = await cacheInvalidationManager.invalidateByTags(tags);
      handleInvalidationComplete(result);
      return result;
    } catch (error) {
      const errorResult: CacheInvalidationResult = {
        success: false,
        invalidatedKeys: [],
        errors: [String(error)],
        duration: 0
      };
      handleInvalidationComplete(errorResult);
      return errorResult;
    }
  }, [handleInvalidationComplete, updateState]);

  /**
   * Invalidate by event
   */
  const invalidateByEvent = useCallback(async (eventType: string, eventData?: any) => {
    updateState({ isInvalidating: true });
    
    try {
      const result = await cacheInvalidationManager.invalidateByEvent(eventType, eventData);
      handleInvalidationComplete(result);
      return result;
    } catch (error) {
      const errorResult: CacheInvalidationResult = {
        success: false,
        invalidatedKeys: [],
        errors: [String(error)],
        duration: 0
      };
      handleInvalidationComplete(errorResult);
      return errorResult;
    }
  }, [handleInvalidationComplete, updateState]);

  /**
   * Invalidate by version
   */
  const invalidateByVersion = useCallback(async (versionKey: string, newVersion: string) => {
    updateState({ isInvalidating: true });
    
    try {
      const result = await cacheInvalidationManager.invalidateByVersion(versionKey, newVersion);
      handleInvalidationComplete(result);
      return result;
    } catch (error) {
      const errorResult: CacheInvalidationResult = {
        success: false,
        invalidatedKeys: [],
        errors: [String(error)],
        duration: 0
      };
      handleInvalidationComplete(errorResult);
      return errorResult;
    }
  }, [handleInvalidationComplete, updateState]);

  /**
   * Preset invalidation functions
   */
  const invalidateFinancial = useCallback(() => invalidateFinancialData(), []);
  const invalidateUser = useCallback(() => invalidateUserData(), []);
  const triggerLogoutInvalidation = useCallback(() => invalidateOnLogout(), []);
  const invalidateTransaction = useCallback((data: any) => invalidateOnTransactionComplete(data), []);
  const invalidateAssets = useCallback(() => invalidateStaticAssets(), []);
  const invalidateAPI = useCallback(() => invalidateAPIResponses(), []);
  const updateAPI = useCallback((version: string) => updateAPIVersion(version), []);
  const updateAssets = useCallback((version: string) => updateAssetVersion(version), []);

  /**
   * Clear invalidation history
   */
  const clearHistory = useCallback(() => {
    updateState({ invalidationHistory: [] });
  }, [updateState]);

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(() => {
    const stats = cacheInvalidationManager.getInvalidationStats();
    updateState({ stats });
  }, [updateState]);

  // Setup event listeners
  useEffect(() => {
    if (options.autoInvalidate && options.invalidateOnEvents) {
      const handleEvent = (event: CacheInvalidationEvent) => {
        if (options.invalidateOnEvents!.includes(event.type)) {
          invalidateByEvent(event.type, event.data);
        }
      };

      options.invalidateOnEvents.forEach(eventType => {
        cacheInvalidationManager.addEventListener(eventType, handleEvent);
      });

      return () => {
        options.invalidateOnEvents!.forEach(eventType => {
          cacheInvalidationManager.removeEventListener(eventType, handleEvent);
        });
      };
    }
  }, [options.autoInvalidate, options.invalidateOnEvents, invalidateByEvent]);

  // Load initial stats
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    // State
    ...state,
    
    // Actions
    invalidateByPattern,
    invalidateByTags,
    invalidateByEvent,
    invalidateByVersion,
    
    // Preset functions
    invalidateFinancial,
    invalidateUser,
    triggerLogoutInvalidation,
    invalidateTransaction,
    invalidateAssets,
    invalidateAPI,
    updateAPI,
    updateAssets,
    
    // Utilities
    clearHistory,
    refreshStats
  };
}

/**
 * Hook for automatic cache invalidation based on app events
 */
export function useAutoCacheInvalidation() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastUserActivity, setLastUserActivity] = useState(Date.now());

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      cacheInvalidationManager.invalidateByEvent('connection-restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      cacheInvalidationManager.invalidateByEvent('connection-lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor user activity
  useEffect(() => {
    const updateActivity = () => setLastUserActivity(Date.now());
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));
    
    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, []);

  // Auto-invalidate based on inactivity
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastUserActivity;
      
      // Invalidate sensitive data after 30 minutes of inactivity
      if (inactiveTime > 30 * 60 * 1000) {
        invalidateFinancialData();
        invalidateUserData();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(checkInactivity);
  }, [lastUserActivity]);

  return {
    isOnline,
    lastUserActivity,
    invalidateFinancialData,
    invalidateUserData
  };
}

/**
 * Hook for cache invalidation monitoring and debugging
 */
export function useCacheInvalidationMonitor() {
  const [logs, setLogs] = useState<Array<{
    timestamp: number;
    type: string;
    message: string;
    data?: any;
  }>>([]);

  const addLog = useCallback((type: string, message: string, data?: any) => {
    setLogs(prev => [...prev.slice(-99), { // Keep last 100 logs
      timestamp: Date.now(),
      type,
      message,
      data
    }]);
  }, []);

  useEffect(() => {
    // Monitor all invalidation events
    const handleInvalidationEvent = (event: CacheInvalidationEvent) => {
      addLog('event', `Invalidation event: ${event.type}`, event);
    };

    // Monitor common events
    const events = [
      'user-logout',
      'transaction-complete',
      'balance-change',
      'connection-restored',
      'connection-lost'
    ];

    events.forEach(eventType => {
      cacheInvalidationManager.addEventListener(eventType, handleInvalidationEvent);
    });

    return () => {
      events.forEach(eventType => {
        cacheInvalidationManager.removeEventListener(eventType, handleInvalidationEvent);
      });
    };
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    clearLogs,
    addLog
  };
}