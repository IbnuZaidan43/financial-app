/**
 * Cache Warming React Hooks
 * 
 * React hooks for intelligent cache warming system
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  predictiveCacheWarmer,
  type CacheWarmingTask,
  type CacheWarmingConfig,
  type CacheWarmingMetrics
} from '@/lib/predictive-cache-warmer';
import { 
  userBehaviorAnalyzer,
  type BehaviorMetrics,
  type UserBehaviorPattern
} from '@/lib/user-behavior-analyzer';
import { 
  popularContentDetector,
  type ContentPopularityMetrics
} from '@/lib/popular-content-detector';
import { 
  resourcePrioritizer,
  type ResourcePriority
} from '@/lib/resource-prioritizer';

export interface UseCacheWarmingOptions {
  autoStart?: boolean;
  enableRealTimeUpdates?: boolean;
  userId?: string;
  onTaskStarted?: (task: CacheWarmingTask) => void;
  onTaskCompleted?: (task: CacheWarmingTask) => void;
  onTaskFailed?: (task: CacheWarmingTask) => void;
  onWarmingStarted?: () => void;
  onWarmingStopped?: () => void;
}

export interface CacheWarmingState {
  isRunning: boolean;
  metrics: CacheWarmingMetrics;
  queueStatus: {
    pending: CacheWarmingTask[];
    active: CacheWarmingTask[];
    completed: CacheWarmingTask[];
    failed: CacheWarmingTask[];
  };
  recommendations: Array<{
    resourceId: string;
    url: string;
    priority: number;
    reason: string;
    estimatedBenefit: number;
    size: number;
    type: string;
  }>;
  popularContent: ContentPopularityMetrics[];
  prioritizedResources: ResourcePriority[];
  behaviorMetrics: BehaviorMetrics | null;
  lastUpdate: number | null;
  error: string | null;
}

export function useCacheWarming(options: UseCacheWarmingOptions = {}) {
  const [state, setState] = useState<CacheWarmingState>({
    isRunning: false,
    metrics: predictiveCacheWarmer.getMetrics(),
    queueStatus: predictiveCacheWarmer.getQueueStatus(),
    recommendations: [],
    popularContent: [],
    prioritizedResources: [],
    behaviorMetrics: null,
    lastUpdate: null,
    error: null
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<CacheWarmingState>) => {
    setState(prev => ({ ...prev, ...updates, lastUpdate: Date.now() }));
  }, []);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(() => {
    try {
      const metrics = predictiveCacheWarmer.getMetrics();
      const queueStatus = predictiveCacheWarmer.getQueueStatus();
      const recommendations = popularContentDetector.getCacheWarmingRecommendations();
      const popularContent = popularContentDetector.getPopularContent();
      const prioritizedResources = resourcePrioritizer.getPrioritizedResources();
      const behaviorMetrics = options.userId ? userBehaviorAnalyzer.getBehaviorMetrics(options.userId) : null;

      updateState({
        metrics,
        queueStatus,
        recommendations,
        popularContent,
        prioritizedResources,
        behaviorMetrics,
        error: null
      });
    } catch (error) {
      updateState({ error: `Failed to refresh data: ${error}` });
    }
  }, [updateState, options.userId]);

  /**
   * Start cache warming
   */
  const startWarming = useCallback(() => {
    try {
      predictiveCacheWarmer.start();
      updateState({ isRunning: true });
      optionsRef.current.onWarmingStarted?.();
    } catch (error) {
      updateState({ error: `Failed to start warming: ${error}` });
    }
  }, [updateState]);

  /**
   * Stop cache warming
   */
  const stopWarming = useCallback(() => {
    try {
      predictiveCacheWarmer.stop();
      updateState({ isRunning: false });
      optionsRef.current.onWarmingStopped?.();
    } catch (error) {
      updateState({ error: `Failed to stop warming: ${error}` });
    }
  }, [updateState]);

  /**
   * Add warming task
   */
  const addWarmingTask = useCallback((
    resource: string,
    priority: number,
    reason: string,
    confidence: number
  ) => {
    try {
      const taskId = predictiveCacheWarmer.addWarmingTask(resource, priority, reason, confidence);
      refreshData();
      return taskId;
    } catch (error) {
      updateState({ error: `Failed to add warming task: ${error}` });
      throw error;
    }
  }, [refreshData, updateState]);

  /**
   * Add warming tasks from behavior
   */
  const addBehaviorBasedTasks = useCallback(() => {
    try {
      const count = predictiveCacheWarmer.addWarmingTasksFromBehavior(options.userId);
      refreshData();
      return count;
    } catch (error) {
      updateState({ error: `Failed to add behavior tasks: ${error}` });
      throw error;
    }
  }, [refreshData, updateState, options.userId]);

  /**
   * Add popular content tasks
   */
  const addPopularContentTasks = useCallback((limit: number = 20) => {
    try {
      const recommendations = popularContentDetector.getCacheWarmingRecommendations()
        .slice(0, limit);
      
      let addedCount = 0;
      recommendations.forEach(rec => {
        predictiveCacheWarmer.addWarmingTask(
          rec.url,
          rec.priority,
          rec.reason,
          Math.min(rec.estimatedBenefit / 100, 1)
        );
        addedCount++;
      });

      refreshData();
      return addedCount;
    } catch (error) {
      updateState({ error: `Failed to add popular content tasks: ${error}` });
      throw error;
    }
  }, [refreshData, updateState]);

  /**
   * Record user behavior
   */
  const recordBehavior = useCallback((
    action: UserBehaviorPattern['action'],
    resource: string,
    metadata?: Record<string, any>
  ) => {
    if (!options.userId) return;

    try {
      userBehaviorAnalyzer.recordBehavior(options.userId, action, resource, metadata);
      
      // Also record in popular content detector
      popularContentDetector.recordAccess(
        resource,
        resource,
        options.userId,
        `session-${Date.now()}`,
        0,
        true,
        false
      );

      refreshData();
    } catch (error) {
      updateState({ error: `Failed to record behavior: ${error}` });
    }
  }, [refreshData, updateState, options.userId]);

  /**
   * Prioritize resource
   */
  const prioritizeResource = useCallback((resourceId: string, url: string) => {
    try {
      const priority = resourcePrioritizer.prioritizeResource(resourceId, url, options.userId);
      refreshData();
      return priority;
    } catch (error) {
      updateState({ error: `Failed to prioritize resource: ${error}` });
      throw error;
    }
  }, [refreshData, updateState, options.userId]);

  /**
   * Clear completed tasks
   */
  const clearCompletedTasks = useCallback(() => {
    try {
      // This would need to be implemented in the warmer
      refreshData();
    } catch (error) {
      updateState({ error: `Failed to clear completed tasks: ${error}` });
    }
  }, [refreshData, updateState]);

  /**
   * Get warming statistics
   */
  const getStatistics = useCallback(() => {
    try {
      return {
        warmer: predictiveCacheWarmer.getStatistics(),
        behavior: userBehaviorAnalyzer.getStatistics(),
        content: popularContentDetector.getStatistics(),
        prioritizer: resourcePrioritizer.getStatistics()
      };
    } catch (error) {
      updateState({ error: `Failed to get statistics: ${error}` });
      return null;
    }
  }, [updateState]);

  // Event listeners
  useEffect(() => {
    const handleWarmingEvent = (event: string, data: any) => {
      switch (event) {
        case 'warming-started':
          updateState({ isRunning: true });
          optionsRef.current.onWarmingStarted?.();
          break;
        
        case 'warming-stopped':
          updateState({ isRunning: false });
          optionsRef.current.onWarmingStopped?.();
          break;
        
        case 'task-started':
          optionsRef.current.onTaskStarted?.(data);
          refreshData();
          break;
        
        case 'task-completed':
          optionsRef.current.onTaskCompleted?.(data);
          refreshData();
          break;
        
        case 'task-failed':
          optionsRef.current.onTaskFailed?.(data);
          refreshData();
          break;
        
        case 'behavior-tasks-added':
        case 'automatic-warming':
        case 'analysis-completed':
          refreshData();
          break;
      }
    };

    // Register event listeners
    predictiveCacheWarmer.on('warming-started', handleWarmingEvent);
    predictiveCacheWarmer.on('warming-stopped', handleWarmingEvent);
    predictiveCacheWarmer.on('task-started', handleWarmingEvent);
    predictiveCacheWarmer.on('task-completed', handleWarmingEvent);
    predictiveCacheWarmer.on('task-failed', handleWarmingEvent);
    predictiveCacheWarmer.on('behavior-tasks-added', handleWarmingEvent);
    predictiveCacheWarmer.on('automatic-warming', handleWarmingEvent);
    predictiveCacheWarmer.on('analysis-completed', handleWarmingEvent);

    userBehaviorAnalyzer.on('analysis-completed', handleWarmingEvent);
    popularContentDetector.on('periodic-analysis-completed', handleWarmingEvent);
    resourcePrioritizer.on('periodic-update-completed', handleWarmingEvent);

    return () => {
      // Cleanup event listeners
      predictiveCacheWarmer.off('warming-started', handleWarmingEvent);
      predictiveCacheWarmer.off('warming-stopped', handleWarmingEvent);
      predictiveCacheWarmer.off('task-started', handleWarmingEvent);
      predictiveCacheWarmer.off('task-completed', handleWarmingEvent);
      predictiveCacheWarmer.off('task-failed', handleWarmingEvent);
      predictiveCacheWarmer.off('behavior-tasks-added', handleWarmingEvent);
      predictiveCacheWarmer.off('automatic-warming', handleWarmingEvent);
      predictiveCacheWarmer.off('analysis-completed', handleWarmingEvent);

      userBehaviorAnalyzer.off('analysis-completed', handleWarmingEvent);
      popularContentDetector.off('periodic-analysis-completed', handleWarmingEvent);
      resourcePrioritizer.off('periodic-update-completed', handleWarmingEvent);
    };
  }, [refreshData, updateState]);

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
    startWarming,
    stopWarming,
    addWarmingTask,
    addBehaviorBasedTasks,
    addPopularContentTasks,
    recordBehavior,
    prioritizeResource,
    clearCompletedTasks,
    refreshData,
    
    // Queries
    getStatistics
  };
}

/**
 * Hook for cache warming monitoring
 */
export function useCacheWarmingMonitor() {
  const { metrics, isRunning, getStatistics } = useCacheWarming({
    enableRealTimeUpdates: true
  });

  const [alerts, setAlerts] = useState<Array<{
    type: 'warning' | 'error' | 'info' | 'success';
    message: string;
    timestamp: number;
    data?: any;
  }>>([]);

  const addAlert = useCallback((type: 'warning' | 'error' | 'info' | 'success', message: string, data?: any) => {
    setAlerts(prev => [...prev, { type, message, timestamp: Date.now(), data }]);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Monitor cache warming health
  useEffect(() => {
    // Check for low efficiency
    if (metrics.warmingEfficiency < 50 && metrics.totalTasks > 10) {
      addAlert('warning', 'Cache warming efficiency is below 50%', {
        efficiency: metrics.warmingEfficiency,
        totalTasks: metrics.totalTasks
      });
    }

    // Check for high failure rate
    if (metrics.totalTasks > 0) {
      const failureRate = (metrics.failedTasks / metrics.totalTasks) * 100;
      if (failureRate > 30) {
        addAlert('error', 'High failure rate detected in cache warming', {
          failureRate,
          failedTasks: metrics.failedTasks,
          totalTasks: metrics.totalTasks
        });
      }
    }

    // Check for queue overflow
    if (metrics.queuedTasks > 40) {
      addAlert('warning', 'Cache warming queue is approaching capacity', {
        queuedTasks: metrics.queuedTasks,
        maxQueueSize: 50
      });
    }

    // Check for system inactivity
    if (!isRunning && metrics.totalTasks === 0) {
      addAlert('info', 'Cache warming system is idle');
    }

    // Success notifications
    if (metrics.warmingEfficiency > 80 && metrics.totalTasks > 5) {
      addAlert('success', 'Cache warming is performing optimally', {
        efficiency: metrics.warmingEfficiency,
        completedTasks: metrics.completedTasks
      });
    }
  }, [metrics, isRunning, addAlert]);

  return {
    metrics,
    isRunning,
    alerts,
    addAlert,
    clearAlerts,
    getStatistics
  };
}

/**
 * Hook for user behavior tracking
 */
export function useUserBehaviorTracker(userId: string) {
  const [behaviorMetrics, setBehaviorMetrics] = useState<BehaviorMetrics | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const trackAction = useCallback((
    action: UserBehaviorPattern['action'],
    resource: string,
    metadata?: Record<string, any>
  ) => {
    try {
      userBehaviorAnalyzer.recordBehavior(userId, action, resource, metadata);
      
      // Update metrics
      const updatedMetrics = userBehaviorAnalyzer.getBehaviorMetrics(userId);
      setBehaviorMetrics(updatedMetrics);

      // Also record in popular content detector
      popularContentDetector.recordAccess(
        resource,
        resource,
        userId,
        `session-${Date.now()}`,
        0,
        true,
        false
      );
    } catch (error) {
      console.error('Failed to track behavior:', error);
    }
  }, [userId]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const getRecommendations = useCallback(() => {
    return userBehaviorAnalyzer.getCacheWarmingRecommendations(userId);
  }, [userId]);

  // Initial load
  useEffect(() => {
    const metrics = userBehaviorAnalyzer.getBehaviorMetrics(userId);
    setBehaviorMetrics(metrics);
  }, [userId]);

  return {
    behaviorMetrics,
    isTracking,
    trackAction,
    startTracking,
    stopTracking,
    getRecommendations
  };
}

/**
 * Hook for popular content monitoring
 */
export function usePopularContentMonitor() {
  const [popularContent, setPopularContent] = useState<ContentPopularityMetrics[]>([]);
  const [trendingContent, setTrendingContent] = useState<ContentPopularityMetrics[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{
    resourceId: string;
    url: string;
    priority: number;
    reason: string;
    estimatedBenefit: number;
    size: number;
    type: string;
  }>>([]);

  const refreshContent = useCallback(() => {
    try {
      const popular = popularContentDetector.getPopularContent();
      const trending = popularContentDetector.getTrendingContent();
      const recs = popularContentDetector.getCacheWarmingRecommendations();

      setPopularContent(popular);
      setTrendingContent(trending);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to refresh popular content:', error);
    }
  }, []);

  const recordAccess = useCallback((
    resourceId: string,
    url: string,
    userId: string,
    loadTime: number = 0,
    success: boolean = true,
    cacheHit: boolean = false
  ) => {
    try {
      popularContentDetector.recordAccess(resourceId, url, userId, `session-${Date.now()}`, loadTime, success, cacheHit);
      refreshContent();
    } catch (error) {
      console.error('Failed to record access:', error);
    }
  }, [refreshContent]);

  // Initial load and periodic updates
  useEffect(() => {
    refreshContent();
    
    const interval = setInterval(refreshContent, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [refreshContent]);

  return {
    popularContent,
    trendingContent,
    recommendations,
    refreshContent,
    recordAccess
  };
}

/**
 * Hook for resource prioritization
 */
export function useResourcePrioritizer(userId?: string) {
  const [prioritizedResources, setPrioritizedResources] = useState<ResourcePriority[]>([]);
  const [highPriorityResources, setHighPriorityResources] = useState<ResourcePriority[]>([]);
  const [criticalResources, setCriticalResources] = useState<ResourcePriority[]>([]);

  const prioritizeResource = useCallback((resourceId: string, url: string) => {
    try {
      const priority = resourcePrioritizer.prioritizeResource(resourceId, url, userId);
      refreshPriorities();
      return priority;
    } catch (error) {
      console.error('Failed to prioritize resource:', error);
      throw error;
    }
  }, [userId]);

  const refreshPriorities = useCallback(() => {
    try {
      const prioritized = resourcePrioritizer.getPrioritizedResources();
      const highPriority = resourcePrioritizer.getHighPriorityResources();
      const critical = resourcePrioritizer.getCriticalResources();

      setPrioritizedResources(prioritized);
      setHighPriorityResources(highPriority);
      setCriticalResources(critical);
    } catch (error) {
      console.error('Failed to refresh priorities:', error);
    }
  }, []);

  const getUserSpecificPriorities = useCallback((limit: number = 20) => {
    if (!userId) return [];
    return resourcePrioritizer.getUserSpecificPriorities(userId, limit);
  }, [userId]);

  // Initial load and periodic updates
  useEffect(() => {
    refreshPriorities();
    
    const interval = setInterval(refreshPriorities, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [refreshPriorities]);

  return {
    prioritizedResources,
    highPriorityResources,
    criticalResources,
    prioritizeResource,
    refreshPriorities,
    getUserSpecificPriorities
  };
}