/**
 * Predictive Cache Preloading System
 * 
 * Intelligently preloads content based on user behavior predictions
 */

'use client';

import { userBehaviorAnalyzer, type BehaviorMetrics } from './user-behavior-analyzer';

export interface CacheWarmingTask {
  id: string;
  resource: string;
  priority: number;
  reason: string;
  confidence: number;
  estimatedBenefit: number;
  status: 'pending' | 'loading' | 'completed' | 'failed' | 'skipped';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  metadata?: {
    size?: number;
    type?: string;
    ttl?: number;
    preloadStrategy?: string;
    loadTime?: number;
  };
}

export interface CacheWarmingConfig {
  maxConcurrentTasks: number;
  maxQueueSize: number;
  minConfidenceThreshold: number;
  maxPreloadSize: number; // in bytes
  enableBackgroundPreloading: boolean;
  enableNetworkAwarePreloading: boolean;
  preloadStrategies: Array<'fetch' | 'prefetch' | 'preconnect' | 'dns-prefetch'>;
  blacklistPatterns: string[];
  whitelistPatterns: string[];
  retryAttempts: number;
  retryDelay: number; // in ms
}

export interface CacheWarmingMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  averageLoadTime: number;
  totalDataLoaded: number;
  cacheHitRate: number;
  networkSavings: number;
  activeTasks: number;
  queuedTasks: number;
  lastWarmingCycle: number;
  warmingEfficiency: number;
}

export class PredictiveCacheWarmer {
  private config: CacheWarmingConfig;
  private taskQueue: CacheWarmingTask[] = [];
  private activeTasks: Map<string, CacheWarmingTask> = new Map();
  private completedTasks: CacheWarmingTask[] = [];
  private metrics: CacheWarmingMetrics;
  private isRunning: boolean = false;
  private warmingInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(event: string, data: any) => void> = [];

  constructor(config: Partial<CacheWarmingConfig> = {}) {
    this.config = {
      maxConcurrentTasks: 3,
      maxQueueSize: 50,
      minConfidenceThreshold: 0.7,
      maxPreloadSize: 5 * 1024 * 1024, // 5MB
      enableBackgroundPreloading: true,
      enableNetworkAwarePreloading: true,
      preloadStrategies: ['fetch', 'prefetch'],
      blacklistPatterns: ['*.pdf', '*.zip', '*.exe'],
      whitelistPatterns: ['*.json', '*.js', '*.css', '*.png', '*.jpg', '*.svg'],
      retryAttempts: 2,
      retryDelay: 1000,
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.loadPersistedData();
    this.startWarmingCycle();
  }

  /**
   * Start the cache warming system
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.emit('warming-started', { timestamp: Date.now() });
    this.processQueue();
  }

  /**
   * Stop the cache warming system
   */
  stop(): void {
    this.isRunning = false;
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
    
    // Cancel active tasks
    this.activeTasks.forEach(task => {
      task.status = 'skipped';
      task.error = 'Warming system stopped';
    });
    this.activeTasks.clear();

    this.emit('warming-stopped', { timestamp: Date.now() });
  }

  /**
   * Add cache warming task
   */
  addWarmingTask(
    resource: string,
    priority: number,
    reason: string,
    confidence: number,
    metadata?: CacheWarmingTask['metadata']
  ): string {
    const taskId = this.generateTaskId();

    // Validate resource
    if (!this.isValidResource(resource)) {
      console.warn(`Invalid resource for warming: ${resource}`);
      return taskId;
    }

    // Check confidence threshold
    if (confidence < this.config.minConfidenceThreshold) {
      console.warn(`Confidence too low for resource: ${resource} (${confidence})`);
      return taskId;
    }

    const task: CacheWarmingTask = {
      id: taskId,
      resource,
      priority,
      reason,
      confidence,
      estimatedBenefit: priority * confidence,
      status: 'pending',
      createdAt: Date.now(),
      metadata
    };

    this.taskQueue.push(task);
    this.sortTaskQueue();

    // Maintain queue size
    if (this.taskQueue.length > this.config.maxQueueSize) {
      this.taskQueue = this.taskQueue.slice(-this.config.maxQueueSize);
    }

    this.emit('task-added', task);
    this.persistData();

    return taskId;
  }

  /**
   * Add warming tasks from behavior analysis
   */
  addWarmingTasksFromBehavior(userId?: string): number {
    const recommendations = userBehaviorAnalyzer.getCacheWarmingRecommendations(userId);
    let addedCount = 0;

    recommendations.forEach(rec => {
      this.addWarmingTask(
        rec.resource,
        rec.priority,
        rec.reason,
        rec.confidence,
        {
          preloadStrategy: this.selectOptimalStrategy(rec.resource),
          type: this.getResourceType(rec.resource)
        }
      );
      addedCount++;
    });

    this.emit('behavior-tasks-added', { count: addedCount, userId });
    return addedCount;
  }

  /**
   * Get cache warming metrics
   */
  getMetrics(): CacheWarmingMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get task queue status
   */
  getQueueStatus(): {
    pending: CacheWarmingTask[];
    active: CacheWarmingTask[];
    completed: CacheWarmingTask[];
    failed: CacheWarmingTask[];
  } {
    return {
      pending: this.taskQueue.filter(t => t.status === 'pending'),
      active: Array.from(this.activeTasks.values()),
      completed: this.completedTasks.filter(t => t.status === 'completed'),
      failed: this.completedTasks.filter(t => t.status === 'failed')
    };
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning && this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
      const task = this.taskQueue.shift();
      if (!task) break;

      if (task.status !== 'pending') continue;

      this.activeTasks.set(task.id, task);
      this.executeTask(task);
    }

    // Schedule next processing
    if (this.isRunning) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  /**
   * Execute a cache warming task
   */
  private async executeTask(task: CacheWarmingTask): Promise<void> {
    task.status = 'loading';
    task.startedAt = Date.now();
    
    this.emit('task-started', task);

    try {
      const strategy = task.metadata?.preloadStrategy || this.selectOptimalStrategy(task.resource);
      await this.performPreload(task, strategy);
      
      task.status = 'completed';
      task.completedAt = Date.now();
      
      this.metrics.completedTasks++;
      this.metrics.totalDataLoaded += task.metadata?.size || 0;
      
      this.emit('task-completed', task);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completedAt = Date.now();
      
      this.metrics.failedTasks++;
      
      this.emit('task-failed', task);
      
      // Retry logic
      if (this.shouldRetryTask(task)) {
        this.scheduleRetry(task);
      }
    } finally {
      this.activeTasks.delete(task.id);
      this.completedTasks.push(task);
      
      // Maintain completed tasks history
      if (this.completedTasks.length > 1000) {
        this.completedTasks = this.completedTasks.slice(-1000);
      }
      
      this.persistData();
    }
  }

  /**
   * Perform the actual preload based on strategy
   */
  private async performPreload(task: CacheWarmingTask, strategy: string): Promise<void> {
    const startTime = Date.now();

    switch (strategy) {
      case 'fetch':
        await this.performFetchPreload(task);
        break;
      case 'prefetch':
        await this.performPrefetchPreload(task);
        break;
      case 'preconnect':
        await this.performPreconnectPreload(task);
        break;
      case 'dns-prefetch':
        await this.performDnsPrefetchPreload(task);
        break;
      default:
        throw new Error(`Unknown preload strategy: ${strategy}`);
    }

    const loadTime = Date.now() - startTime;
    task.metadata = { ...task.metadata, loadTime };
    
    // Update average load time
    this.metrics.averageLoadTime = 
      (this.metrics.averageLoadTime + loadTime) / 2;
  }

  /**
   * Fetch-based preload
   */
  private async performFetchPreload(task: CacheWarmingTask): Promise<void> {
    const response = await fetch(task.resource, {
      method: 'GET',
      cache: 'force-cache',
      headers: {
        'Purpose': 'prefetch',
        'X-PWA-Cache-Warming': 'true'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get content size
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      task.metadata = { ...task.metadata, size: parseInt(contentLength) };
    }

    // Consume the response to ensure it's cached
    await response.blob();
  }

  /**
   * Prefetch-based preload
   */
  private async performPrefetchPreload(task: CacheWarmingTask): Promise<void> {
    if (typeof document === 'undefined') {
      throw new Error('Prefetch not available in server environment');
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = task.resource;
      link.as = this.getResourceAs(task.resource);
      
      link.onload = () => {
        document.head.removeChild(link);
        resolve();
      };
      
      link.onerror = () => {
        document.head.removeChild(link);
        reject(new Error('Prefetch failed'));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Preconnect-based preload
   */
  private async performPreconnectPreload(task: CacheWarmingTask): Promise<void> {
    if (typeof document === 'undefined') {
      throw new Error('Preconnect not available in server environment');
    }

    const url = new URL(task.resource, window.location.origin);
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url.origin;
      
      link.onload = () => {
        document.head.removeChild(link);
        resolve();
      };
      
      link.onerror = () => {
        document.head.removeChild(link);
        reject(new Error('Preconnect failed'));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * DNS prefetch-based preload
   */
  private async performDnsPrefetchPreload(task: CacheWarmingTask): Promise<void> {
    if (typeof document === 'undefined') {
      throw new Error('DNS prefetch not available in server environment');
    }

    const url = new URL(task.resource, window.location.origin);
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = url.origin;
      
      link.onload = () => {
        document.head.removeChild(link);
        resolve();
      };
      
      link.onerror = () => {
        document.head.removeChild(link);
        reject(new Error('DNS prefetch failed'));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Select optimal preload strategy for resource
   */
  private selectOptimalStrategy(resource: string): string {
    const resourceType = this.getResourceType(resource);
    
    switch (resourceType) {
      case 'json':
      case 'js':
      case 'css':
        return 'fetch';
      case 'image':
        return 'prefetch';
      case 'font':
        return 'prefetch';
      default:
        return 'fetch';
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(resource: string): string {
    const extension = resource.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'json':
        return 'json';
      case 'js':
        return 'js';
      case 'css':
        return 'css';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
        return 'font';
      default:
        return 'unknown';
    }
  }

  /**
   * Get resource "as" attribute for prefetch
   */
  private getResourceAs(resource: string): string {
    const type = this.getResourceType(resource);
    
    switch (type) {
      case 'js':
        return 'script';
      case 'css':
        return 'style';
      case 'image':
        return 'image';
      case 'font':
        return 'font';
      default:
        return 'fetch';
    }
  }

  /**
   * Validate resource for warming
   */
  private isValidResource(resource: string): boolean {
    try {
      new URL(resource, window.location.origin);
    } catch {
      return false;
    }

    // Check blacklist
    for (const pattern of this.config.blacklistPatterns) {
      if (this.matchPattern(resource, pattern)) {
        return false;
      }
    }

    // Check whitelist (if specified)
    if (this.config.whitelistPatterns.length > 0) {
      for (const pattern of this.config.whitelistPatterns) {
        if (this.matchPattern(resource, pattern)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Simple pattern matching
   */
  private matchPattern(resource: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(resource);
  }

  /**
   * Sort task queue by priority and confidence
   */
  private sortTaskQueue(): void {
    this.taskQueue.sort((a, b) => {
      const scoreA = a.priority * a.confidence;
      const scoreB = b.priority * b.confidence;
      return scoreB - scoreA;
    });
  }

  /**
   * Check if task should be retried
   */
  private shouldRetryTask(task: CacheWarmingTask): boolean {
    // Don't retry if confidence is too low
    if (task.confidence < 0.8) return false;
    
    // Don't retry if already retried too many times
    const retryCount = this.getTaskRetryCount(task);
    return retryCount < this.config.retryAttempts;
  }

  /**
   * Get task retry count
   */
  private getTaskRetryCount(task: CacheWarmingTask): number {
    return this.completedTasks.filter(t => 
      t.resource === task.resource && t.status === 'failed'
    ).length;
  }

  /**
   * Schedule task retry
   */
  private scheduleRetry(task: CacheWarmingTask): void {
    setTimeout(() => {
      const retryTask = {
        ...task,
        id: this.generateTaskId(),
        status: 'pending' as const,
        createdAt: Date.now(),
        startedAt: undefined,
        completedAt: undefined,
        error: undefined
      };

      this.taskQueue.push(retryTask);
      this.emit('task-retry-scheduled', retryTask);
    }, this.config.retryDelay);
  }

  /**
   * Start automatic warming cycle
   */
  private startWarmingCycle(): void {
    if (!this.config.enableBackgroundPreloading) return;

    this.warmingInterval = setInterval(() => {
      this.performAutomaticWarming();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Perform automatic warming based on behavior
   */
  private performAutomaticWarming(): void {
    if (!this.isRunning) return;

    const addedCount = this.addWarmingTasksFromBehavior();
    this.metrics.lastWarmingCycle = Date.now();

    this.emit('automatic-warming', { 
      tasksAdded: addedCount,
      timestamp: Date.now()
    });
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): CacheWarmingMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      skippedTasks: 0,
      averageLoadTime: 0,
      totalDataLoaded: 0,
      cacheHitRate: 0,
      networkSavings: 0,
      activeTasks: 0,
      queuedTasks: 0,
      lastWarmingCycle: 0,
      warmingEfficiency: 0
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.totalTasks = this.taskQueue.length + this.activeTasks.size + this.completedTasks.length;
    this.metrics.activeTasks = this.activeTasks.size;
    this.metrics.queuedTasks = this.taskQueue.length;
    
    // Calculate efficiency
    if (this.metrics.totalTasks > 0) {
      this.metrics.warmingEfficiency = (this.metrics.completedTasks / this.metrics.totalTasks) * 100;
    }

    // Calculate cache hit rate (simplified)
    this.metrics.cacheHitRate = this.calculateCacheHitRate();
    
    // Calculate network savings (simplified)
    this.metrics.networkSavings = this.metrics.totalDataLoaded * 0.8; // Assume 80% would be re-downloaded
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // This is a simplified implementation
    // In practice, you'd track actual cache hits vs misses
    return this.metrics.completedTasks > 0 ? 
      Math.min((this.metrics.completedTasks / (this.metrics.completedTasks + this.metrics.failedTasks)) * 100, 100) : 0;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `warming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event handling
   */
  on(event: string, listener: (event: string, data: any) => void): void {
    this.listeners.push(listener);
  }

  off(event: string, listener: (event: string, data: any) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Cache warmer event listener error:', error);
      }
    });
  }

  /**
   * Data persistence
   */
  private persistData(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        taskQueue: this.taskQueue.slice(-100),
        completedTasks: this.completedTasks.slice(-500),
        metrics: this.metrics,
        config: this.config
      };
      localStorage.setItem('cache-warming-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist cache warming data:', error);
    }
  }

  private loadPersistedData(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('cache-warming-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.taskQueue = data.taskQueue || [];
        this.completedTasks = data.completedTasks || [];
        this.metrics = { ...this.metrics, ...data.metrics };
      }
    } catch (error) {
      console.warn('Failed to load persisted cache warming data:', error);
    }
  }

  /**
   * Clear all warming data
   */
  clearData(): void {
    this.taskQueue = [];
    this.activeTasks.clear();
    this.completedTasks = [];
    this.metrics = this.initializeMetrics();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cache-warming-data');
    }

    this.emit('data-cleared', {});
  }

  /**
   * Get warming statistics
   */
  getStatistics(): {
    uptime: number;
    totalProcessed: number;
    successRate: number;
    averageTaskDuration: number;
    memoryUsage: number;
  } {
    const successfulTasks = this.completedTasks.filter(t => t.status === 'completed');
    const averageDuration = successfulTasks.length > 0 
      ? successfulTasks.reduce((sum, task) => 
          sum + ((task.completedAt || 0) - (task.startedAt || 0)), 0) / successfulTasks.length
      : 0;

    return {
      uptime: this.isRunning ? Date.now() - (this.metrics.lastWarmingCycle || Date.now()) : 0,
      totalProcessed: this.completedTasks.length,
      successRate: this.metrics.totalTasks > 0 ? (this.metrics.completedTasks / this.metrics.totalTasks) * 100 : 0,
      averageTaskDuration: averageDuration,
      memoryUsage: JSON.stringify(this.taskQueue).length + 
                   JSON.stringify(this.completedTasks).length
    };
  }
}

// Global instance
export const predictiveCacheWarmer = new PredictiveCacheWarmer();