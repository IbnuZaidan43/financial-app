/**
 * Conflict Resolution Logic
 * 
 * Advanced conflict detection and resolution algorithms.
 */

import { SyncConflict, SyncOperation } from './cache-sync';

export interface ConflictDetector {
  name: string;
  detect: (local: any, remote: any, operation?: SyncOperation) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConflictResolver {
  name: string;
  canResolve: (conflict: SyncConflict) => boolean;
  resolve: (conflict: SyncConflict) => Promise<SyncConflict['resolution']>;
  confidence: number; // 0-1 confidence level
}

export interface MergeStrategy {
  name: string;
  canMerge: (local: any, remote: any) => boolean;
  merge: (local: any, remote: any) => Promise<any>;
  description: string;
}

export class ConflictResolutionEngine {
  private detectors: ConflictDetector[] = [];
  private resolvers: ConflictResolver[] = [];
  private mergeStrategies: MergeStrategy[] = [];
  private resolutionHistory: Map<string, any[]> = new Map();

  constructor() {
    this.initializeDetectors();
    this.initializeResolvers();
    this.initializeMergeStrategies();
  }

  /**
   * Initialize conflict detectors
   */
  private initializeDetectors() {
    // Version conflict detector
    this.detectors.push({
      name: 'Version Conflict',
      detect: (local, remote) => {
        const localVersion = this.extractVersion(local);
        const remoteVersion = this.extractVersion(remote);
        return !!(localVersion && remoteVersion && localVersion !== remoteVersion);
      },
      severity: 'high'
    });

    // Timestamp conflict detector
    this.detectors.push({
      name: 'Timestamp Conflict',
      detect: (local, remote) => {
        const localTime = this.extractTimestamp(local);
        const remoteTime = this.extractTimestamp(remote);
        if (!localTime || !remoteTime) return false;
        
        const diff = Math.abs(localTime - remoteTime);
        return diff > 60000; // More than 1 minute difference
      },
      severity: 'medium'
    });

    // Data structure conflict detector
    this.detectors.push({
      name: 'Structure Conflict',
      detect: (local, remote) => {
        return this.getDataStructure(local) !== this.getDataStructure(remote);
      },
      severity: 'high'
    });

    // Value conflict detector
    this.detectors.push({
      name: 'Value Conflict',
      detect: (local, remote) => {
        return !this.deepEqual(local, remote);
      },
      severity: 'low'
    });

    // Delete conflict detector
    this.detectors.push({
      name: 'Delete Conflict',
      detect: (local, remote, operation) => {
        return !!(operation?.type === 'delete' && remote !== null);
      },
      severity: 'critical'
    });

    // Concurrent modification detector
    this.detectors.push({
      name: 'Concurrent Modification',
      detect: (local, remote, operation) => {
        if (!operation) return false;
        
        const operationTime = operation.timestamp;
        const remoteTime = this.extractTimestamp(remote);
        
        return !!(remoteTime && remoteTime > operationTime);
      },
      severity: 'high'
    });
  }

  /**
   * Initialize conflict resolvers
   */
  private initializeResolvers() {
    // Version-based resolver
    this.resolvers.push({
      name: 'Version Based',
      canResolve: (conflict) => {
        const localVersion = this.extractVersion(conflict.localVersion);
        const remoteVersion = this.extractVersion(conflict.remoteVersion);
        return !!(localVersion && remoteVersion);
      },
      resolve: async (conflict) => {
        const localVersion = this.extractVersion(conflict.localVersion);
        const remoteVersion = this.extractVersion(conflict.remoteVersion);
        return (remoteVersion || 0) > (localVersion || 0) ? 'remote' : 'local';
      },
      confidence: 0.9
    });

    // Timestamp-based resolver
    this.resolvers.push({
      name: 'Timestamp Based',
      canResolve: (conflict) => {
        const localTime = this.extractTimestamp(conflict.localVersion);
        const remoteTime = this.extractTimestamp(conflict.remoteVersion);
        return !!(localTime && remoteTime);
      },
      resolve: async (conflict) => {
        const localTime = this.extractTimestamp(conflict.localVersion);
        const remoteTime = this.extractTimestamp(conflict.remoteVersion);
        return (remoteTime || 0) > (localTime || 0) ? 'remote' : 'local';
      },
      confidence: 0.7
    });

    // Priority-based resolver
    this.resolvers.push({
      name: 'Priority Based',
      canResolve: (conflict) => {
        return conflict.resource === 'financial' || conflict.resource === 'user';
      },
      resolve: async (conflict) => {
        switch (conflict.resource) {
          case 'financial':
            return 'manual'; // Financial always manual
          case 'user':
            return 'merge'; // User preferences can be merged
          default:
            return 'remote';
        }
      },
      confidence: 0.8
    });

    // Size-based resolver (for media/files)
    this.resolvers.push({
      name: 'Size Based',
      canResolve: (conflict) => {
        const localSize = this.extractSize(conflict.localVersion);
        const remoteSize = this.extractSize(conflict.remoteVersion);
        return localSize !== null && remoteSize !== null;
      },
      resolve: async (conflict) => {
        const localSize = this.extractSize(conflict.localVersion);
        const remoteSize = this.extractSize(conflict.remoteVersion);
        return (remoteSize || 0) > (localSize || 0) ? 'remote' : 'local';
      },
      confidence: 0.6
    });

    // Learning-based resolver (uses history)
    this.resolvers.push({
      name: 'Learning Based',
      canResolve: (conflict) => {
        const history = this.resolutionHistory.get(conflict.resource);
        return !!(history && history.length > 2);
      },
      resolve: async (conflict) => {
        const history = this.resolutionHistory.get(conflict.resource) || [];
        const resolutions = history.map(h => h.resolution);
        
        // Find most common resolution
        const resolutionCounts = resolutions.reduce((acc, res) => {
          acc[res] = (acc[res] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostCommon = Object.entries(resolutionCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'manual';
        
        return mostCommon as SyncConflict['resolution'];
      },
      confidence: 0.5
    });
  }

  /**
   * Initialize merge strategies
   */
  private initializeMergeStrategies() {
    // Deep merge strategy
    this.mergeStrategies.push({
      name: 'Deep Merge',
      canMerge: (local, remote) => {
        return typeof local === 'object' && typeof remote === 'object' &&
          !Array.isArray(local) && !Array.isArray(remote);
      },
      merge: async (local, remote) => {
        return this.deepMerge(local, remote);
      },
      description: 'Recursively merges object properties'
    });

    // Array merge strategy
    this.mergeStrategies.push({
      name: 'Array Union',
      canMerge: (local, remote) => {
        return Array.isArray(local) && Array.isArray(remote);
      },
      merge: async (local, remote) => {
        const merged = [...remote];
        local.forEach(item => {
          if (!merged.includes(item)) {
            merged.push(item);
          }
        });
        return merged;
      },
      description: 'Combines arrays with unique items'
    });

    // Numeric merge strategy
    this.mergeStrategies.push({
      name: 'Numeric Merge',
      canMerge: (local, remote) => {
        return typeof local === 'number' && typeof remote === 'number';
      },
      merge: async (local, remote) => {
        return local + remote;
      },
      description: 'Sums numeric values'
    });

    // String merge strategy
    this.mergeStrategies.push({
      name: 'String Concat',
      canMerge: (local, remote) => {
        return typeof local === 'string' && typeof remote === 'string';
      },
      merge: async (local, remote) => {
        return `${local} ${remote}`;
      },
      description: 'Concatenates strings'
    });

    // Financial merge strategy
    this.mergeStrategies.push({
      name: 'Financial Merge',
      canMerge: (local, remote) => {
        return typeof local === 'object' && typeof remote === 'object' &&
          local.amount !== undefined && remote.amount !== undefined;
      },
      merge: async (local, remote) => {
        return {
          ...remote,
          amount: local.amount + remote.amount,
          mergedAt: Date.now(),
          mergeReason: 'financial_sum'
        };
      },
      description: 'Merges financial data by summing amounts'
    });
  }

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflicts(
    local: any, 
    remote: any, 
    operation?: SyncOperation
  ): Promise<{
    hasConflict: boolean;
    conflicts: ConflictDetector[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: string[];
  }> {
    const detectedConflicts: ConflictDetector[] = [];
    const details: string[] = [];

    for (const detector of this.detectors) {
      if (detector.detect(local, remote, operation)) {
        detectedConflicts.push(detector);
        details.push(`${detector.name}: ${this.getConflictDescription(detector, local, remote)}`);
      }
    }

    const highestSeverity = detectedConflicts.reduce((highestSeverity, conflict) => {
      const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      const currentSeverityOrder = severityOrder[conflict.severity];
      const highestSeverityOrder = severityOrder[highestSeverity];
      return currentSeverityOrder > highestSeverityOrder ? conflict.severity : highestSeverity;
    }, 'low' as 'low' | 'medium' | 'high' | 'critical');

    return {
      hasConflict: detectedConflicts.length > 0,
      conflicts: detectedConflicts,
      severity: highestSeverity,
      details
    };
  }

  /**
   * Resolve conflict automatically
   */
  async resolveConflict(conflict: SyncConflict): Promise<{
    resolution: SyncConflict['resolution'];
    confidence: number;
    mergedData?: any;
    reasoning: string;
  }> {
    // Try resolvers in order of confidence
    const sortedResolvers = this.resolvers.sort((a, b) => b.confidence - a.confidence);

    for (const resolver of sortedResolvers) {
      if (resolver.canResolve(conflict)) {
        const resolution = await resolver.resolve(conflict);
        
        // If merge resolution, apply merge strategy
        let mergedData;
        if (resolution === 'merge') {
          mergedData = await this.applyMergeStrategy(conflict.localVersion, conflict.remoteVersion);
        }

        // Record resolution for learning
        this.recordResolution(conflict, resolution, resolver.name);

        return {
          resolution,
          confidence: resolver.confidence,
          mergedData,
          reasoning: `Resolved using ${resolver.name} strategy`
        };
      }
    }

    // Default to manual if no resolver can handle it
    return {
      resolution: 'manual',
      confidence: 0,
      reasoning: 'No automatic resolver available, manual intervention required'
    };
  }

  /**
   * Apply merge strategy
   */
  private async applyMergeStrategy(local: any, remote: any): Promise<any> {
    for (const strategy of this.mergeStrategies) {
      if (strategy.canMerge(local, remote)) {
        return await strategy.merge(local, remote);
      }
    }

    // Default deep merge
    return this.deepMerge(local, remote);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && typeof result[key] === 'object') {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Utility methods
   */
  private extractVersion(data: any): number | null {
    return data?.version || data?._version || data?.__v || null;
  }

  private extractTimestamp(data: any): number | null {
    const timestamp = data?.timestamp || data?.updatedAt || data?.modifiedAt || data?.date;
    return timestamp ? new Date(timestamp).getTime() : null;
  }

  private extractSize(data: any): number | null {
    return data?.size || data?.length || data?.fileSize || null;
  }

  private getDataStructure(data: any): string {
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object' && data !== null) return 'object';
    return typeof data;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((val, index) => this.deepEqual(val, b[index]));
    }
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      return keysA.length === keysB.length && 
        keysA.every(key => this.deepEqual(a[key], b[key]));
    }
    return false;
  }

  private getConflictDescription(detector: ConflictDetector, local: any, remote: any): string {
    switch (detector.name) {
      case 'Version Conflict':
        return `Local version ${this.extractVersion(local)} vs Remote version ${this.extractVersion(remote)}`;
      case 'Timestamp Conflict':
        return `Local time ${new Date(this.extractTimestamp(local) || 0).toLocaleString()} vs Remote time ${new Date(this.extractTimestamp(remote) || 0).toLocaleString()}`;
      case 'Structure Conflict':
        return `Local structure ${this.getDataStructure(local)} vs Remote structure ${this.getDataStructure(remote)}`;
      case 'Value Conflict':
        return `Values differ between local and remote`;
      case 'Delete Conflict':
        return `Local deletion conflicts with remote data`;
      case 'Concurrent Modification':
        return `Data was modified concurrently`;
      default:
        return 'Unknown conflict type';
    }
  }

  private recordResolution(conflict: SyncConflict, resolution: SyncConflict['resolution'], resolverName: string): void {
    const history = this.resolutionHistory.get(conflict.resource) || [];
    history.push({
      timestamp: Date.now(),
      conflictType: conflict.conflictType,
      resolution,
      resolverName,
      localData: conflict.localVersion,
      remoteData: conflict.remoteVersion
    });

    // Keep only last 10 resolutions per resource
    if (history.length > 10) {
      history.shift();
    }

    this.resolutionHistory.set(conflict.resource, history);
  }

  /**
   * Get resolution statistics
   */
  getResolutionStatistics(): {
    totalResolutions: number;
    resolutionRates: Record<string, number>;
    mostUsedResolver: string;
    averageConfidence: number;
  } {
    let totalResolutions = 0;
    const resolutionCounts: Record<string, number> = {};
    const resolverCounts: Record<string, number> = {};
    let totalConfidence = 0;

    for (const [resource, history] of this.resolutionHistory) {
      totalResolutions += history.length;
      
      history.forEach(record => {
        resolutionCounts[record.resolution] = (resolutionCounts[record.resolution] || 0) + 1;
        resolverCounts[record.resolverName] = (resolverCounts[record.resolverName] || 0) + 1;
      });
    }

    const mostUsedResolver = Object.entries(resolverCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

    const resolutionRates = Object.entries(resolutionCounts).reduce((acc, [resolution, count]) => {
      acc[resolution] = totalResolutions > 0 ? (count / totalResolutions) * 100 : 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalResolutions,
      resolutionRates,
      mostUsedResolver,
      averageConfidence: totalResolutions > 0 ? totalConfidence / totalResolutions : 0
    };
  }

  /**
   * Get available detectors
   */
  getDetectors(): ConflictDetector[] {
    return [...this.detectors];
  }

  /**
   * Get available resolvers
   */
  getResolvers(): ConflictResolver[] {
    return [...this.resolvers];
  }

  /**
   * Get available merge strategies
   */
  getMergeStrategies(): MergeStrategy[] {
    return [...this.mergeStrategies];
  }

  /**
   * Add custom detector
   */
  addDetector(detector: ConflictDetector): void {
    this.detectors.push(detector);
  }

  /**
   * Add custom resolver
   */
  addResolver(resolver: ConflictResolver): void {
    this.resolvers.push(resolver);
  }

  /**
   * Add custom merge strategy
   */
  addMergeStrategy(strategy: MergeStrategy): void {
    this.mergeStrategies.push(strategy);
  }
}

// Global instance
export const conflictResolutionEngine = new ConflictResolutionEngine();