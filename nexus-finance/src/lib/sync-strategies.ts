/**
 * Sync Strategies
 * 
 * Different synchronization strategies for various data types and scenarios.
 */

import { SyncStrategy, SyncConflict, SyncOperation } from './cache-sync';

export interface ConflictResolutionRule {
  condition: (conflict: SyncConflict) => boolean;
  resolution: SyncConflict['resolution'];
  mergeFunction?: (local: any, remote: any) => Promise<any>;
  priority: number;
}

export class SyncStrategyManager {
  private strategies: Map<string, SyncStrategy> = new Map();
  private conflictRules: ConflictResolutionRule[] = [];

  constructor() {
    this.initializeDefaultStrategies();
    this.initializeConflictRules();
  }

  /**
   * Initialize default sync strategies
   */
  private initializeDefaultStrategies() {
    // Financial data strategy - most conservative
    this.strategies.set('financial', {
      name: 'Financial Data Strategy',
      description: 'High priority, conservative sync for financial transactions',
      conflictResolution: this.resolveFinancialConflict.bind(this),
      shouldSync: (operation) => operation.priority === 'critical' || operation.priority === 'high',
      batchSize: 1,
      retryDelay: 2000,
      maxRetries: 5
    });

    // User data strategy - medium priority
    this.strategies.set('user', {
      name: 'User Data Strategy',
      description: 'Balanced sync for user preferences and settings',
      conflictResolution: this.resolveUserConflict.bind(this),
      shouldSync: (operation) => operation.priority !== 'critical',
      batchSize: 5,
      retryDelay: 1500,
      maxRetries: 3
    });

    // Cache data strategy - low priority, aggressive
    this.strategies.set('cache', {
      name: 'Cache Data Strategy',
      description: 'Fast sync for cache data with remote preference',
      conflictResolution: this.resolveCacheConflict.bind(this),
      shouldSync: () => true,
      batchSize: 10,
      retryDelay: 1000,
      maxRetries: 2
    });

    // Analytics data strategy - batch processing
    this.strategies.set('analytics', {
      name: 'Analytics Data Strategy',
      description: 'Batch sync for analytics and tracking data',
      conflictResolution: this.resolveAnalyticsConflict.bind(this),
      shouldSync: (operation) => operation.priority === 'low',
      batchSize: 50,
      retryDelay: 500,
      maxRetries: 1
    });

    // Media data strategy - large files
    this.strategies.set('media', {
      name: 'Media Data Strategy',
      description: 'Chunked sync for large media files',
      conflictResolution: this.resolveMediaConflict.bind(this),
      shouldSync: (operation) => operation.priority === 'low' || operation.priority === 'medium',
      batchSize: 1,
      retryDelay: 5000,
      maxRetries: 3
    });
  }

  /**
   * Initialize conflict resolution rules
   */
  private initializeConflictRules() {
    // Rule 1: Delete conflicts - always prefer remote (more recent)
    this.conflictRules.push({
      condition: (conflict) => conflict.conflictType === 'delete',
      resolution: 'remote',
      priority: 1
    });

    // Rule 2: Version conflicts - prefer higher version
    this.conflictRules.push({
      condition: (conflict) => {
        return conflict.conflictType === 'version' &&
          conflict.localVersion?.version &&
          conflict.remoteVersion?.version;
      },
      resolution: 'remote', // Will be determined by version comparison
      priority: 2
    });

    // Rule 3: Timestamp conflicts - prefer more recent
    this.conflictRules.push({
      condition: (conflict) => {
        const localTime = new Date(conflict.localVersion?.updatedAt || 0).getTime();
        const remoteTime = new Date(conflict.remoteVersion?.updatedAt || 0).getTime();
        return Math.abs(localTime - remoteTime) > 60000; // More than 1 minute difference
      },
      resolution: 'remote', // Will be determined by timestamp comparison
      priority: 3
    });

    // Rule 4: Numeric value conflicts - merge with sum for financial
    this.conflictRules.push({
      condition: (conflict) => {
        return conflict.resource === 'financial' &&
          typeof conflict.localVersion?.amount === 'number' &&
          typeof conflict.remoteVersion?.amount === 'number';
      },
      resolution: 'merge',
      mergeFunction: async (local, remote) => {
        return {
          ...remote,
          amount: local.amount + remote.amount,
          mergedAt: Date.now(),
          mergeReason: 'financial_sum'
        };
      },
      priority: 4
    });

    // Rule 5: Array conflicts - concatenate unique items
    this.conflictRules.push({
      condition: (conflict) => {
        return Array.isArray(conflict.localVersion) && Array.isArray(conflict.remoteVersion);
      },
      resolution: 'merge',
      mergeFunction: async (local, remote) => {
        const merged = [...remote];
        local.forEach(item => {
          if (!merged.includes(item)) {
            merged.push(item);
          }
        });
        return merged;
      },
      priority: 5
    });

    // Rule 6: Object conflicts - deep merge
    this.conflictRules.push({
      condition: (conflict) => {
        return typeof conflict.localVersion === 'object' &&
          typeof conflict.remoteVersion === 'object' &&
          !Array.isArray(conflict.localVersion) &&
          !Array.isArray(conflict.remoteVersion);
      },
      resolution: 'merge',
      mergeFunction: this.deepMerge.bind(this),
      priority: 6
    });
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): SyncStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): SyncStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Add custom strategy
   */
  addStrategy(name: string, strategy: SyncStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Resolve conflict using rules
   */
  async resolveConflict(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // Sort rules by priority
    const sortedRules = this.conflictRules.sort((a, b) => a.priority - b.priority);

    // Find matching rule
    for (const rule of sortedRules) {
      if (rule.condition(conflict)) {
        if (rule.mergeFunction && rule.resolution === 'merge') {
          conflict.localVersion = await rule.mergeFunction(conflict.localVersion, conflict.remoteVersion);
        }
        return rule.resolution;
      }
    }

    // Default resolution based on resource type
    return this.getDefaultResolution(conflict);
  }

  /**
   * Get default resolution for conflict
   */
  private getDefaultResolution(conflict: SyncConflict): SyncConflict['resolution'] {
    switch (conflict.resource) {
      case 'financial':
        return 'manual'; // Financial data always requires manual review
      case 'user':
        return 'merge'; // User preferences can be merged
      case 'cache':
        return 'remote'; // Cache data prefers remote
      case 'analytics':
        return 'local'; // Analytics data prefers local (avoid data loss)
      default:
        return 'remote'; // Default to remote
    }
  }

  /**
   * Strategy-specific conflict resolvers
   */
  private async resolveFinancialConflict(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // Financial conflicts always require manual intervention
    return 'manual';
  }

  private async resolveUserConflict(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // User preferences can be automatically merged
    return 'merge';
  }

  private async resolveCacheConflict(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // Cache data prefers remote version
    return 'remote';
  }

  private async resolveAnalyticsConflict(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // Analytics data prefers local to avoid data loss
    return 'local';
  }

  private async resolveMediaConflict(conflict: SyncConflict): Promise<SyncConflict['resolution']> {
    // Media files - prefer larger file (assumes better quality)
    const localSize = conflict.localVersion?.size || 0;
    const remoteSize = conflict.remoteVersion?.size || 0;
    return remoteSize > localSize ? 'remote' : 'local';
  }

  /**
   * Deep merge objects
   */
  private async deepMerge(local: any, remote: any): Promise<any> {
    const result = { ...remote };

    for (const key in local) {
      if (local.hasOwnProperty(key)) {
        if (typeof local[key] === 'object' && typeof remote[key] === 'object') {
          result[key] = await this.deepMerge(local[key], remote[key]);
        } else if (!remote.hasOwnProperty(key)) {
          result[key] = local[key];
        }
      }
    }

    return {
      ...result,
      mergedAt: Date.now(),
      mergeReason: 'deep_merge'
    };
  }

  /**
   * Batch operations for efficiency
   */
  batchOperations(operations: SyncOperation[], strategy: SyncStrategy): SyncOperation[][] {
    const batchSize = strategy.batchSize || 1;
    const batches: SyncOperation[][] = [];

    // Group by resource and priority
    const grouped = operations.reduce((acc, op) => {
      const key = `${op.resource}-${op.priority}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(op);
      return acc;
    }, {} as Record<string, SyncOperation[]>);

    // Create batches
    Object.values(grouped).forEach(group => {
      for (let i = 0; i < group.length; i += batchSize) {
        batches.push(group.slice(i, i + batchSize));
      }
    });

    return batches;
  }

  /**
   * Priority queue ordering
   */
  prioritizeOperations(operations: SyncOperation[]): SyncOperation[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return operations.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Check if operation should be retried
   */
  shouldRetry(operation: SyncOperation, strategy?: SyncStrategy): boolean {
    const maxRetries = strategy?.maxRetries || 3;
    return operation.retryCount < maxRetries && operation.status === 'failed';
  }

  /**
   * Calculate retry delay
   */
  calculateRetryDelay(operation: SyncOperation, strategy?: SyncStrategy): number {
    const baseDelay = strategy?.retryDelay || 1000;
    const exponentialBackoff = Math.pow(2, operation.retryCount);
    const jitter = Math.random() * 0.1 * baseDelay; // Add jitter to avoid thundering herd
    
    return Math.min(baseDelay * exponentialBackoff + jitter, 30000); // Max 30 seconds
  }

  /**
   * Validate operation data
   */
  validateOperation(operation: SyncOperation): boolean {
    if (!operation.id || !operation.resource || !operation.resourceId) {
      return false;
    }

    if (!['create', 'update', 'delete'].includes(operation.type)) {
      return false;
    }

    if (!['low', 'medium', 'high', 'critical'].includes(operation.priority)) {
      return false;
    }

    if (operation.type !== 'delete' && !operation.data) {
      return false;
    }

    return true;
  }

  /**
   * Transform operation for API
   */
  transformOperation(operation: SyncOperation): any {
    const transformed = {
      id: operation.id,
      type: operation.type,
      resource: operation.resource,
      resourceId: operation.resourceId,
      data: operation.data,
      timestamp: operation.timestamp,
      priority: operation.priority
    };

    // Add resource-specific transformations
    switch (operation.resource) {
      case 'financial':
        transformed.data = {
          ...operation.data,
          syncVersion: Date.now(),
          clientTimestamp: operation.timestamp
        };
        break;
      case 'user':
        transformed.data = {
          ...operation.data,
          lastModified: Date.now()
        };
        break;
      case 'cache':
        transformed.data = {
          ...operation.data,
          cacheTimestamp: operation.timestamp
        };
        break;
    }

    return transformed;
  }
}

// Global instance
export const syncStrategyManager = new SyncStrategyManager();