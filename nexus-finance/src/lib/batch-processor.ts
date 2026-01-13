/**
 * Batch Processor
 * 
 * Advanced batch processing logic for offline queue requests.
 */

'use client';

import { QueuedRequest } from './offline-queue';

export interface BatchConfig {
  maxConcurrentBatches: number;
  batchTimeout: number;
  retryDelay: number;
  progressCallback?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  batchId: string;
  totalRequests: number;
  processedRequests: number;
  successfulRequests: number;
  failedRequests: number;
  startTime: number;
  estimatedCompletion?: number;
}

export interface BatchResult {
  batchId: string;
  requests: QueuedRequest[];
  success: boolean;
  processingTime: number;
  errors: string[];
}

export interface BatchStrategy {
  name: string;
  canProcess: (requests: QueuedRequest[]) => boolean;
  shouldRetry: (request: QueuedRequest, error: Error) => boolean;
  getDelay: (request: QueuedRequest) => number;
  transformRequest?: (request: QueuedRequest) => QueuedRequest;
}

export class BatchProcessor {
  private config: BatchConfig;
  private strategies: Map<string, BatchStrategy> = new Map();
  private activeBatches: Map<string, BatchProgress> = new Map();
  private processingQueue: QueuedRequest[] = [];

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxConcurrentBatches: 3,
      batchTimeout: 30000,
      retryDelay: 2000,
      ...config
    };

    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default batch strategies
   */
  private initializeDefaultStrategies(): void {
    // Financial data strategy - immediate processing, no batching
    this.strategies.set('financial', {
      name: 'Financial Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'financial');
      },
      shouldRetry: (request, error) => {
        // Always retry financial data
        return request.retryCount < 3;
      },
      getDelay: (request) => {
        // Exponential backoff for financial data
        return 1000 * Math.pow(2, request.retryCount);
      },
      transformRequest: (request) => ({
        ...request,
        headers: {
          ...request.headers,
          'X-Priority': 'critical',
          'X-Resource-Type': 'financial'
        }
      })
    });

    // User data strategy - small batches, moderate delay
    this.strategies.set('user', {
      name: 'User Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'user') && requests.length <= 5;
      },
      shouldRetry: (request, error) => {
        // Retry network errors and server errors
        return request.retryCount < 2 && (
          error.message.includes('network') || 
          error.message.includes('timeout') ||
          (error as any).status >= 500
        );
      },
      getDelay: (request) => {
        return 2000 + (request.retryCount * 1000);
      },
      transformRequest: (request) => ({
        ...request,
        headers: {
          ...request.headers,
          'X-Priority': 'high',
          'X-Resource-Type': 'user'
        }
      })
    });

    // Cache data strategy - larger batches, longer delay
    this.strategies.set('cache', {
      name: 'Cache Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'cache') && requests.length <= 20;
      },
      shouldRetry: (request, error) => {
        // Only retry on network errors
        return request.retryCount < 1 && error.message.includes('network');
      },
      getDelay: (request) => {
        return 5000;
      },
      transformRequest: (request) => ({
        ...request,
        headers: {
          ...request.headers,
          'X-Priority': 'medium',
          'X-Resource-Type': 'cache'
        }
      })
    });

    // Analytics data strategy - large batches, low priority
    this.strategies.set('analytics', {
      name: 'Analytics Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'analytics');
      },
      shouldRetry: (request, error) => {
        // Don't retry analytics data to avoid flooding
        return false;
      },
      getDelay: (request) => {
        return 10000;
      },
      transformRequest: (request) => ({
        ...request,
        headers: {
          ...request.headers,
          'X-Priority': 'low',
          'X-Resource-Type': 'analytics'
        }
      })
    });

    // General API strategy - fallback for all other requests
    this.strategies.set('general', {
      name: 'General API',
      canProcess: () => true,
      shouldRetry: (request, error) => {
        return request.retryCount < 2;
      },
      getDelay: (request) => {
        return 3000 * (request.retryCount + 1);
      }
    });
  }

  /**
   * Process a batch of requests
   */
  async processBatch(requests: QueuedRequest[]): Promise<BatchResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    // Find appropriate strategy
    const strategy = this.findStrategy(requests);
    if (!strategy) {
      throw new Error('No suitable strategy found for batch');
    }

    // Initialize batch progress
    const progress: BatchProgress = {
      batchId,
      totalRequests: requests.length,
      processedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      startTime
    };

    this.activeBatches.set(batchId, progress);
    this.config.progressCallback?.(progress);

    try {
      // Transform requests if strategy provides transformation
      const transformedRequests = requests.map(req => 
        strategy.transformRequest ? strategy.transformRequest(req) : req
      );

      // Process requests in parallel with concurrency limit
      const results = await this.processRequestsWithConcurrency(
        transformedRequests,
        strategy,
        progress
      );

      const processingTime = Date.now() - startTime;
      const success = results.every(req => req.status === 'completed');

      // Update final progress
      progress.processedRequests = results.length;
      progress.successfulRequests = results.filter(req => req.status === 'completed').length;
      progress.failedRequests = results.filter(req => req.status === 'failed').length;
      this.config.progressCallback?.(progress);

      this.activeBatches.delete(batchId);

      return {
        batchId,
        requests: results,
        success,
        processingTime,
        errors: results
          .filter(req => req.status === 'failed')
          .map(req => req.lastError || 'Unknown error')
      };

    } catch (error) {
      this.activeBatches.delete(batchId);
      throw error;
    }
  }

  /**
   * Process requests with concurrency control
   */
  private async processRequestsWithConcurrency(
    requests: QueuedRequest[],
    strategy: BatchStrategy,
    progress: BatchProgress
  ): Promise<QueuedRequest[]> {
    const results: QueuedRequest[] = [];
    const concurrency = Math.min(this.config.maxConcurrentBatches, requests.length);
    
    // Create batches based on concurrency
    const batches: QueuedRequest[][] = [];
    for (let i = 0; i < requests.length; i += concurrency) {
      batches.push(requests.slice(i, i + concurrency));
    }

    // Process each batch sequentially
    for (const batch of batches) {
      const batchPromises = batch.map(async (request) => {
        return this.processRequest(request, strategy);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract successful results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create failed request object
          results.push({
            ...batch[batchResults.indexOf(result)],
            status: 'failed',
            lastError: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Update progress
      progress.processedRequests = results.length;
      progress.successfulRequests = results.filter(req => req.status === 'completed').length;
      progress.failedRequests = results.filter(req => req.status === 'failed').length;
      this.config.progressCallback?.(progress);

      // Check if we should continue
      if (progress.failedRequests > progress.successfulRequests * 2) {
        console.warn('High failure rate, stopping batch processing');
        break;
      }
    }

    return results;
  }

  /**
   * Process individual request
   */
  private async processRequest(request: QueuedRequest, strategy: BatchStrategy): Promise<QueuedRequest> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.batchTimeout);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          ...request,
          status: 'completed'
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      
      // Check if we should retry
      if (strategy.shouldRetry(request, errorObj)) {
        const delay = strategy.getDelay(request);
        
        // Schedule retry
        setTimeout(() => {
          request.retryCount++;
          this.processingQueue.push(request);
        }, delay);

        return {
          ...request,
          status: 'failed',
          lastError: errorObj.message,
          retryCount: request.retryCount + 1
        };
      }

      return {
        ...request,
        status: 'failed',
        lastError: errorObj.message
      };
    }
  }

  /**
   * Find appropriate strategy for requests
   */
  private findStrategy(requests: QueuedRequest[]): BatchStrategy | null {
    // Try specific strategies first
    for (const [name, strategy] of this.strategies) {
      if (name !== 'general' && strategy.canProcess(requests)) {
        return strategy;
      }
    }

    // Fall back to general strategy
    return this.strategies.get('general') || null;
  }

  /**
   * Add custom strategy
   */
  addStrategy(name: string, strategy: BatchStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Remove strategy
   */
  removeStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  /**
   * Get all strategies
   */
  getStrategies(): BatchStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get active batches
   */
  getActiveBatches(): BatchProgress[] {
    return Array.from(this.activeBatches.values());
  }

  /**
   * Cancel batch
   */
  cancelBatch(batchId: string): boolean {
    return this.activeBatches.delete(batchId);
  }

  /**
   * Process retry queue
   */
  async processRetryQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      return;
    }

    const retryRequests = this.processingQueue.splice(0);
    
    // Group by strategy
    const strategyGroups = new Map<BatchStrategy, QueuedRequest[]>();
    
    for (const request of retryRequests) {
      const strategy = this.findStrategy([request]);
      if (strategy) {
        if (!strategyGroups.has(strategy)) {
          strategyGroups.set(strategy, []);
        }
        strategyGroups.get(strategy)!.push(request);
      }
    }

    // Process each group
    for (const [strategy, requests] of strategyGroups) {
      try {
        await this.processBatch(requests);
      } catch (error) {
        console.error(`Failed to process retry batch for ${strategy.name}:`, error);
      }
    }
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): {
    size: number;
    requests: QueuedRequest[];
  } {
    return {
      size: this.processingQueue.length,
      requests: [...this.processingQueue]
    };
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(): void {
    this.processingQueue = [];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Utility methods
   */
  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.activeBatches.clear();
    this.processingQueue = [];
    this.strategies.clear();
  }
}

// Global instance
export const batchProcessor = new BatchProcessor();