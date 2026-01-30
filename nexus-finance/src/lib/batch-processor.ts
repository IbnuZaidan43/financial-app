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

  private initializeDefaultStrategies(): void {
    this.strategies.set('financial', {
      name: 'Financial Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'financial');
      },
      shouldRetry: (request, error) => {
        return request.retryCount < 3;
      },
      getDelay: (request) => {
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

    this.strategies.set('user', {
      name: 'User Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'user') && requests.length <= 5;
      },
      shouldRetry: (request, error) => {
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

    this.strategies.set('cache', {
      name: 'Cache Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'cache') && requests.length <= 20;
      },
      shouldRetry: (request, error) => {
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

    this.strategies.set('analytics', {
      name: 'Analytics Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'analytics');
      },
      shouldRetry: (request, error) => {
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

  async processBatch(requests: QueuedRequest[]): Promise<BatchResult> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    const strategy = this.findStrategy(requests);
    if (!strategy) {
      throw new Error('No suitable strategy found for batch');
    }

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
      const transformedRequests = requests.map(req => 
        strategy.transformRequest ? strategy.transformRequest(req) : req
      );

      const results = await this.processRequestsWithConcurrency(
        transformedRequests,
        strategy,
        progress
      );

      const processingTime = Date.now() - startTime;
      const success = results.every(req => req.status === 'completed');

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

  private async processRequestsWithConcurrency(
    requests: QueuedRequest[],
    strategy: BatchStrategy,
    progress: BatchProgress
  ): Promise<QueuedRequest[]> {
    const results: QueuedRequest[] = [];
    const concurrency = Math.min(this.config.maxConcurrentBatches, requests.length);
    
    const batches: QueuedRequest[][] = [];
    for (let i = 0; i < requests.length; i += concurrency) {
      batches.push(requests.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (request) => {
        return this.processRequest(request, strategy);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            ...batch[batchResults.indexOf(result)],
            status: 'failed',
            lastError: result.reason?.message || 'Unknown error'
          });
        }
      });

      progress.processedRequests = results.length;
      progress.successfulRequests = results.filter(req => req.status === 'completed').length;
      progress.failedRequests = results.filter(req => req.status === 'failed').length;
      this.config.progressCallback?.(progress);

      if (progress.failedRequests > progress.successfulRequests * 2) {
        console.warn('High failure rate, stopping batch processing');
        break;
      }
    }

    return results;
  }

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
      
      if (strategy.shouldRetry(request, errorObj)) {
        const delay = strategy.getDelay(request);
        
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

  private findStrategy(requests: QueuedRequest[]): BatchStrategy | null {
    for (const [name, strategy] of this.strategies) {
      if (name !== 'general' && strategy.canProcess(requests)) {
        return strategy;
      }
    }

    return this.strategies.get('general') || null;
  }

  addStrategy(name: string, strategy: BatchStrategy): void {
    this.strategies.set(name, strategy);
  }

  removeStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  getStrategies(): BatchStrategy[] {
    return Array.from(this.strategies.values());
  }

  getActiveBatches(): BatchProgress[] {
    return Array.from(this.activeBatches.values());
  }

  cancelBatch(batchId: string): boolean {
    return this.activeBatches.delete(batchId);
  }

  async processRetryQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      return;
    }

    const retryRequests = this.processingQueue.splice(0);
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

    for (const [strategy, requests] of strategyGroups) {
      try {
        await this.processBatch(requests);
      } catch (error) {
        console.error(`Failed to process retry batch for ${strategy.name}:`, error);
      }
    }
  }

  getRetryQueueStatus(): {
    size: number;
    requests: QueuedRequest[];
  } {
    return {
      size: this.processingQueue.length,
      requests: [...this.processingQueue]
    };
  }

  clearRetryQueue(): void {
    this.processingQueue = [];
  }

  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  private generateBatchId(): string {
    return `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy(): void {
    this.activeBatches.clear();
    this.processingQueue = [];
    this.strategies.clear();
  }
}

export const batchProcessor = new BatchProcessor();