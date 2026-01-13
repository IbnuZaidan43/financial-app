/**
 * Cache Invalidation Strategy
 * 
 * This module provides intelligent cache invalidation strategies
 * for PWA applications with multiple invalidation methods.
 */

export interface CacheInvalidationConfig {
  // Time-based invalidation
  maxAge?: number; // in milliseconds
  timeToLive?: number; // in milliseconds
  
  // Version-based invalidation
  version?: string;
  versionKey?: string;
  
  // Tag-based invalidation
  tags?: string[];
  
  // Event-based invalidation
  invalidateOnEvents?: string[];
  
  // Size-based invalidation
  maxSize?: number; // in bytes
  
  // Custom invalidation logic
  customInvalidator?: (key: string, data: any) => boolean;
}

export interface CacheInvalidationRule {
  pattern: string | RegExp;
  config: CacheInvalidationConfig;
  priority: number; // Higher priority rules are checked first
}

export interface CacheInvalidationEvent {
  type: string;
  timestamp: number;
  data?: any;
  source: string;
}

export interface CacheInvalidationResult {
  success: boolean;
  invalidatedKeys: string[];
  errors: string[];
  duration: number;
}

class CacheInvalidationManager {
  private rules: Map<string, CacheInvalidationRule> = new Map();
  private eventListeners: Map<string, ((event: CacheInvalidationEvent) => void)[]> = new Map();
  private versionHistory: Map<string, string[]> = new Map();
  private invalidationStats = {
    totalInvalidations: 0,
    successfulInvalidations: 0,
    failedInvalidations: 0,
    lastInvalidation: null as Date | null
  };

  constructor() {
    this.initializeDefaultRules();
    this.setupEventListeners();
  }

  /**
   * Initialize default invalidation rules
   */
  private initializeDefaultRules(): void {
    // API responses - 5 minutes TTL
    this.addRule({
      pattern: /^api-/,
      config: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        timeToLive: 10 * 60 * 1000, // 10 minutes
        tags: ['api'],
        invalidateOnEvents: ['user-logout', 'data-update']
      },
      priority: 1
    });

    // Financial data - 2 minutes TTL, more aggressive invalidation
    this.addRule({
      pattern: /^api-(financial|keuangan|transaksi|saldo|tabungan)/,
      config: {
        maxAge: 2 * 60 * 1000, // 2 minutes
        timeToLive: 5 * 60 * 1000, // 5 minutes
        tags: ['financial', 'sensitive'],
        invalidateOnEvents: ['user-logout', 'transaction-complete', 'balance-change']
      },
      priority: 10
    });

    // Static assets - 1 hour TTL, version-based invalidation
    this.addRule({
      pattern: /^static-/,
      config: {
        maxAge: 60 * 60 * 1000, // 1 hour
        timeToLive: 24 * 60 * 60 * 1000, // 24 hours
        tags: ['static'],
        versionKey: 'asset-version'
      },
      priority: 5
    });

    // Images - 24 hours TTL
    this.addRule({
      pattern: /^image-/,
      config: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        timeToLive: 7 * 24 * 60 * 60 * 1000, // 7 days
        tags: ['image'],
        maxSize: 50 * 1024 * 1024 // 50MB
      },
      priority: 3
    });

    // User data - invalidate on auth events
    this.addRule({
      pattern: /^user-/,
      config: {
        maxAge: 30 * 60 * 1000, // 30 minutes
        tags: ['user', 'sensitive'],
        invalidateOnEvents: ['user-logout', 'user-update', 'password-change']
      },
      priority: 8
    });
  }

  /**
   * Setup event listeners for automatic invalidation
   */
  private setupEventListeners(): void {
    // Listen for storage events
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'cache-invalidation-event') {
          const invalidationEvent = JSON.parse(event.newValue || '{}');
          this.handleInvalidationEvent(invalidationEvent);
        }
      });

      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.invalidateByEvent('connection-restored');
      });

      window.addEventListener('offline', () => {
        this.invalidateByEvent('connection-lost');
      });
    }
  }

  /**
   * Add a new invalidation rule
   */
  addRule(rule: CacheInvalidationRule): void {
    const ruleId = typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.toString();
    this.rules.set(ruleId, rule);
  }

  /**
   * Remove an invalidation rule
   */
  removeRule(pattern: string | RegExp): void {
    const ruleId = typeof pattern === 'string' ? pattern : pattern.toString();
    this.rules.delete(ruleId);
  }

  /**
   * Check if a cache key should be invalidated
   */
  shouldInvalidate(key: string, data: any, metadata?: any): boolean {
    // Sort rules by priority (highest first)
    const sortedRules = Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesPattern(key, rule.pattern)) {
        return this.evaluateRule(key, data, rule.config, metadata);
      }
    }

    return false;
  }

  /**
   * Check if key matches pattern
   */
  private matchesPattern(key: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return key.startsWith(pattern);
    } else {
      return pattern.test(key);
    }
  }

  /**
   * Evaluate invalidation rule
   */
  private evaluateRule(
    key: string, 
    data: any, 
    config: CacheInvalidationConfig, 
    metadata?: any
  ): boolean {
    const now = Date.now();

    // Time-based invalidation
    if (config.maxAge && metadata?.timestamp) {
      if (now - metadata.timestamp > config.maxAge) {
        return true;
      }
    }

    if (config.timeToLive && metadata?.timestamp) {
      if (now - metadata.timestamp > config.timeToLive) {
        return true;
      }
    }

    // Version-based invalidation
    if (config.version && metadata?.version) {
      if (metadata.version !== config.version) {
        return true;
      }
    }

    // Custom invalidator
    if (config.customInvalidator) {
      try {
        return config.customInvalidator(key, data);
      } catch (error) {
        console.warn('Custom invalidator failed:', error);
      }
    }

    return false;
  }

  /**
   * Invalidate cache by key pattern
   */
  async invalidateByPattern(pattern: string | RegExp): Promise<CacheInvalidationResult> {
    const startTime = Date.now();
    const result: CacheInvalidationResult = {
      success: true,
      invalidatedKeys: [],
      errors: [],
      duration: 0
    };

    try {
      // Get all cache keys
      const cacheKeys = await this.getAllCacheKeys();
      
      // Find matching keys
      const matchingKeys = cacheKeys.filter(key => this.matchesPattern(key, pattern));
      
      // Invalidate matching keys
      for (const key of matchingKeys) {
        try {
          await this.invalidateKey(key);
          result.invalidatedKeys.push(key);
        } catch (error) {
          result.errors.push(`Failed to invalidate ${key}: ${error}`);
        }
      }

      this.invalidationStats.totalInvalidations++;
      this.invalidationStats.successfulInvalidations++;
      this.invalidationStats.lastInvalidation = new Date();

    } catch (error) {
      result.success = false;
      result.errors.push(`Invalidation failed: ${error}`);
      this.invalidationStats.failedInvalidations++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<CacheInvalidationResult> {
    const startTime = Date.now();
    const result: CacheInvalidationResult = {
      success: true,
      invalidatedKeys: [],
      errors: [],
      duration: 0
    };

    try {
      const cacheKeys = await this.getAllCacheKeys();
      
      for (const key of cacheKeys) {
        const metadata = await this.getCacheMetadata(key);
        if (metadata?.tags && metadata.tags.some((tag: string) => tags.includes(tag))) {
          try {
            await this.invalidateKey(key);
            result.invalidatedKeys.push(key);
          } catch (error) {
            result.errors.push(`Failed to invalidate ${key}: ${error}`);
          }
        }
      }

      this.invalidationStats.totalInvalidations++;
      this.invalidationStats.successfulInvalidations++;

    } catch (error) {
      result.success = false;
      result.errors.push(`Tag-based invalidation failed: ${error}`);
      this.invalidationStats.failedInvalidations++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Invalidate cache by event
   */
  async invalidateByEvent(eventType: string, eventData?: any): Promise<CacheInvalidationResult> {
    const startTime = Date.now();
    const result: CacheInvalidationResult = {
      success: true,
      invalidatedKeys: [],
      errors: [],
      duration: 0
    };

    try {
      const event: CacheInvalidationEvent = {
        type: eventType,
        timestamp: Date.now(),
        data: eventData,
        source: 'cache-invalidation-manager'
      };

      // Find rules that listen for this event
      const affectedRules = Array.from(this.rules.values())
        .filter(rule => rule.config.invalidateOnEvents?.includes(eventType));

      for (const rule of affectedRules) {
        const patternResult = await this.invalidateByPattern(rule.pattern);
        result.invalidatedKeys.push(...patternResult.invalidatedKeys);
        result.errors.push(...patternResult.errors);
      }

      // Trigger event listeners
      this.triggerEventListeners(eventType, event);

      this.invalidationStats.totalInvalidations++;
      this.invalidationStats.successfulInvalidations++;

    } catch (error) {
      result.success = false;
      result.errors.push(`Event-based invalidation failed: ${error}`);
      this.invalidationStats.failedInvalidations++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Invalidate by version change
   */
  async invalidateByVersion(versionKey: string, newVersion: string): Promise<CacheInvalidationResult> {
    const startTime = Date.now();
    const result: CacheInvalidationResult = {
      success: true,
      invalidatedKeys: [],
      errors: [],
      duration: 0
    };

    try {
      const cacheKeys = await this.getAllCacheKeys();
      const currentVersion = await this.getVersion(versionKey);
      
      if (currentVersion === newVersion) {
        return result; // No version change
      }

      // Find keys with version key
      for (const key of cacheKeys) {
        const metadata = await this.getCacheMetadata(key);
        if (metadata?.versionKey === versionKey) {
          try {
            await this.invalidateKey(key);
            result.invalidatedKeys.push(key);
          } catch (error) {
            result.errors.push(`Failed to invalidate ${key}: ${error}`);
          }
        }
      }

      // Update version
      await this.setVersion(versionKey, newVersion);
      this.invalidationStats.totalInvalidations++;
      this.invalidationStats.successfulInvalidations++;

    } catch (error) {
      result.success = false;
      result.errors.push(`Version-based invalidation failed: ${error}`);
      this.invalidationStats.failedInvalidations++;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: (event: CacheInvalidationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: (event: CacheInvalidationEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Trigger event listeners
   */
  private triggerEventListeners(eventType: string, event: CacheInvalidationEvent): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.warn('Event listener failed:', error);
        }
      });
    }
  }

  /**
   * Handle invalidation event
   */
  private async handleInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
    await this.invalidateByEvent(event.type, event.data);
  }

  /**
   * Get all cache keys from all caches
   */
  private async getAllCacheKeys(): Promise<string[]> {
    const keys: string[] = [];
    
    try {
      if ('caches' in self) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests) {
            keys.push(request.url);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get cache keys:', error);
    }

    return keys;
  }

  /**
   * Get cache metadata
   */
  private async getCacheMetadata(key: string): Promise<any> {
    try {
      const metadataKey = `${key}-metadata`;
      const metadata = localStorage.getItem(metadataKey);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Invalidate a specific key
   */
  private async invalidateKey(key: string): Promise<void> {
    try {
      if ('caches' in self) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          await cache.delete(key);
        }
      }

      // Remove metadata
      const metadataKey = `${key}-metadata`;
      localStorage.removeItem(metadataKey);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get version
   */
  private async getVersion(versionKey: string): Promise<string | null> {
    try {
      return localStorage.getItem(`version-${versionKey}`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set version
   */
  private async setVersion(versionKey: string, version: string): Promise<void> {
    try {
      localStorage.setItem(`version-${versionKey}`, version);
      
      // Update version history
      if (!this.versionHistory.has(versionKey)) {
        this.versionHistory.set(versionKey, []);
      }
      const history = this.versionHistory.get(versionKey)!;
      history.push(version);
      
      // Keep only last 10 versions
      if (history.length > 10) {
        history.shift();
      }
    } catch (error) {
      console.warn('Failed to set version:', error);
    }
  }

  /**
   * Get invalidation statistics
   */
  getInvalidationStats() {
    return {
      ...this.invalidationStats,
      rulesCount: this.rules.size,
      eventListenersCount: Array.from(this.eventListeners.values())
        .reduce((total, listeners) => total + listeners.length, 0)
    };
  }

  /**
   * Clear all invalidation rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Get all rules
   */
  getRules(): CacheInvalidationRule[] {
    return Array.from(this.rules.values());
  }
}

// Global instance
export const cacheInvalidationManager = new CacheInvalidationManager();

// Export types and utilities
export type { CacheInvalidationManager };

// Helper functions for common invalidation scenarios
export const invalidateFinancialData = () => 
  cacheInvalidationManager.invalidateByTags(['financial', 'sensitive']);

export const invalidateUserData = () => 
  cacheInvalidationManager.invalidateByTags(['user', 'sensitive']);

export const invalidateOnLogout = () => 
  cacheInvalidationManager.invalidateByEvent('user-logout');

export const invalidateOnTransactionComplete = (transactionData: any) => 
  cacheInvalidationManager.invalidateByEvent('transaction-complete', transactionData);

export const invalidateStaticAssets = () => 
  cacheInvalidationManager.invalidateByPattern(/^static-/);

export const invalidateAPIResponses = () => 
  cacheInvalidationManager.invalidateByPattern(/^api-/);

// Version-based invalidation helpers
export const updateAPIVersion = (version: string) => 
  cacheInvalidationManager.invalidateByVersion('api-version', version);

export const updateAssetVersion = (version: string) => 
  cacheInvalidationManager.invalidateByVersion('asset-version', version);