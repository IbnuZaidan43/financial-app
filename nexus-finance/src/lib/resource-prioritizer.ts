/**
 * Resource Prioritization Algorithms
 * 
 * Advanced algorithms for intelligent resource prioritization in cache warming
 */

'use client';

import { popularContentDetector, type ContentPopularityMetrics } from './popular-content-detector';
import { userBehaviorAnalyzer, type BehaviorMetrics } from './user-behavior-analyzer';

export interface ResourcePriority {
  resourceId: string;
  url: string;
  type: 'api' | 'static' | 'image' | 'document' | 'data';
  basePriority: number;
  contextualPriority: number;
  temporalPriority: number;
  userPriority: number;
  networkPriority: number;
  devicePriority: number;
  finalPriority: number;
  priorityFactors: {
    popularity: number;
    recency: number;
    frequency: number;
    userRelevance: number;
    networkEfficiency: number;
    deviceOptimization: number;
    businessValue: number;
    cacheHitRate: number;
  };
  recommendedAction: 'preload' | 'prefetch' | 'preconnect' | 'monitor' | 'skip';
  confidence: number;
  estimatedBenefit: number;
  resourceCost: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated: number;
}

export interface PrioritizationConfig {
  enableContextualPrioritization: boolean;
  enableTemporalPrioritization: boolean;
  enableUserSegmentation: boolean;
  enableNetworkAwarePrioritization: boolean;
  enableDeviceOptimization: boolean;
  businessValueWeights: Record<string, number>;
  priorityThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  maxPrioritizedResources: number;
  updateInterval: number; // in minutes
  enableAdaptiveLearning: boolean;
}

export interface PriorityFactors {
  popularity: number;
  recency: number;
  frequency: number;
  userRelevance: number;
  networkEfficiency: number;
  deviceOptimization: number;
  businessValue: number;
  cacheHitRate: number;
}

export class ResourcePrioritizer {
  private config: PrioritizationConfig;
  private priorityCache: Map<string, ResourcePriority> = new Map();
  private userContext: Map<string, any> = new Map();
  private networkContext: any = null;
  private deviceContext: any = null;
  private learningData: Map<string, number[]> = new Map();
  private lastUpdate: number = 0;
  private updateTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(event: string, data: any) => void> = [];

  constructor(config: Partial<PrioritizationConfig> = {}) {
    this.config = {
      enableContextualPrioritization: true,
      enableTemporalPrioritization: true,
      enableUserSegmentation: true,
      enableNetworkAwarePrioritization: true,
      enableDeviceOptimization: true,
      businessValueWeights: {
        'api': 0.9,
        'static': 0.7,
        'image': 0.6,
        'document': 0.5,
        'data': 0.8
      },
      priorityThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.9
      },
      maxPrioritizedResources: 100,
      updateInterval: 10, // 10 minutes
      enableAdaptiveLearning: true,
      ...config
    };

    this.initializeContexts();
    this.loadPersistedData();
    this.startPeriodicUpdate();
  }

  /**
   * Get prioritized resources for cache warming
   */
  getPrioritizedResources(limit: number = 50): ResourcePriority[] {
    this.updateAllPriorities();
    
    return Array.from(this.priorityCache.values())
      .filter(resource => resource.finalPriority >= this.config.priorityThresholds.low)
      .sort((a, b) => b.finalPriority - a.finalPriority)
      .slice(0, Math.min(limit, this.config.maxPrioritizedResources));
  }

  /**
   * Get high priority resources
   */
  getHighPriorityResources(): ResourcePriority[] {
    return this.getPrioritizedResources()
      .filter(resource => resource.finalPriority >= this.config.priorityThresholds.high);
  }

  /**
   * Get critical resources
   */
  getCriticalResources(): ResourcePriority[] {
    return this.getPrioritizedResources()
      .filter(resource => resource.finalPriority >= this.config.priorityThresholds.critical);
  }

  /**
   * Prioritize specific resource
   */
  prioritizeResource(resourceId: string, url: string, userId?: string): ResourcePriority {
    const priority = this.calculateResourcePriority(resourceId, url, userId);
    this.priorityCache.set(resourceId, priority);
    
    if (this.config.enableAdaptiveLearning) {
      this.recordLearningData(resourceId, priority.finalPriority);
    }

    this.emit('resource-prioritized', priority);
    return priority;
  }

  /**
   * Update resource priority based on new data
   */
  updateResourcePriority(resourceId: string, factors: Partial<PriorityFactors>): void {
    const existing = this.priorityCache.get(resourceId);
    if (!existing) return;

    // Update priority factors
    Object.assign(existing.priorityFactors, factors);
    
    // Recalculate final priority
    existing.finalPriority = this.calculateFinalPriority(existing.priorityFactors);
    existing.lastUpdated = Date.now();
    
    // Update recommended action
    existing.recommendedAction = this.determineRecommendedAction(existing);
    existing.confidence = this.calculateConfidence(existing);

    this.emit('priority-updated', existing);
  }

  /**
   * Get priority for specific user context
   */
  getUserSpecificPriorities(userId: string, limit: number = 20): ResourcePriority[] {
    const userBehavior = userBehaviorAnalyzer.getBehaviorMetrics(userId);
    const userSegment = this.getUserSegment(userId);
    
    return this.getPrioritizedResources()
      .map(resource => this.adjustPriorityForUser(resource, userId, userBehavior, userSegment))
      .sort((a, b) => b.finalPriority - a.finalPriority)
      .slice(0, limit);
  }

  /**
   * Get network-aware priorities
   */
  getNetworkAwarePriorities(): ResourcePriority[] {
    this.updateNetworkContext();
    
    return this.getPrioritizedResources()
      .map(resource => this.adjustPriorityForNetwork(resource))
      .sort((a, b) => b.finalPriority - a.finalPriority);
  }

  /**
   * Get device-optimized priorities
   */
  getDeviceOptimizedPriorities(): ResourcePriority[] {
    this.updateDeviceContext();
    
    return this.getPrioritizedResources()
      .map(resource => this.adjustPriorityForDevice(resource))
      .sort((a, b) => b.finalPriority - a.finalPriority);
  }

  /**
   * Calculate resource priority
   */
  private calculateResourcePriority(resourceId: string, url: string, userId?: string): ResourcePriority {
    // Get base metrics
    const popularityMetrics = popularContentDetector.getContentMetrics(resourceId);
    const behaviorMetrics = userId ? userBehaviorAnalyzer.getBehaviorMetrics(userId) : null;
    
    // Calculate priority factors
    const priorityFactors = this.calculatePriorityFactors(resourceId, popularityMetrics, behaviorMetrics);
    
    // Calculate contextual priorities
    const contextualPriority = this.config.enableContextualPrioritization ? 
      this.calculateContextualPriority(resourceId, userId) : 0;
    
    const temporalPriority = this.config.enableTemporalPrioritization ? 
      this.calculateTemporalPriority(resourceId) : 0;
    
    const userPriority = this.config.enableUserSegmentation ? 
      this.calculateUserPriority(resourceId, userId) : 0;
    
    const networkPriority = this.config.enableNetworkAwarePrioritization ? 
      this.calculateNetworkPriority(resourceId) : 0;
    
    const devicePriority = this.config.enableDeviceOptimization ? 
      this.calculateDevicePriority(resourceId) : 0;

    // Calculate base priority
    const basePriority = this.calculateBasePriority(priorityFactors);

    // Calculate final priority
    const finalPriority = this.calculateFinalPriority({
      ...priorityFactors,
      contextualPriority,
      temporalPriority,
      userPriority,
      networkPriority,
      devicePriority
    });

    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction({
      resourceId,
      finalPriority,
      type: this.detectResourceType(url),
      priorityFactors
    });

    // Calculate confidence and benefit
    const confidence = this.calculateConfidence({
      finalPriority,
      priorityFactors,
      popularityMetrics
    });
    
    const estimatedBenefit = this.calculateEstimatedBenefit(finalPriority, priorityFactors);
    const resourceCost = this.calculateResourceCost(resourceId, priorityFactors);
    const riskLevel = this.calculateRiskLevel(finalPriority, resourceCost);

    return {
      resourceId,
      url,
      type: this.detectResourceType(url),
      basePriority,
      contextualPriority,
      temporalPriority,
      userPriority,
      networkPriority,
      devicePriority,
      finalPriority,
      priorityFactors,
      recommendedAction,
      confidence,
      estimatedBenefit,
      resourceCost,
      riskLevel,
      lastUpdated: Date.now()
    };
  }

  /**
   * Calculate priority factors
   */
  private calculatePriorityFactors(
    resourceId: string,
    popularityMetrics: ContentPopularityMetrics | null,
    behaviorMetrics: BehaviorMetrics | null
  ): PriorityFactors {
    const popularity = popularityMetrics ? popularityMetrics.popularityScore : 0;
    const recency = popularityMetrics ? this.calculateRecencyScore(popularityMetrics.lastAccessed) : 0;
    const frequency = popularityMetrics ? Math.min(popularityMetrics.accessCount / 50, 1) : 0;
    const userRelevance = behaviorMetrics ? this.calculateUserRelevance(resourceId, behaviorMetrics) : 0;
    const networkEfficiency = this.calculateNetworkEfficiency(resourceId);
    const deviceOptimization = this.calculateDeviceOptimization(resourceId);
    const businessValue = this.calculateBusinessValue(resourceId);
    const cacheHitRate = popularityMetrics ? popularityMetrics.cacheHitRate / 100 : 0;

    return {
      popularity,
      recency,
      frequency,
      userRelevance,
      networkEfficiency,
      deviceOptimization,
      businessValue,
      cacheHitRate
    };
  }

  /**
   * Calculate base priority
   */
  private calculateBasePriority(factors: PriorityFactors): number {
    const weights = {
      popularity: 0.25,
      recency: 0.15,
      frequency: 0.20,
      userRelevance: 0.15,
      networkEfficiency: 0.10,
      deviceOptimization: 0.05,
      businessValue: 0.05,
      cacheHitRate: 0.05
    };

    return Object.entries(factors).reduce((sum, [factor, value]) => {
      return sum + (value * (weights[factor as keyof typeof weights] || 0));
    }, 0);
  }

  /**
   * Calculate final priority with all contextual factors
   */
  private calculateFinalPriority(factors: PriorityFactors & {
    contextualPriority?: number;
    temporalPriority?: number;
    userPriority?: number;
    networkPriority?: number;
    devicePriority?: number;
  }): number {
    const baseFactors: PriorityFactors = {
      popularity: factors.popularity,
      recency: factors.recency,
      frequency: factors.frequency,
      userRelevance: factors.userRelevance,
      networkEfficiency: factors.networkEfficiency,
      deviceOptimization: factors.deviceOptimization,
      businessValue: factors.businessValue,
      cacheHitRate: factors.cacheHitRate
    };

    const basePriority = this.calculateBasePriority(baseFactors);
    
    // Apply contextual boosts
    const contextualBoost = factors.contextualPriority || 0;
    const temporalBoost = factors.temporalPriority || 0;
    const userBoost = factors.userPriority || 0;
    const networkBoost = factors.networkPriority || 0;
    const deviceBoost = factors.devicePriority || 0;

    // Combine with weighted boosts
    const totalBoost = (contextualBoost * 0.3) + 
                      (temporalBoost * 0.2) + 
                      (userBoost * 0.3) + 
                      (networkBoost * 0.1) + 
                      (deviceBoost * 0.1);

    return Math.min(basePriority + totalBoost, 1.0);
  }

  /**
   * Calculate contextual priority
   */
  private calculateContextualPriority(resourceId: string, userId?: string): number {
    if (!userId) return 0;

    const userContext = this.userContext.get(userId);
    if (!userContext) return 0;

    // Check if resource is in user's recent context
    const recentResources = userContext.recentResources || [];
    const isInRecentContext = recentResources.includes(resourceId);
    
    // Check if resource matches user's interests
    const userInterests = userContext.interests || [];
    const resourceCategory = this.getResourceCategory(resourceId);
    const matchesInterests = userInterests.includes(resourceCategory);

    let priority = 0;
    if (isInRecentContext) priority += 0.3;
    if (matchesInterests) priority += 0.2;

    return Math.min(priority, 0.5);
  }

  /**
   * Calculate temporal priority
   */
  private calculateTemporalPriority(resourceId: string): number {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Get content patterns
    const patterns = popularContentDetector.analyzeContentPatterns(resourceId);
    
    // Check if current time is peak usage time
    const isPeakHour = patterns.peakUsageTimes.includes(hour);
    const hourlyPattern = patterns.hourlyPattern[hour] || 0;
    const avgHourlyAccess = patterns.hourlyPattern.reduce((sum, count) => sum + count, 0) / 24;

    let priority = 0;
    if (isPeakHour) priority += 0.2;
    if (hourlyPattern > avgHourlyAccess * 1.5) priority += 0.3;

    return Math.min(priority, 0.5);
  }

  /**
   * Calculate user priority
   */
  private calculateUserPriority(resourceId: string, userId?: string): number {
    if (!userId || !this.config.enableUserSegmentation) return 0;

    const userSegment = this.getUserSegment(userId);
    const resourceType = this.detectResourceType(resourceId);
    
    // Segment-specific preferences
    const segmentPreferences = {
      'premium': { 'api': 0.4, 'image': 0.3, 'static': 0.3 },
      'regular': { 'api': 0.3, 'image': 0.4, 'static': 0.3 },
      'mobile': { 'static': 0.5, 'image': 0.3, 'api': 0.2 },
      'admin': { 'api': 0.6, 'data': 0.3, 'static': 0.1 }
    };

    const preferences = segmentPreferences[userSegment as keyof typeof segmentPreferences] || 
                       segmentPreferences['regular'];

    return preferences[resourceType as keyof typeof preferences] || 0;
  }

  /**
   * Calculate network priority
   */
  private calculateNetworkPriority(resourceId: string): number {
    if (!this.networkContext) return 0;

    const { effectiveType, downlink } = this.networkContext;
    const resourceSize = this.estimateResourceSize(resourceId);
    
    let priority = 0;
    
    // Prioritize smaller resources on slow connections
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      if (resourceSize < 50 * 1024) priority += 0.4; // < 50KB
      else if (resourceSize < 200 * 1024) priority += 0.2; // < 200KB
    } else if (effectiveType === '3g') {
      if (resourceSize < 200 * 1024) priority += 0.3;
      else if (resourceSize < 1024 * 1024) priority += 0.1; // < 1MB
    }

    return Math.min(priority, 0.4);
  }

  /**
   * Calculate device priority
   */
  private calculateDevicePriority(resourceId: string): number {
    if (!this.deviceContext) return 0;

    const { deviceMemory, hardwareConcurrency } = this.deviceContext;
    const resourceType = this.detectResourceType(resourceId);
    
    let priority = 0;
    
    // Prioritize critical resources on low-end devices
    if (deviceMemory < 4 || hardwareConcurrency < 4) {
      if (resourceType === 'static' || resourceType === 'api') {
        priority += 0.3;
      }
    }

    return Math.min(priority, 0.3);
  }

  /**
   * Determine recommended action
   */
  private determineRecommendedAction(resource: {
    resourceId: string;
    finalPriority: number;
    type: string;
    priorityFactors: PriorityFactors;
  }): ResourcePriority['recommendedAction'] {
    const { finalPriority, type } = resource;

    if (finalPriority >= this.config.priorityThresholds.critical) {
      return 'preload';
    } else if (finalPriority >= this.config.priorityThresholds.high) {
      return type === 'api' ? 'preload' : 'prefetch';
    } else if (finalPriority >= this.config.priorityThresholds.medium) {
      return type === 'static' ? 'prefetch' : 'preconnect';
    } else if (finalPriority >= this.config.priorityThresholds.low) {
      return 'monitor';
    } else {
      return 'skip';
    }
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(data: {
    finalPriority: number;
    priorityFactors: PriorityFactors;
    popularityMetrics?: ContentPopularityMetrics | null;
  }): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (data.popularityMetrics) {
      confidence += Math.min(data.popularityMetrics.accessCount / 20, 0.3);
    }

    // Increase confidence for consistent factors
    const factorVariance = this.calculateFactorVariance(data.priorityFactors);
    confidence += Math.max(0, (1 - factorVariance) * 0.2);

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate estimated benefit
   */
  private calculateEstimatedBenefit(priority: number, factors: PriorityFactors): number {
    const popularityBenefit = factors.popularity * factors.frequency * 100;
    const performanceBenefit = factors.cacheHitRate * 50;
    const userBenefit = factors.userRelevance * 30;
    const networkBenefit = factors.networkEfficiency * 20;

    return priority * (popularityBenefit + performanceBenefit + userBenefit + networkBenefit);
  }

  /**
   * Calculate resource cost
   */
  private calculateResourceCost(resourceId: string, factors: PriorityFactors): number {
    const sizeCost = this.estimateResourceSize(resourceId) / (1024 * 1024); // MB
    const networkCost = (1 - factors.networkEfficiency) * 10;
    const processingCost = factors.deviceOptimization ? 2 : 5;

    return sizeCost + networkCost + processingCost;
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(priority: number, cost: number): ResourcePriority['riskLevel'] {
    const riskScore = (1 - priority) * cost;
    
    if (riskScore > 10) return 'high';
    if (riskScore > 5) return 'medium';
    return 'low';
  }

  // Helper methods
  private detectResourceType(url: string): ResourcePriority['type'] {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('/api/')) return 'api';
    if (lowerUrl.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (lowerUrl.match(/\.(pdf|doc|docx|xls|xlsx)$/)) return 'document';
    if (lowerUrl.match(/\.(js|css|json)$/)) return 'static';
    return 'data';
  }

  private getResourceCategory(resourceId: string): string {
    const url = resourceId.toLowerCase();
    if (url.includes('financial')) return 'financial';
    if (url.includes('user')) return 'user';
    if (url.includes('analytics')) return 'analytics';
    if (url.includes('cache')) return 'cache';
    return 'general';
  }

  private calculateRecencyScore(lastAccessed: number): number {
    const now = Date.now();
    const age = now - lastAccessed;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return Math.max(0, 1 - (age / maxAge));
  }

  private calculateUserRelevance(resourceId: string, behaviorMetrics: BehaviorMetrics): number {
    const predictions = behaviorMetrics.predictions.find(p => p.resource === resourceId);
    return predictions ? predictions.probability : 0;
  }

  private calculateNetworkEfficiency(resourceId: string): number {
    const size = this.estimateResourceSize(resourceId);
    if (size < 50 * 1024) return 1.0; // < 50KB - very efficient
    if (size < 200 * 1024) return 0.8; // < 200KB - efficient
    if (size < 1024 * 1024) return 0.6; // < 1MB - moderate
    return 0.4; // > 1MB - less efficient
  }

  private calculateDeviceOptimization(resourceId: string): number {
    const type = this.detectResourceType(resourceId);
    const optimizations = {
      'static': 0.9,
      'api': 0.8,
      'image': 0.7,
      'data': 0.6,
      'document': 0.5
    };
    
    return optimizations[type] || 0.5;
  }

  private calculateBusinessValue(resourceId: string): number {
    const category = this.getResourceCategory(resourceId);
    const type = this.detectResourceType(resourceId);
    
    return this.config.businessValueWeights[type] || 0.5;
  }

  private estimateResourceSize(resourceId: string): number {
    const type = this.detectResourceType(resourceId);
    const sizeEstimates = {
      'api': 2048, // 2KB
      'static': 51200, // 50KB
      'image': 153600, // 150KB
      'document': 2048000, // 2MB
      'data': 10240 // 10KB
    };
    
    return sizeEstimates[type] || 10240;
  }

  private calculateFactorVariance(factors: PriorityFactors): number {
    const values = Object.values(factors);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getUserSegment(userId: string): string {
    if (userId.includes('premium')) return 'premium';
    if (userId.includes('mobile')) return 'mobile';
    if (userId.includes('admin')) return 'admin';
    return 'regular';
  }

  private adjustPriorityForUser(
    resource: ResourcePriority, 
    userId: string, 
    behaviorMetrics: BehaviorMetrics,
    userSegment: string
  ): ResourcePriority {
    const userPriority = this.calculateUserPriority(resource.resourceId, userId);
    const adjusted = { ...resource };
    adjusted.userPriority = userPriority;
    adjusted.finalPriority = this.calculateFinalPriority({
      ...adjusted.priorityFactors,
      userPriority
    });
    adjusted.recommendedAction = this.determineRecommendedAction(adjusted);
    return adjusted;
  }

  private adjustPriorityForNetwork(resource: ResourcePriority): ResourcePriority {
    const networkPriority = this.calculateNetworkPriority(resource.resourceId);
    const adjusted = { ...resource };
    adjusted.networkPriority = networkPriority;
    adjusted.finalPriority = this.calculateFinalPriority({
      ...adjusted.priorityFactors,
      networkPriority
    });
    adjusted.recommendedAction = this.determineRecommendedAction(adjusted);
    return adjusted;
  }

  private adjustPriorityForDevice(resource: ResourcePriority): ResourcePriority {
    const devicePriority = this.calculateDevicePriority(resource.resourceId);
    const adjusted = { ...resource };
    adjusted.devicePriority = devicePriority;
    adjusted.finalPriority = this.calculateFinalPriority({
      ...adjusted.priorityFactors,
      devicePriority
    });
    adjusted.recommendedAction = this.determineRecommendedAction(adjusted);
    return adjusted;
  }

  // Context management
  private initializeContexts(): void {
    this.updateNetworkContext();
    this.updateDeviceContext();
  }

  private updateNetworkContext(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      this.networkContext = (navigator as any).connection;
    }
  }

  private updateDeviceContext(): void {
    if (typeof navigator !== 'undefined') {
      this.deviceContext = {
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: (navigator as any).hardwareConcurrency,
        userAgent: navigator.userAgent
      };
    }
  }

  // Learning system
  private recordLearningData(resourceId: string, priority: number): void {
    if (!this.learningData.has(resourceId)) {
      this.learningData.set(resourceId, []);
    }
    
    const history = this.learningData.get(resourceId)!;
    history.push(priority);
    
    // Keep only last 20 entries
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  // Periodic update
  private startPeriodicUpdate(): void {
    if (typeof window === 'undefined') return;

    this.updateTimer = setInterval(() => {
      this.updateAllPriorities();
      this.updateContexts();
      this.persistData();
      
      this.emit('periodic-update-completed', {
        timestamp: Date.now(),
        resourceCount: this.priorityCache.size
      });
    }, this.config.updateInterval * 60 * 1000);
  }

  private updateAllPriorities(): void {
    // This would typically be called with actual resource data
    // For now, we'll update existing cached priorities
    for (const [resourceId, priority] of this.priorityCache.entries()) {
      const updated = this.calculateResourcePriority(resourceId, priority.url);
      this.priorityCache.set(resourceId, updated);
    }
    this.lastUpdate = Date.now();
  }

  private updateContexts(): void {
    this.updateNetworkContext();
    this.updateDeviceContext();
  }

  // Event handling
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
        console.error('Resource prioritizer event listener error:', error);
      }
    });
  }

  // Data persistence
  private persistData(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        priorityCache: Object.fromEntries(this.priorityCache),
        learningData: Object.fromEntries(this.learningData),
        lastUpdate: this.lastUpdate
      };
      localStorage.setItem('resource-prioritizer-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist resource prioritizer data:', error);
    }
  }

  private loadPersistedData(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('resource-prioritizer-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.priorityCache = new Map(Object.entries(data.priorityCache || {}));
        this.learningData = new Map(Object.entries(data.learningData || {}));
        this.lastUpdate = data.lastUpdate || 0;
      }
    } catch (error) {
      console.warn('Failed to load persisted resource prioritizer data:', error);
    }
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.priorityCache.clear();
    this.userContext.clear();
    this.learningData.clear();
    this.lastUpdate = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('resource-prioritizer-data');
    }

    this.emit('data-cleared', {});
  }

  /**
   * Get prioritizer statistics
   */
  getStatistics(): {
    totalResources: number;
    highPriorityResources: number;
    criticalResources: number;
    lastUpdate: number;
    averagePriority: number;
    memoryUsage: number;
  } {
    const resources = Array.from(this.priorityCache.values());
    const highPriority = resources.filter(r => r.finalPriority >= this.config.priorityThresholds.high).length;
    const criticalPriority = resources.filter(r => r.finalPriority >= this.config.priorityThresholds.critical).length;
    const averagePriority = resources.length > 0 ? 
      resources.reduce((sum, r) => sum + r.finalPriority, 0) / resources.length : 0;

    return {
      totalResources: resources.length,
      highPriorityResources: highPriority,
      criticalResources: criticalPriority,
      lastUpdate: this.lastUpdate,
      averagePriority,
      memoryUsage: JSON.stringify(Object.fromEntries(this.priorityCache)).length
    };
  }
}

// Global instance
export const resourcePrioritizer = new ResourcePrioritizer();