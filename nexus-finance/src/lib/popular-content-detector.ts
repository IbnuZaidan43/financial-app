/**
 * Popular Content Detection System
 * 
 * Identifies trending and frequently accessed content for cache warming
 */

'use client';

export interface ContentPopularityMetrics {
  resourceId: string;
  url: string;
  type: 'api' | 'static' | 'image' | 'document' | 'data';
  accessCount: number;
  uniqueUsers: number;
  averageAccessTime: number;
  lastAccessed: number;
  firstAccessed: number;
  trending: boolean;
  popularityScore: number;
  growthRate: number;
  seasonalPattern: boolean;
  peakHours: number[];
  userSegments: string[];
  relatedResources: string[];
  cacheHitRate: number;
  sizeEstimate: number;
  loadTime: number;
}

export interface PopularContentConfig {
  analysisWindow: number; // in hours
  minAccessCount: number;
  trendingThreshold: number;
  popularityDecayRate: number;
  enableRealTimeDetection: boolean;
  enableCrossUserAnalysis: boolean;
  enableSeasonalAnalysis: boolean;
  maxPopularResources: number;
  updateInterval: number; // in minutes
}

export interface ContentTrend {
  resourceId: string;
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  confidence: number;
  changeRate: number;
  predictedAccesses: number;
  timeWindow: number;
}

export class PopularContentDetector {
  private config: PopularContentConfig;
  private accessHistory: Map<string, Array<{
    timestamp: number;
    userId: string;
    sessionId: string;
    loadTime: number;
    success: boolean;
    cacheHit: boolean;
  }>> = new Map();
  
  private popularityCache: Map<string, ContentPopularityMetrics> = new Map();
  private trendData: Map<string, ContentTrend> = new Map();
  private lastUpdate: number = 0;
  private updateTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(event: string, data: any) => void> = [];

  constructor(config: Partial<PopularContentConfig> = {}) {
    this.config = {
      analysisWindow: 24, // 24 hours
      minAccessCount: 5,
      trendingThreshold: 0.7,
      popularityDecayRate: 0.1,
      enableRealTimeDetection: true,
      enableCrossUserAnalysis: true,
      enableSeasonalAnalysis: true,
      maxPopularResources: 100,
      updateInterval: 15, // 15 minutes
      ...config
    };

    this.loadPersistedData();
    this.startPeriodicAnalysis();
  }

  /**
   * Record content access
   */
  recordAccess(
    resourceId: string,
    url: string,
    userId: string,
    sessionId: string,
    loadTime: number = 0,
    success: boolean = true,
    cacheHit: boolean = false
  ): void {
    const access = {
      timestamp: Date.now(),
      userId,
      sessionId,
      loadTime,
      success,
      cacheHit
    };

    if (!this.accessHistory.has(resourceId)) {
      this.accessHistory.set(resourceId, []);
    }

    this.accessHistory.get(resourceId)!.push(access);
    this.cleanupOldData(resourceId);

    if (this.config.enableRealTimeDetection) {
      this.performRealTimeAnalysis(resourceId);
    }

    this.emit('access-recorded', { resourceId, access });
  }

  /**
   * Get popular content
   */
  getPopularContent(limit: number = 20): ContentPopularityMetrics[] {
    this.updateAllPopularityMetrics();
    
    const allContent = Array.from(this.popularityCache.values())
      .filter(content => content.accessCount >= this.config.minAccessCount)
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, Math.min(limit, this.config.maxPopularResources));

    return allContent;
  }

  /**
   * Get trending content
   */
  getTrendingContent(limit: number = 10): ContentPopularityMetrics[] {
    return this.getPopularContent()
      .filter(content => content.trending)
      .slice(0, limit);
  }

  /**
   * Get content trends
   */
  getContentTrends(): ContentTrend[] {
    this.updateTrendAnalysis();
    return Array.from(this.trendData.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get content recommendations for cache warming
   */
  getCacheWarmingRecommendations(): Array<{
    resourceId: string;
    url: string;
    priority: number;
    reason: string;
    estimatedBenefit: number;
    size: number;
    type: string;
  }> {
    const popular = this.getPopularContent(30);
    const trending = this.getTrendingContent(15);
    const recommendations: Array<{
      resourceId: string;
      url: string;
      priority: number;
      reason: string;
      estimatedBenefit: number;
      size: number;
      type: string;
    }> = [];

    // Add popular content
    popular.forEach(content => {
      if (content.popularityScore >= 0.6) {
        recommendations.push({
          resourceId: content.resourceId,
          url: content.url,
          priority: content.popularityScore,
          reason: `High popularity: ${content.accessCount} accesses, ${content.uniqueUsers} unique users`,
          estimatedBenefit: content.popularityScore * content.accessCount,
          size: content.sizeEstimate,
          type: content.type
        });
      }
    });

    // Add trending content with boost
    trending.forEach(content => {
      const existingIndex = recommendations.findIndex(r => r.resourceId === content.resourceId);
      const boostedPriority = Math.min(content.popularityScore * 1.3, 1.0);
      
      if (existingIndex >= 0) {
        recommendations[existingIndex].priority = boostedPriority;
        recommendations[existingIndex].reason += ' (Trending +30%)';
      } else {
        recommendations.push({
          resourceId: content.resourceId,
          url: content.url,
          priority: boostedPriority,
          reason: `Trending content: ${content.growthRate > 0 ? '+' : ''}${(content.growthRate * 100).toFixed(1)}% growth`,
          estimatedBenefit: boostedPriority * content.accessCount * 1.2,
          size: content.sizeEstimate,
          type: content.type
        });
      }
    });

    // Sort by estimated benefit
    return recommendations.sort((a, b) => b.estimatedBenefit - a.estimatedBenefit);
  }

  /**
   * Get content metrics
   */
  getContentMetrics(resourceId: string): ContentPopularityMetrics | null {
    this.updatePopularityMetrics(resourceId);
    return this.popularityCache.get(resourceId) || null;
  }

  /**
   * Analyze content patterns
   */
  analyzeContentPatterns(resourceId: string): {
    hourlyPattern: number[];
    dailyPattern: number[];
    userSegmentDistribution: Map<string, number>;
    seasonalTrends: boolean;
    peakUsageTimes: number[];
  } {
    const accesses = this.accessHistory.get(resourceId) || [];
    if (accesses.length === 0) {
      return {
        hourlyPattern: [],
        dailyPattern: [],
        userSegmentDistribution: new Map(),
        seasonalTrends: false,
        peakUsageTimes: []
      };
    }

    const hourlyPattern = new Array(24).fill(0);
    const dailyPattern = new Array(7).fill(0);
    const userSegmentDistribution = new Map<string, number>();

    accesses.forEach(access => {
      const date = new Date(access.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      const userSegment = this.getUserSegment(access.userId);

      hourlyPattern[hour]++;
      dailyPattern[day]++;
      
      const current = userSegmentDistribution.get(userSegment) || 0;
      userSegmentDistribution.set(userSegment, current + 1);
    });

    // Find peak usage times
    const peakUsageTimes = hourlyPattern
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Detect seasonal trends (simplified)
    const seasonalTrends = this.detectSeasonalTrends(accesses);

    return {
      hourlyPattern,
      dailyPattern,
      userSegmentDistribution,
      seasonalTrends,
      peakUsageTimes
    };
  }

  /**
   * Update popularity metrics for all content
   */
  private updateAllPopularityMetrics(): void {
    for (const resourceId of this.accessHistory.keys()) {
      this.updatePopularityMetrics(resourceId);
    }
    this.lastUpdate = Date.now();
  }

  /**
   * Update popularity metrics for specific content
   */
  private updatePopularityMetrics(resourceId: string): void {
    const accesses = this.accessHistory.get(resourceId) || [];
    if (accesses.length === 0) return;

    const recentAccesses = this.getRecentAccesses(accesses);
    const uniqueUsers = new Set(recentAccesses.map(a => a.userId)).size;
    const averageAccessTime = recentAccesses.reduce((sum, a) => sum + a.loadTime, 0) / recentAccesses.length;
    const cacheHits = recentAccesses.filter(a => a.cacheHit).length;
    const cacheHitRate = (cacheHits / recentAccesses.length) * 100;

    // Calculate popularity score
    const recencyFactor = this.calculateRecencyFactor(recentAccesses);
    const frequencyFactor = Math.min(recentAccesses.length / 50, 1); // Normalize to 50 accesses
    const userDiversityFactor = Math.min(uniqueUsers / 10, 1); // Normalize to 10 users
    const performanceFactor = cacheHitRate > 80 ? 1.2 : cacheHitRate > 60 ? 1.0 : 0.8;

    const popularityScore = (recencyFactor * 0.3 + frequencyFactor * 0.4 + userDiversityFactor * 0.2 + performanceFactor * 0.1);

    // Detect trending
    const trending = this.detectTrending(resourceId, recentAccesses);
    const growthRate = this.calculateGrowthRate(recentAccesses);

    // Analyze patterns
    const patterns = this.analyzeContentPatterns(resourceId);

    const metrics: ContentPopularityMetrics = {
      resourceId,
      url: this.extractUrl(resourceId),
      type: this.detectContentType(resourceId),
      accessCount: recentAccesses.length,
      uniqueUsers,
      averageAccessTime,
      lastAccessed: Math.max(...recentAccesses.map(a => a.timestamp)),
      firstAccessed: Math.min(...recentAccesses.map(a => a.timestamp)),
      trending,
      popularityScore,
      growthRate,
      seasonalPattern: patterns.seasonalTrends,
      peakHours: patterns.peakUsageTimes,
      userSegments: Array.from(patterns.userSegmentDistribution.keys()),
      relatedResources: this.findRelatedResources(resourceId),
      cacheHitRate,
      sizeEstimate: this.estimateResourceSize(resourceId),
      loadTime: averageAccessTime
    };

    this.popularityCache.set(resourceId, metrics);
  }

  /**
   * Update trend analysis
   */
  private updateTrendAnalysis(): void {
    for (const resourceId of this.accessHistory.keys()) {
      const accesses = this.accessHistory.get(resourceId) || [];
      if (accesses.length < 10) continue; // Need sufficient data

      const trend = this.calculateTrend(resourceId, accesses);
      this.trendData.set(resourceId, trend);
    }
  }

  /**
   * Calculate content trend
   */
  private calculateTrend(resourceId: string, accesses: any[]): ContentTrend {
    const timeWindows = this.splitIntoTimeWindows(accesses, 4); // 4 time windows
    if (timeWindows.length < 2) {
      return {
        resourceId,
        trend: 'stable',
        confidence: 0,
        changeRate: 0,
        predictedAccesses: accesses.length,
        timeWindow: this.config.analysisWindow
      };
    }

    const counts = timeWindows.map(window => window.length);
    const changeRate = this.calculateChangeRate(counts);
    const trend = this.determineTrendDirection(changeRate);
    const confidence = this.calculateTrendConfidence(counts);
    const predictedAccesses = this.predictNextAccessCount(counts);

    return {
      resourceId,
      trend,
      confidence,
      changeRate,
      predictedAccesses,
      timeWindow: this.config.analysisWindow
    };
  }

  /**
   * Perform real-time analysis
   */
  private performRealTimeAnalysis(resourceId: string): void {
    const accesses = this.accessHistory.get(resourceId) || [];
    const recentAccesses = accesses.slice(-10); // Last 10 accesses

    if (recentAccesses.length >= 5) {
      const timeSpan = recentAccesses[recentAccesses.length - 1].timestamp - recentAccesses[0].timestamp;
      const accessRate = recentAccesses.length / (timeSpan / (1000 * 60)); // accesses per minute

      if (accessRate > 2) { // More than 2 accesses per minute
        this.emit('content-spike', {
          resourceId,
          accessRate,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Helper methods
   */
  private getRecentAccesses(accesses: any[]): any[] {
    const cutoff = Date.now() - (this.config.analysisWindow * 60 * 60 * 1000);
    return accesses.filter(access => access.timestamp >= cutoff);
  }

  private cleanupOldData(resourceId: string): void {
    const accesses = this.accessHistory.get(resourceId) || [];
    const cutoff = Date.now() - (this.config.analysisWindow * 2 * 60 * 60 * 1000); // Keep 2x window
    const filtered = accesses.filter(access => access.timestamp >= cutoff);
    this.accessHistory.set(resourceId, filtered);
  }

  private calculateRecencyFactor(accesses: any[]): number {
    if (accesses.length === 0) return 0;

    const now = Date.now();
    const recencyScores = accesses.map(access => {
      const age = now - access.timestamp;
      const maxAge = this.config.analysisWindow * 60 * 60 * 1000;
      return Math.max(0, 1 - (age / maxAge));
    });

    return recencyScores.reduce((sum, score) => sum + score, 0) / recencyScores.length;
  }

  private detectTrending(resourceId: string, accesses: any[]): boolean {
    const trend = this.trendData.get(resourceId);
    return trend ? 
      (trend.trend === 'rising' && trend.confidence >= this.config.trendingThreshold) : 
      false;
  }

  private calculateGrowthRate(accesses: any[]): number {
    if (accesses.length < 10) return 0;

    const midpoint = Math.floor(accesses.length / 2);
    const firstHalf = accesses.slice(0, midpoint);
    const secondHalf = accesses.slice(midpoint);

    const firstHalfRate = firstHalf.length / this.getTimeSpan(firstHalf);
    const secondHalfRate = secondHalf.length / this.getTimeSpan(secondHalf);

    if (firstHalfRate === 0) return secondHalfRate > 0 ? 1 : 0;
    return (secondHalfRate - firstHalfRate) / firstHalfRate;
  }

  private getTimeSpan(accesses: any[]): number {
    if (accesses.length < 2) return 1;
    return (accesses[accesses.length - 1].timestamp - accesses[0].timestamp) / (1000 * 60 * 60); // hours
  }

  private getUserSegment(userId: string): string {
    // Simple segmentation based on user ID patterns
    if (userId.includes('admin')) return 'admin';
    if (userId.includes('premium')) return 'premium';
    if (userId.includes('mobile')) return 'mobile';
    return 'regular';
  }

  private detectSeasonalTrends(accesses: any[]): boolean {
    // Simplified seasonal detection
    const hourlyPattern = new Array(24).fill(0);
    accesses.forEach(access => {
      const hour = new Date(access.timestamp).getHours();
      hourlyPattern[hour]++;
    });

    // Check for consistent patterns
    const avgAccesses = hourlyPattern.reduce((sum, count) => sum + count, 0) / 24;
    const variance = hourlyPattern.reduce((sum, count) => sum + Math.pow(count - avgAccesses, 2), 0) / 24;
    
    return variance > avgAccesses * 0.5; // High variance indicates seasonal pattern
  }

  private extractUrl(resourceId: string): string {
    // Extract URL from resource ID (simplified)
    if (resourceId.startsWith('http')) return resourceId;
    return `/api/${resourceId}`;
  }

  private detectContentType(resourceId: string): ContentPopularityMetrics['type'] {
    const url = this.extractUrl(resourceId).toLowerCase();
    
    if (url.includes('/api/')) return 'api';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(pdf|doc|docx|xls|xlsx)$/)) return 'document';
    if (url.match(/\.(js|css|json)$/)) return 'static';
    return 'data';
  }

  private findRelatedResources(resourceId: string): string[] {
    // Simplified related resource detection
    const url = this.extractUrl(resourceId);
    const basePath = url.split('/').slice(0, -1).join('/');
    
    return Array.from(this.accessHistory.keys())
      .filter(id => id !== resourceId && this.extractUrl(id).startsWith(basePath))
      .slice(0, 5);
  }

  private estimateResourceSize(resourceId: string): number {
    const type = this.detectContentType(resourceId);
    const sizeEstimates = {
      'api': 1024, // 1KB
      'static': 51200, // 50KB
      'image': 204800, // 200KB
      'document': 1024000, // 1MB
      'data': 5120 // 5KB
    };
    
    return sizeEstimates[type] || 10240; // Default 10KB
  }

  private splitIntoTimeWindows(accesses: any[], windows: number): any[][] {
    if (accesses.length === 0) return [];

    const timeSpan = accesses[accesses.length - 1].timestamp - accesses[0].timestamp;
    const windowSize = timeSpan / windows;
    const result: any[][] = [];

    for (let i = 0; i < windows; i++) {
      const start = accesses[0].timestamp + (i * windowSize);
      const end = start + windowSize;
      result.push(accesses.filter(a => a.timestamp >= start && a.timestamp < end));
    }

    return result;
  }

  private calculateChangeRate(counts: number[]): number {
    if (counts.length < 2) return 0;
    
    let totalChange = 0;
    for (let i = 1; i < counts.length; i++) {
      if (counts[i - 1] === 0) {
        totalChange += counts[i] > 0 ? 1 : 0;
      } else {
        totalChange += (counts[i] - counts[i - 1]) / counts[i - 1];
      }
    }
    
    return totalChange / (counts.length - 1);
  }

  private determineTrendDirection(changeRate: number): ContentTrend['trend'] {
    if (Math.abs(changeRate) < 0.1) return 'stable';
    if (changeRate > 0.2) return 'rising';
    if (changeRate < -0.2) return 'falling';
    return 'volatile';
  }

  private calculateTrendConfidence(counts: number[]): number {
    if (counts.length < 2) return 0;
    
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    
    // Lower variance = higher confidence
    return Math.max(0, 1 - (variance / (mean * mean)));
  }

  private predictNextAccessCount(counts: number[]): number {
    if (counts.length < 2) return counts[counts.length - 1] || 0;
    
    // Simple linear prediction
    const lastTwo = counts.slice(-2);
    const trend = lastTwo[1] - lastTwo[0];
    return Math.max(0, lastTwo[1] + trend);
  }

  // Periodic analysis
  private startPeriodicAnalysis(): void {
    if (typeof window === 'undefined') return;

    this.updateTimer = setInterval(() => {
      this.updateAllPopularityMetrics();
      this.updateTrendAnalysis();
      this.persistData();
      
      this.emit('periodic-analysis-completed', {
        timestamp: Date.now(),
        contentCount: this.popularityCache.size,
        trendingCount: Array.from(this.popularityCache.values()).filter(c => c.trending).length
      });
    }, this.config.updateInterval * 60 * 1000);
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
        console.error('Popular content detector event listener error:', error);
      }
    });
  }

  // Data persistence
  private persistData(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        accessHistory: Object.fromEntries(
          Array.from(this.accessHistory.entries()).map(([key, value]) => [
            key, 
            value.slice(-100) // Keep last 100 accesses per resource
          ])
        ),
        popularityCache: Object.fromEntries(this.popularityCache),
        trendData: Object.fromEntries(this.trendData),
        lastUpdate: this.lastUpdate
      };
      localStorage.setItem('popular-content-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist popular content data:', error);
    }
  }

  private loadPersistedData(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('popular-content-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.accessHistory = new Map(Object.entries(data.accessHistory || {}));
        this.popularityCache = new Map(Object.entries(data.popularityCache || {}));
        this.trendData = new Map(Object.entries(data.trendData || {}));
        this.lastUpdate = data.lastUpdate || 0;
      }
    } catch (error) {
      console.warn('Failed to load persisted popular content data:', error);
    }
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.accessHistory.clear();
    this.popularityCache.clear();
    this.trendData.clear();
    this.lastUpdate = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('popular-content-data');
    }

    this.emit('data-cleared', {});
  }

  /**
   * Get detector statistics
   */
  getStatistics(): {
    totalResources: number;
    trackedResources: number;
    trendingResources: number;
    lastUpdate: number;
    memoryUsage: number;
  } {
    const trendingCount = Array.from(this.popularityCache.values())
      .filter(content => content.trending).length;

    return {
      totalResources: this.accessHistory.size,
      trackedResources: this.popularityCache.size,
      trendingResources: trendingCount,
      lastUpdate: this.lastUpdate,
      memoryUsage: JSON.stringify(Object.fromEntries(this.accessHistory)).length +
                   JSON.stringify(Object.fromEntries(this.popularityCache)).length
    };
  }
}

// Global instance
export const popularContentDetector = new PopularContentDetector();