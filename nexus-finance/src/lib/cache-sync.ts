/**
 * Cache Synchronization Manager
 * 
 * Advanced cache synchronization with conflict resolution,
 * background sync, and delta synchronization capabilities.
 */

'use client';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SyncConflict {
  id: string;
  resourceId: string;
  resource: string;
  localVersion: any;
  remoteVersion: any;
  conflictType: 'version' | 'data' | 'delete' | 'concurrent' | 'create';
  timestamp: number;
  status: 'pending' | 'resolved' | 'ignored';
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
}

export interface SyncStrategy {
  name: string;
  description: string;
  conflictResolution: (conflict: SyncConflict) => Promise<SyncConflict['resolution']>;
  shouldSync: (operation: SyncOperation) => boolean;
  batchSize?: number;
  retryDelay?: number;
  maxRetries?: number;
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number;
  maxConcurrentSyncs: number;
  enableDeltaSync: boolean;
  conflictResolutionStrategy: 'auto' | 'manual' | 'prompt';
  backgroundSync: boolean;
  retryAttempts: number;
  syncTimeout: number;
}

export interface SyncMetrics {
  totalOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  pendingOperations: number;
  conflictsResolved: number;
  averageSyncTime: number;
  lastSyncTime: number | null;
  syncInProgress: boolean;
}

export class CacheSyncManager {
  private config: SyncConfig;
  private operations: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, SyncConflict> = new Map();
  private strategies: Map<string, SyncStrategy> = new Map();
  private syncInProgress = false;
  private syncQueue: string[] = [];
  private metrics: SyncMetrics;
  private listeners: Set<(event: string, data: any) => void> = new Set();
  private syncTimer?: NodeJS.Timeout;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      autoSync: true,
      syncInterval: 30000, // 30 seconds
      maxConcurrentSyncs: 3,
      enableDeltaSync: true,
      conflictResolutionStrategy: 'auto',
      backgroundSync: true,
      retryAttempts: 3,
      syncTimeout: 10000, // 10 seconds
      ...config
    };

    this.metrics = {
      totalOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      pendingOperations: 0,
      conflictsResolved: 0,
      averageSyncTime: 0,
      lastSyncTime: null,
      syncInProgress: false
    };

    this.initializeDefaultStrategies();
    this.loadPersistedData();
    this.startAutoSync();
  }

  /**
   * Initialize default sync strategies
   */
  private initializeDefaultStrategies() {
    // Financial data strategy - high priority, conservative approach
    this.strategies.set('financial', {
      name: 'Financial Data',
      description: 'High priority sync with manual conflict resolution for financial data',
      conflictResolution: async (conflict) => {
        // For financial data, always prefer manual resolution
        this.emit('conflict-detected', conflict);
        return 'manual';
      },
      shouldSync: (op) => op.priority === 'critical' || op.priority === 'high',
      batchSize: 1,
      retryDelay: 2000,
      maxRetries: 5
    });

    // User preferences strategy - low priority, auto-merge
    this.strategies.set('preferences', {
      name: 'User Preferences',
      description: 'Low priority sync with automatic conflict resolution',
      conflictResolution: async (conflict) => {
        // Auto-merge preferences
        return 'merge';
      },
      shouldSync: (op) => op.priority !== 'critical',
      batchSize: 10,
      retryDelay: 1000,
      maxRetries: 2
    });

    // Cache data strategy - medium priority, remote wins
    this.strategies.set('cache', {
      name: 'Cache Data',
      description: 'Medium priority sync with remote-first approach',
      conflictResolution: async (conflict) => {
        // For cache data, prefer remote version
        return 'remote';
      },
      shouldSync: () => true,
      batchSize: 5,
      retryDelay: 1500,
      maxRetries: 3
    });
  }

  /**
   * Add sync operation
   */
  async addOperation(
    type: SyncOperation['type'],
    resource: string,
    resourceId: string,
    data: any,
    priority: SyncOperation['priority'] = 'medium'
  ): Promise<string> {
    const operation: SyncOperation = {
      id: this.generateId(),
      type,
      resource,
      resourceId,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      priority
    };

    this.operations.set(operation.id, operation);
    this.metrics.totalOperations++;
    this.metrics.pendingOperations++;

    // Add to queue based on priority
    this.addToQueue(operation.id);

    // Persist operation
    this.persistOperations();

    // Trigger sync if auto-sync is enabled
    if (this.config.autoSync && !this.syncInProgress) {
      this.processSyncQueue();
    }

    this.emit('operation-added', operation);
    return operation.id;
  }

  /**
   * Add operation to priority queue
   */
  private addToQueue(operationId: string) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // Insert based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.syncQueue.findIndex(id => {
      const op = this.operations.get(id);
      return op && priorityOrder[op.priority] > priorityOrder[operation.priority];
    });

    if (insertIndex === -1) {
      this.syncQueue.push(operationId);
    } else {
      this.syncQueue.splice(insertIndex, 0, operationId);
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.metrics.syncInProgress = true;
    this.emit('sync-started', { queueSize: this.syncQueue.length });

    const startTime = Date.now();
    const concurrentSyncs: Promise<void>[] = [];

    try {
      while (this.syncQueue.length > 0 && concurrentSyncs.length < this.config.maxConcurrentSyncs) {
        const operationId = this.syncQueue.shift();
        if (operationId) {
          concurrentSyncs.push(this.syncOperation(operationId));
        }
      }

      // Wait for all concurrent syncs to complete
      await Promise.allSettled(concurrentSyncs);

      // Process conflicts
      await this.processConflicts();

    } catch (error) {
      console.error('Sync queue processing failed:', error);
      this.emit('sync-error', error);
    } finally {
      const syncTime = Date.now() - startTime;
      this.updateAverageSyncTime(syncTime);
      this.metrics.lastSyncTime = Date.now();
      this.metrics.syncInProgress = false;
      this.syncInProgress = false;
      this.emit('sync-completed', { duration: syncTime });
    }
  }

  /**
   * Sync individual operation
   */
  private async syncOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'pending') {
      return;
    }

    operation.status = 'syncing';
    this.emit('operation-syncing', operation);

    try {
      const strategy = this.strategies.get(operation.resource) || this.strategies.get('cache');
      if (!strategy || !strategy.shouldSync(operation)) {
        operation.status = 'completed';
        return;
      }

      // Check for conflicts
      const conflict = await this.detectConflict(operation);
      if (conflict) {
        await this.handleConflict(conflict);
        return;
      }

      // Perform sync
      await this.performSync(operation);
      
      operation.status = 'completed';
      this.metrics.successfulSyncs++;
      this.metrics.pendingOperations--;
      this.emit('operation-completed', operation);

    } catch (error) {
      operation.lastError = error instanceof Error ? error.message : 'Unknown error';
      operation.retryCount++;

      if (operation.retryCount >= (this.strategies.get(operation.resource)?.maxRetries || this.config.retryAttempts)) {
        operation.status = 'failed';
        this.metrics.failedSyncs++;
        this.emit('operation-failed', operation);
      } else {
        operation.status = 'pending';
        // Retry with delay
        const delay = (this.strategies.get(operation.resource)?.retryDelay || 1000) * operation.retryCount;
        setTimeout(() => this.addToQueue(operationId), delay);
      }
    }

    this.persistOperations();
  }

  /**
   * Detect sync conflicts
   */
  private async detectConflict(operation: SyncOperation): Promise<SyncConflict | null> {
    try {
      // Get remote version
      const remoteData = await this.fetchRemoteData(operation.resource, operation.resourceId);
      
      if (!remoteData) {
        return null; // No remote data, no conflict
      }

      // Compare versions
      const localVersion = operation.data;
      const remoteVersion = remoteData;

      if (this.hasDataConflict(localVersion, remoteVersion)) {
        const conflict: SyncConflict = {
          id: this.generateId(),
          resourceId: operation.resourceId,
          resource: operation.resource,
          localVersion,
          remoteVersion,
          conflictType: this.determineConflictType(localVersion, remoteVersion),
          timestamp: Date.now(),
          status: 'pending'
        };

        this.conflicts.set(conflict.id, conflict);
        this.persistConflicts();
        return conflict;
      }

    } catch (error) {
      console.error('Conflict detection failed:', error);
    }

    return null;
  }

  /**
   * Handle sync conflict
   */
  private async handleConflict(conflict: SyncConflict): Promise<void> {
    const strategy = this.strategies.get(conflict.resource) || this.strategies.get('cache');
    
    if (this.config.conflictResolutionStrategy === 'auto' && strategy) {
      conflict.resolution = await strategy.conflictResolution(conflict);
    } else if (this.config.conflictResolutionStrategy === 'manual') {
      conflict.resolution = 'manual';
    } else {
      // Prompt user for resolution
      conflict.resolution = await this.promptConflictResolution(conflict);
    }

    if (conflict.resolution === 'merge') {
      conflict.localVersion = await this.mergeData(conflict.localVersion, conflict.remoteVersion);
    }

    conflict.status = 'resolved';
    this.metrics.conflictsResolved++;
    this.emit('conflict-resolved', conflict);
    this.persistConflicts();
  }

  /**
   * Process all pending conflicts
   */
  private async processConflicts(): Promise<void> {
    const pendingConflicts = Array.from(this.conflicts.values()).filter(c => c.status === 'pending');
    
    for (const conflict of pendingConflicts) {
      await this.handleConflict(conflict);
    }
  }

  /**
   * Perform actual sync operation
   */
  private async performSync(operation: SyncOperation): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.syncTimeout);

    try {
      const response = await fetch(`/api/sync/${operation.resource}/${operation.resourceId}`, {
        method: operation.type === 'delete' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: operation.type !== 'delete' ? JSON.stringify(operation.data) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      // Handle delta sync if enabled
      if (this.config.enableDeltaSync && operation.type === 'update') {
        await this.handleDeltaSync(operation, response);
      }

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle delta synchronization
   */
  private async handleDeltaSync(operation: SyncOperation, response: Response): Promise<void> {
    if (!response.headers.get('X-Delta-Sync')) {
      return;
    }

    const delta = await response.json();
    if (delta.changes) {
      // Apply only the changes to local data
      Object.assign(operation.data, delta.changes);
      this.emit('delta-sync-applied', { operation, delta });
    }
  }

  /**
   * Manual conflict resolution
   */
  async resolveConflict(conflictId: string, resolution: SyncConflict['resolution']): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error('Conflict not found');
    }

    conflict.resolution = resolution;
    conflict.status = 'resolved';

    if (resolution === 'merge') {
      conflict.localVersion = await this.mergeData(conflict.localVersion, conflict.remoteVersion);
    }

    this.metrics.conflictsResolved++;
    this.emit('conflict-resolved', conflict);
    this.persistConflicts();
  }

  /**
   * Get sync metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.operations.values()).filter(op => op.status === 'pending');
  }

  /**
   * Get conflicts
   */
  getConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Force sync all pending operations
   */
  async forceSync(): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    await this.processSyncQueue();
  }

  /**
   * Clear all operations and conflicts
   */
  clearAll(): void {
    this.operations.clear();
    this.conflicts.clear();
    this.syncQueue = [];
    this.metrics.pendingOperations = 0;
    this.persistOperations();
    this.persistConflicts();
    this.emit('data-cleared', { timestamp: Date.now() });
  }

  /**
   * Start auto sync
   */
  private startAutoSync(): void {
    if (this.config.autoSync && this.config.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        if (!this.syncInProgress && this.syncQueue.length > 0) {
          this.processSyncQueue();
        }
      }, this.config.syncInterval);
    }
  }

  /**
   * Stop auto sync
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.syncInterval || newConfig.autoSync !== undefined) {
      this.stopAutoSync();
      this.startAutoSync();
    }
  }

  /**
   * Event listeners
   */
  on(event: string, listener: (event: string, data: any) => void): void {
    this.listeners.add(listener);
  }

  off(event: string, listener: (event: string, data: any) => void): void {
    this.listeners.delete(listener);
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * Utility methods
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hasDataConflict(local: any, remote: any): boolean {
    // Simple conflict detection - can be enhanced
    const localHash = this.hashData(local);
    const remoteHash = this.hashData(remote);
    return localHash !== remoteHash;
  }

  private determineConflictType(local: any, remote: any): SyncConflict['conflictType'] {
    if (!local && remote) return 'delete';
    if (local && !remote) return 'create';
    if (local.version && remote.version && local.version !== remote.version) return 'version';
    return 'data';
  }

  private hashData(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private async fetchRemoteData(resource: string, resourceId: string): Promise<any> {
    const response = await fetch(`/api/data/${resource}/${resourceId}`);
    if (response.ok) {
      return response.json();
    }
    return null;
  }

  private async mergeData(local: any, remote: any): Promise<any> {
    // Simple merge strategy - can be enhanced
    return { ...remote, ...local, mergedAt: Date.now() };
  }

  private async promptConflictResolution(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // In a real app, this would show a UI dialog
    // For now, default to manual
    return 'manual';
  }

  private updateAverageSyncTime(duration: number): void {
    const totalSyncs = this.metrics.successfulSyncs + this.metrics.failedSyncs;
    if (totalSyncs === 1) {
      this.metrics.averageSyncTime = duration;
    } else {
      this.metrics.averageSyncTime = (this.metrics.averageSyncTime * (totalSyncs - 1) + duration) / totalSyncs;
    }
  }

  /**
   * Persistence methods
   */
  private persistOperations(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const operations = Array.from(this.operations.values());
        localStorage.setItem('cache-sync-operations', JSON.stringify(operations));
      }
    } catch (error) {
      console.error('Failed to persist operations:', error);
    }
  }

  private persistConflicts(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const conflicts = Array.from(this.conflicts.values());
        localStorage.setItem('cache-sync-conflicts', JSON.stringify(conflicts));
      }
    } catch (error) {
      console.error('Failed to persist conflicts:', error);
    }
  }

  private loadPersistedData(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      // Load operations
      const operationsData = localStorage.getItem('cache-sync-operations');
      if (operationsData) {
        const operations = JSON.parse(operationsData) as SyncOperation[];
        operations.forEach(op => {
          this.operations.set(op.id, op);
          if (op.status === 'pending') {
            this.addToQueue(op.id);
          }
        });
      }

      // Load conflicts
      const conflictsData = localStorage.getItem('cache-sync-conflicts');
      if (conflictsData) {
        const conflicts = JSON.parse(conflictsData) as SyncConflict[];
        conflicts.forEach(conflict => {
          this.conflicts.set(conflict.id, conflict);
        });
      }

      // Update metrics
      this.metrics.pendingOperations = this.getPendingOperations().length;
    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSync();
    this.listeners.clear();
    this.operations.clear();
    this.conflicts.clear();
    this.syncQueue = [];
  }
}

// Global instance
export const cacheSyncManager = new CacheSyncManager();