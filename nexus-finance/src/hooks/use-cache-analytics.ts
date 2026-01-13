/**
 * Cache Analytics React Hooks
 * 
 * React hooks for cache monitoring, analytics, and performance tracking.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  cacheAnalyticsManager,
  type CacheMetrics,
  type CachePerformanceReport,
  type CacheRecommendation,
  type CacheAlert,
  type CacheTrend,
  type CacheAnalyticsConfig
} from '@/lib/cache-analytics';

export interface UseCacheAnalyticsOptions {
  enableRealTimeMonitoring?: boolean;
  monitoringInterval?: number;
  autoStart?: boolean;
  onMetricsUpdate?: (metrics: CacheMetrics) => void;
  onAlert?: (alert: CacheAlert) => void;
  onRecommendation?: (recommendation: CacheRecommendation) => void;
}

export interface CacheAnalyticsState {
  isMonitoring: boolean;
  currentMetrics: CacheMetrics | null;
  report: CachePerformanceReport | null;
  recommendations: CacheRecommendation[];
  alerts: CacheAlert[];
  trends: CacheTrend[];
  lastUpdated: number | null;
  error: string | null;
}

// Re-export types for convenience
export type { 
  CacheMetrics,
  CachePerformanceReport,
  CacheRecommendation,
  CacheAlert,
  CacheTrend,
  CacheAnalyticsConfig
} from '@/lib/cache-analytics';

export function useCacheAnalytics(options: UseCacheAnalyticsOptions = {}) {
  const [state, setState] = useState<CacheAnalyticsState>({
    isMonitoring: false,
    currentMetrics: null,
    report: null,
    recommendations: [],
    alerts: [],
    trends: [],
    lastUpdated: null,
    error: null
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Update state safely
   */
  const updateState = useCallback((updates: Partial<CacheAnalyticsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    try {
      cacheAnalyticsManager.startMonitoring();
      updateState({ 
        isMonitoring: true, 
        error: null 
      });
    } catch (error) {
      updateState({ 
        error: `Failed to start monitoring: ${error}` 
      });
    }
  }, [updateState]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    try {
      cacheAnalyticsManager.stopMonitoring();
      updateState({ 
        isMonitoring: false 
      });
    } catch (error) {
      updateState({ 
        error: `Failed to stop monitoring: ${error}` 
      });
    }
  }, [updateState]);

  /**
   * Refresh metrics
   */
  const refreshMetrics = useCallback(async () => {
    try {
      await cacheAnalyticsManager.collectMetrics();
      const metrics = cacheAnalyticsManager.getCurrentMetrics();
      
      updateState({ 
        currentMetrics: metrics,
        lastUpdated: Date.now(),
        error: null
      });

      if (metrics && optionsRef.current.onMetricsUpdate) {
        optionsRef.current.onMetricsUpdate(metrics);
      }
    } catch (error) {
      updateState({ 
        error: `Failed to refresh metrics: ${error}` 
      });
    }
  }, [updateState]);

  /**
   * Generate full report
   */
  const generateReport = useCallback(async () => {
    try {
      const report = await cacheAnalyticsManager.generateReport();
      
      updateState({ 
        report,
        recommendations: report.recommendations,
        alerts: report.alerts,
        trends: report.trends,
        lastUpdated: Date.now(),
        error: null
      });

      // Trigger callbacks
      report.alerts.forEach(alert => {
        if (optionsRef.current.onAlert) {
          optionsRef.current.onAlert(alert);
        }
      });

      report.recommendations.forEach(recommendation => {
        if (optionsRef.current.onRecommendation) {
          optionsRef.current.onRecommendation(recommendation);
        }
      });

      return report;
    } catch (error) {
      updateState({ 
        error: `Failed to generate report: ${error}` 
      });
      return null;
    }
  }, [updateState]);

  /**
   * Get recommendations only
   */
  const getRecommendations = useCallback(() => {
    try {
      const recommendations = cacheAnalyticsManager.generateRecommendations();
      updateState({ 
        recommendations,
        error: null
      });
      return recommendations;
    } catch (error) {
      updateState({ 
        error: `Failed to get recommendations: ${error}` 
      });
      return [];
    }
  }, [updateState]);

  /**
   * Get recent alerts
   */
  const getRecentAlerts = useCallback((limit: number = 10) => {
    try {
      const alerts = cacheAnalyticsManager.getRecentAlerts(limit);
      updateState({ 
        alerts,
        error: null
      });
      return alerts;
    } catch (error) {
      updateState({ 
        error: `Failed to get alerts: ${error}` 
      });
      return [];
    }
  }, [updateState]);

  /**
   * Get metric history
   */
  const getMetricHistory = useCallback((metric: string, limit: number = 100) => {
    try {
      return cacheAnalyticsManager.getMetricHistory(metric, limit);
    } catch (error) {
      updateState({ 
        error: `Failed to get metric history: ${error}` 
      });
      return [];
    }
  }, [updateState]);

  /**
   * Clear analytics data
   */
  const clearData = useCallback(() => {
    try {
      cacheAnalyticsManager.clearData();
      updateState({
        currentMetrics: null,
        report: null,
        recommendations: [],
        alerts: [],
        trends: [],
        lastUpdated: Date.now(),
        error: null
      });
    } catch (error) {
      updateState({ 
        error: `Failed to clear data: ${error}` 
      });
    }
  }, [updateState]);

  /**
   * Export analytics data
   */
  const exportData = useCallback(() => {
    try {
      return cacheAnalyticsManager.exportData();
    } catch (error) {
      updateState({ 
        error: `Failed to export data: ${error}` 
      });
      return null;
    }
  }, [updateState]);

  /**
   * Import analytics data
   */
  const importData = useCallback((data: string) => {
    try {
      const success = cacheAnalyticsManager.importData(data);
      if (success) {
        updateState({ 
          lastUpdated: Date.now(),
          error: null
        });
        refreshMetrics(); // Refresh after import
      }
      return success;
    } catch (error) {
      updateState({ 
        error: `Failed to import data: ${error}` 
      });
      return false;
    }
  }, [updateState, refreshMetrics]);

  // Auto-start monitoring if enabled
  useEffect(() => {
    if (options.autoStart !== false) {
      startMonitoring();
    }

    return () => {
      if (options.autoStart !== false) {
        stopMonitoring();
      }
    };
  }, [startMonitoring, stopMonitoring, options.autoStart]);

  // Periodic metrics refresh
  useEffect(() => {
    if (!state.isMonitoring) return;

    const interval = setInterval(() => {
      refreshMetrics();
    }, options.monitoringInterval || 30000); // Default 30 seconds

    return () => clearInterval(interval);
  }, [state.isMonitoring, refreshMetrics, options.monitoringInterval]);

  return {
    // State
    ...state,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    refreshMetrics,
    generateReport,
    getRecommendations,
    getRecentAlerts,
    getMetricHistory,
    clearData,
    exportData,
    importData
  };
}

/**
 * Hook for real-time cache performance monitoring
 */
export function useCachePerformanceMonitor() {
  const [performanceData, setPerformanceData] = useState<{
    hitRate: number[];
    storageUsage: number[];
    responseTime: number[];
    timestamps: number[];
  }>({
    hitRate: [],
    storageUsage: [],
    responseTime: [],
    timestamps: []
  });

  const { refreshMetrics, currentMetrics } = useCacheAnalytics({
    enableRealTimeMonitoring: true,
    monitoringInterval: 10000, // 10 seconds
    onMetricsUpdate: (metrics) => {
      setPerformanceData(prev => ({
        hitRate: [...prev.hitRate.slice(-19), metrics.hitRate], // Keep last 20
        storageUsage: [...prev.storageUsage.slice(-19), metrics.totalSize],
        responseTime: [...prev.responseTime.slice(-19), metrics.averageResponseTime],
        timestamps: [...prev.timestamps.slice(-19), Date.now()]
      }));
    }
  });

  const getAverageHitRate = useCallback(() => {
    if (performanceData.hitRate.length === 0) return 0;
    return performanceData.hitRate.reduce((sum, rate) => sum + rate, 0) / performanceData.hitRate.length;
  }, [performanceData.hitRate]);

  const getAverageResponseTime = useCallback(() => {
    if (performanceData.responseTime.length === 0) return 0;
    return performanceData.responseTime.reduce((sum, time) => sum + time, 0) / performanceData.responseTime.length;
  }, [performanceData.responseTime]);

  const getTrendDirection = useCallback((data: number[]) => {
    if (data.length < 2) return 'stable';
    const recent = data.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
    const older = data.slice(-10, -5).reduce((sum, val) => sum + val, 0) / 5;
    
    if (recent > older * 1.05) return 'improving';
    if (recent < older * 0.95) return 'declining';
    return 'stable';
  }, []);

  return {
    performanceData,
    currentMetrics,
    getAverageHitRate,
    getAverageResponseTime,
    getTrendDirection,
    refreshMetrics,
    hitRateTrend: getTrendDirection(performanceData.hitRate),
    responseTimeTrend: getTrendDirection(performanceData.responseTime)
  };
}

/**
 * Hook for cache alerts and notifications
 */
export function useCacheAlerts() {
  const [alerts, setAlerts] = useState<CacheAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { getRecentAlerts, generateReport } = useCacheAnalytics({
    onAlert: (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50
      setUnreadCount(prev => prev + 1);
    }
  });

  const markAsRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.timestamp.toString() === alertId 
        ? { ...alert, resolved: true }
        : alert
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, resolved: true })));
    setUnreadCount(0);
  }, []);

  const clearResolved = useCallback(() => {
    setAlerts(prev => prev.filter(alert => !alert.resolved));
  }, []);

  const getUnreadAlerts = useCallback(() => {
    return alerts.filter(alert => !alert.resolved);
  }, [alerts]);

  const getAlertsBySeverity = useCallback((severity: 'low' | 'medium' | 'high') => {
    return alerts.filter(alert => alert.severity === severity);
  }, [alerts]);

  return {
    alerts,
    unreadCount,
    getRecentAlerts,
    markAsRead,
    markAllAsRead,
    clearResolved,
    getUnreadAlerts,
    getAlertsBySeverity,
    refreshAlerts: () => getRecentAlerts()
  };
}

/**
 * Hook for cache recommendations
 */
export function useCacheRecommendations() {
  const [recommendations, setRecommendations] = useState<CacheRecommendation[]>([]);
  const [implementedRecommendations, setImplementedRecommendations] = useState<Set<string>>(new Set());

  const { getRecommendations: fetchRecommendations } = useCacheAnalytics();

  const refreshRecommendations = useCallback(() => {
    const recs = fetchRecommendations();
    setRecommendations(recs);
  }, [fetchRecommendations]);

  const markAsImplemented = useCallback((recommendationId: string) => {
    setImplementedRecommendations(prev => new Set([...prev, recommendationId]));
  }, []);

  const getRecommendationsByPriority = useCallback((priority: 'low' | 'medium' | 'high' | 'critical') => {
    return recommendations.filter(rec => rec.priority === priority);
  }, [recommendations]);

  const getRecommendationsByType = useCallback((type: 'performance' | 'storage' | 'cleanup' | 'optimization') => {
    return recommendations.filter(rec => rec.type === type);
  }, [recommendations]);

  const getUnimplementedRecommendations = useCallback(() => {
    return recommendations.filter(rec => !implementedRecommendations.has(`${rec.type}-${rec.title}`));
  }, [recommendations, implementedRecommendations]);

  useEffect(() => {
    refreshRecommendations();
  }, [refreshRecommendations]);

  return {
    recommendations,
    implementedRecommendations,
    refreshRecommendations,
    markAsImplemented,
    getRecommendationsByPriority,
    getRecommendationsByType,
    getUnimplementedRecommendations
  };
}