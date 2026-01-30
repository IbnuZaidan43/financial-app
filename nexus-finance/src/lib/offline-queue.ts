'use client';

export interface QueuedRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  lastError?: string;
  metadata?: {
    resource?: string;
    operation?: string;
    userId?: string;
    tags?: string[];
  };
}

export interface QueueConfig {
  maxQueueSize: number;
  batchSize: number;
  batchTimeout: number;
  retryDelay: number;
  maxRetries: number;
  priorityProcessing: boolean;
  persistQueue: boolean;
  autoProcessOnOnline: boolean;
}

export interface QueueMetrics {
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  queueSize: number;
  successRate: number;
  lastProcessed: number | null;
}

export interface BatchProcessor {
  name: string;
  canProcess: (requests: QueuedRequest[]) => boolean;
  process: (requests: QueuedRequest[]) => Promise<QueuedRequest[]>;
  batchSize: number;
  priority: number;
}

export class OfflineQueueManager {
  private config: QueueConfig;
  private queue: QueuedRequest[] = [];
  private processing: Set<string> = new Set();
  private batchProcessors: BatchProcessor[] = [];
  private metrics: QueueMetrics;
  private listeners: Set<(event: string, data: any) => void> = new Set();
  private isOnline: boolean = navigator.onLine;
  private processingTimer?: NodeJS.Timeout;
  private batchTimer?: NodeJS.Timeout;

    constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxQueueSize: 1000,
      batchSize: 10,
      batchTimeout: 5000,
      retryDelay: 2000,
      maxRetries: 3,
      priorityProcessing: true,
      persistQueue: true,
      autoProcessOnOnline: true,
      ...config
    };

    this.metrics = {
      totalRequests: 0,
      pendingRequests: 0,
      processingRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      successRate: 0,
      lastProcessed: null
    };

    this.initializeBatchProcessors();
    this.loadPersistedQueue();
    this.setupNetworkListeners();
    this.startProcessing();
  }

  private initializeBatchProcessors() {
    this.batchProcessors.push({
      name: 'Financial Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'financial');
      },
      process: async (requests) => {
        return await this.processFinancialBatch(requests);
      },
      batchSize: 3,
      priority: 1
    });

    this.batchProcessors.push({
      name: 'User Data',
      canProcess: (requests) => {
        return requests.every(req => req.metadata?.resource === 'user');
      },
      process: async (requests) => {
        return await this.processUserBatch(requests);
      },
      batchSize: 5,
      priority: 2
    });

    this.batchProcessors.push({
      name: 'General API',
      canProcess: () => true,
      process: async (requests) => {
        return await this.processGeneralBatch(requests);
      },
      batchSize: 10,
      priority: 3
    });
  }

  async addRequest(
    url: string,
    method: QueuedRequest['method'] = 'POST',
    body?: any,
    priority: QueuedRequest['priority'] = 'medium',
    metadata?: QueuedRequest['metadata']
  ): Promise<string> {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const request: QueuedRequest = {
      id: this.generateId(),
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      timestamp: Date.now(),
      priority,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      status: 'pending',
      metadata
    };

    this.queue.push(request);
    this.metrics.totalRequests++;
    this.updateMetrics();

    if (this.config.priorityProcessing) {
      this.sortQueueByPriority();
    }

    if (this.config.persistQueue) {
      this.persistQueue();
    }

    if (this.isOnline && this.config.autoProcessOnOnline) {
      this.processQueue();
    }

    this.emit('request-added', request);
    return request.id;
  }

  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    const pendingRequests = this.queue.filter(req => req.status === 'pending');
    if (pendingRequests.length === 0) {
      return;
    }

    const batchGroups = this.groupRequestsByProcessor(pendingRequests);
    for (const [processor, requests] of batchGroups) {
      if (requests.length === 0) continue;

      const batchSize = Math.min(processor.batchSize, requests.length);
      const batch = requests.slice(0, batchSize);

      try {
        await this.processBatch(batch, processor);
      } catch (error) {
        console.error(`Batch processing failed for ${processor.name}:`, error);
        this.emit('batch-error', { processor: processor.name, error, batch });
      }
    }
  }

  private groupRequestsByProcessor(requests: QueuedRequest[]): Map<BatchProcessor, QueuedRequest[]> {
    const groups = new Map<BatchProcessor, QueuedRequest[]>();
    const unprocessed: QueuedRequest[] = [];
    const sortedProcessors = [...this.batchProcessors].sort((a, b) => a.priority - b.priority);

    for (const request of requests) {
      let processed = false;

      for (const processor of sortedProcessors) {
        if (processor.canProcess([request])) {
          if (!groups.has(processor)) {
            groups.set(processor, []);
          }
          groups.get(processor)!.push(request);
          processed = true;
          break;
        }
      }

      if (!processed) {
        unprocessed.push(request);
      }
    }

    if (unprocessed.length > 0) {
      const generalProcessor = this.batchProcessors.find(p => p.name === 'General API');
      if (generalProcessor) {
        groups.set(generalProcessor, unprocessed);
      }
    }

    return groups;
  }

  private async processBatch(requests: QueuedRequest[], processor: BatchProcessor): Promise<void> {
    const startTime = Date.now();

    requests.forEach(req => {
      req.status = 'processing';
      this.processing.add(req.id);
    });

    this.emit('batch-started', { processor: processor.name, requests });

    try {
      const processedRequests = await processor.process(requests);
      
      processedRequests.forEach(req => {
        this.processing.delete(req.id);
        
        if (req.status === 'completed') {
          this.metrics.completedRequests++;
        } else if (req.status === 'failed') {
          this.metrics.failedRequests++;
          this.handleFailedRequest(req);
        }
      });

      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);
      this.metrics.lastProcessed = Date.now();

      this.emit('batch-completed', { 
        processor: processor.name, 
        requests: processedRequests, 
        processingTime 
      });

    } catch (error) {
      requests.forEach(req => {
        req.status = 'failed';
        req.lastError = error instanceof Error ? error.message : 'Unknown error';
        this.processing.delete(req.id);
        this.handleFailedRequest(req);
      });

      this.emit('batch-failed', { processor: processor.name, error, requests });
    }

    this.updateMetrics();
    this.persistQueue();
  }

  private handleFailedRequest(request: QueuedRequest): void {
    request.retryCount++;

    if (request.retryCount < request.maxRetries) {
      const delay = this.config.retryDelay * Math.pow(2, request.retryCount);
      setTimeout(() => {
        request.status = 'pending';
        this.emit('request-retry', request);
      }, delay);
    } else {
      this.emit('request-failed', request);
    }
  }

  private async processFinancialBatch(requests: QueuedRequest[]): Promise<QueuedRequest[]> {
    const results: QueuedRequest[] = [];

    for (const request of requests) {
      try {
        const response = await fetch('/api/sync/financial/batch', {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({
            requests: requests.map(req => ({
              id: req.id,
              method: req.method,
              url: req.url,
              body: req.body,
              metadata: req.metadata
            }))
          })
        });

        if (response.ok) {
          request.status = 'completed';
        } else {
          request.status = 'failed';
          request.lastError = `HTTP ${response.status}`;
        }
      } catch (error) {
        request.status = 'failed';
        request.lastError = error instanceof Error ? error.message : 'Network error';
      }

      results.push(request);
    }

    return results;
  }

  private async processUserBatch(requests: QueuedRequest[]): Promise<QueuedRequest[]> {
    const results: QueuedRequest[] = [];

    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined
        });

        if (response.ok) {
          request.status = 'completed';
        } else {
          request.status = 'failed';
          request.lastError = `HTTP ${response.status}`;
        }
      } catch (error) {
        request.status = 'failed';
        request.lastError = error instanceof Error ? error.message : 'Network error';
      }

      results.push(request);
    }

    return results;
  }

  private async processGeneralBatch(requests: QueuedRequest[]): Promise<QueuedRequest[]> {
    const results: QueuedRequest[] = [];

    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined
        });

        if (response.ok) {
          request.status = 'completed';
        } else {
          request.status = 'failed';
          request.lastError = `HTTP ${response.status}`;
        }
      } catch (error) {
        request.status = 'failed';
        request.lastError = error instanceof Error ? error.message : 'Network error';
      }

      results.push(request);
    }

    return results;
  }

  private sortQueueByPriority(): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return a.timestamp - b.timestamp;
    });
  }

  private updateMetrics(): void {
    this.metrics.pendingRequests = this.queue.filter(req => req.status === 'pending').length;
    this.metrics.processingRequests = this.processing.size;
    this.metrics.queueSize = this.queue.length;
    this.metrics.successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.completedRequests / this.metrics.totalRequests) * 100 
      : 0;
  }

  private updateAverageProcessingTime(processingTime: number): void {
    const totalProcessed = this.metrics.completedRequests + this.metrics.failedRequests;
    if (totalProcessed === 1) {
      this.metrics.averageProcessingTime = processingTime;
    } else {
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed;
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        this.isOnline = true;
        this.emit('online', { timestamp: Date.now() });
        
        if (this.config.autoProcessOnOnline) {
          this.processQueue();
        }
      };

      const handleOffline = () => {
        this.isOnline = false;
        this.emit('offline', { timestamp: Date.now() });
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
  }

  private startProcessing(): void {
    this.processingTimer = setInterval(() => {
      if (this.isOnline) {
        this.processQueue();
      }
    }, this.config.batchTimeout);
  }

  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  getPendingRequests(): QueuedRequest[] {
    return this.queue.filter(req => req.status === 'pending');
  }

  getFailedRequests(): QueuedRequest[] {
    return this.queue.filter(req => req.status === 'failed');
  }

  getRequestsByPriority(priority: QueuedRequest['priority']): QueuedRequest[] {
    return this.queue.filter(req => req.priority === priority);
  }

  getRequestsByResource(resource: string): QueuedRequest[] {
    return this.queue.filter(req => req.metadata?.resource === resource);
  }

  cancelRequest(requestId: string): boolean {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.queue[index].status = 'cancelled';
      this.processing.delete(requestId);
      this.updateMetrics();
      this.persistQueue();
      this.emit('request-cancelled', { requestId });
      return true;
    }
    return false;
  }

  async retryFailedRequests(): Promise<void> {
    const failedRequests = this.getFailedRequests();
    
    for (const request of failedRequests) {
      request.status = 'pending';
      request.retryCount = 0;
      request.lastError = undefined;
    }

    this.updateMetrics();
    this.persistQueue();
    
    if (this.isOnline) {
      this.processQueue();
    }

    this.emit('retry-failed', { count: failedRequests.length });
  }

  clearCompletedRequests(): number {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(req => req.status !== 'completed');
    const clearedCount = initialLength - this.queue.length;
    
    this.updateMetrics();
    this.persistQueue();
    this.emit('completed-cleared', { count: clearedCount });
    
    return clearedCount;
  }

  clearAllRequests(): void {
    this.queue = [];
    this.processing.clear();
    this.updateMetrics();
    this.persistQueue();
    this.emit('queue-cleared');
  }

  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.batchTimeout) {
      if (this.processingTimer) {
        clearInterval(this.processingTimer);
      }
      this.startProcessing();
    }
  }

  on(event: string, listener: (event: string, data: any) => void): void {
    this.listeners.add(listener);
  }

  off(event: string, listener: (event: string, data: any) => void): void {
    this.listeners.delete(listener);
  }

  private emit(event: string, data?: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data ?? {});
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistQueue(): void {
    try {
      if (this.config.persistQueue && typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('offline-queue', JSON.stringify(this.queue));
      }
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  private loadPersistedQueue(): void {
    try {
      if (this.config.persistQueue && typeof window !== 'undefined' && window.localStorage) {
        const queueData = localStorage.getItem('offline-queue');
        if (queueData) {
          this.queue = JSON.parse(queueData) as QueuedRequest[];
          this.updateMetrics();
        }
      }
    } catch (error) {
      console.error('Failed to load persisted queue:', error);
    }
  }

  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.listeners.clear();
    this.queue = [];
    this.processing.clear();
  }
}

export const offlineQueueManager = new OfflineQueueManager();