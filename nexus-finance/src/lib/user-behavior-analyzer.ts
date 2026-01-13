/**
 * User Behavior Analysis Engine
 * 
 * Analyzes user patterns to predict cache warming needs
 */

'use client';

export interface UserBehaviorPattern {
  userId: string;
  sessionId: string;
  timestamp: number;
  action: 'view' | 'click' | 'search' | 'navigate' | 'idle';
  resource: string;
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    deviceType: string;
    connectionType: string;
    previousAction?: string;
    sessionDuration: number;
  };
  metadata?: Record<string, any>;
}

export interface BehaviorMetrics {
  totalActions: number;
  uniqueResources: number;
  averageSessionDuration: number;
  mostActiveHour: number;
  mostActiveDay: number;
  topResources: Array<{
    resource: string;
    frequency: number;
    lastAccessed: number;
    priority: number;
  }>;
  patterns: Array<{
    sequence: string[];
    frequency: number;
    confidence: number;
  }>;
  predictions: Array<{
    resource: string;
    probability: number;
    reason: string;
    suggestedPriority: number;
  }>;
}

export interface BehaviorAnalysisConfig {
  maxHistorySize: number;
  analysisWindow: number; // in hours
  minPatternLength: number;
  confidenceThreshold: number;
  predictionHorizon: number; // in minutes
  enableRealTimeAnalysis: boolean;
  enablePredictiveCaching: boolean;
}

export class UserBehaviorAnalyzer {
  private config: BehaviorAnalysisConfig;
  private behaviorHistory: UserBehaviorPattern[] = [];
  private resourceFrequency: Map<string, number> = new Map();
  private patternCache: Map<string, any> = new Map();
  private lastAnalysis: number = 0;
  private listeners: Array<(event: string, data: any) => void> = [];

  constructor(config: Partial<BehaviorAnalysisConfig> = {}) {
    this.config = {
      maxHistorySize: 10000,
      analysisWindow: 24, // 24 hours
      minPatternLength: 3,
      confidenceThreshold: 0.7,
      predictionHorizon: 30, // 30 minutes
      enableRealTimeAnalysis: true,
      enablePredictiveCaching: true,
      ...config
    };

    this.loadPersistedData();
    this.startPeriodicAnalysis();
  }

  /**
   * Record user behavior
   */
  recordBehavior(
    userId: string,
    action: UserBehaviorPattern['action'],
    resource: string,
    metadata?: Record<string, any>
  ): void {
    const pattern: UserBehaviorPattern = {
      userId,
      sessionId: this.getSessionId(),
      timestamp: Date.now(),
      action,
      resource,
      context: this.buildContext(),
      metadata
    };

    this.addBehaviorPattern(pattern);
    this.updateResourceFrequency(resource);
    
    if (this.config.enableRealTimeAnalysis) {
      this.performRealTimeAnalysis(pattern);
    }

    this.emit('behavior-recorded', pattern);
  }

  /**
   * Get behavior metrics
   */
  getBehaviorMetrics(userId?: string): BehaviorMetrics {
    const patterns = userId 
      ? this.behaviorHistory.filter(p => p.userId === userId)
      : this.behaviorHistory;

    const recentPatterns = this.getRecentPatterns(patterns);
    const topResources = this.getTopResources(recentPatterns);
    const detectedPatterns = this.detectPatterns(recentPatterns);
    const predictions = this.generatePredictions(recentPatterns, topResources);

    return {
      totalActions: recentPatterns.length,
      uniqueResources: this.resourceFrequency.size,
      averageSessionDuration: this.calculateAverageSessionDuration(recentPatterns),
      mostActiveHour: this.getMostActiveHour(recentPatterns),
      mostActiveDay: this.getMostActiveDay(recentPatterns),
      topResources,
      patterns: detectedPatterns,
      predictions
    };
  }

  /**
   * Get cache warming recommendations
   */
  getCacheWarmingRecommendations(userId?: string): Array<{
    resource: string;
    priority: number;
    reason: string;
    confidence: number;
    estimatedBenefit: number;
  }> {
    const metrics = this.getBehaviorMetrics(userId);
    const recommendations: Array<{
      resource: string;
      priority: number;
      reason: string;
      confidence: number;
      estimatedBenefit: number;
    }> = [];

    // Add high-frequency resources
    metrics.topResources.forEach(resource => {
      if (resource.frequency >= 5 && resource.priority >= 0.7) {
        recommendations.push({
          resource: resource.resource,
          priority: resource.priority,
          reason: `High frequency access (${resource.frequency} times)`,
          confidence: Math.min(resource.frequency / 10, 1),
          estimatedBenefit: resource.frequency * resource.priority
        });
      }
    });

    // Add predicted resources
    metrics.predictions.forEach(prediction => {
      if (prediction.probability >= this.config.confidenceThreshold) {
        recommendations.push({
          resource: prediction.resource,
          priority: prediction.suggestedPriority,
          reason: prediction.reason,
          confidence: prediction.probability,
          estimatedBenefit: prediction.probability * prediction.suggestedPriority
        });
      }
    });

    // Add pattern-based recommendations
    metrics.patterns.forEach(pattern => {
      if (pattern.confidence >= this.config.confidenceThreshold) {
        const nextResource = this.getNextResourceInPattern(pattern.sequence);
        if (nextResource) {
          recommendations.push({
            resource: nextResource,
            priority: pattern.confidence,
            reason: `Predicted next in pattern: ${pattern.sequence.join(' → ')} → ${nextResource}`,
            confidence: pattern.confidence,
            estimatedBenefit: pattern.confidence * pattern.frequency
          });
        }
      }
    });

    // Sort by estimated benefit
    return recommendations.sort((a, b) => b.estimatedBenefit - a.estimatedBenefit);
  }

  /**
   * Add behavior pattern to history
   */
  private addBehaviorPattern(pattern: UserBehaviorPattern): void {
    this.behaviorHistory.push(pattern);
    
    // Maintain history size
    if (this.behaviorHistory.length > this.config.maxHistorySize) {
      this.behaviorHistory = this.behaviorHistory.slice(-this.config.maxHistorySize);
    }

    this.persistData();
  }

  /**
   * Update resource frequency
   */
  private updateResourceFrequency(resource: string): void {
    const current = this.resourceFrequency.get(resource) || 0;
    this.resourceFrequency.set(resource, current + 1);
  }

  /**
   * Build context information
   */
  private buildContext(): UserBehaviorPattern['context'] {
    const now = new Date();
    return {
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      deviceType: this.getDeviceType(),
      connectionType: this.getConnectionType(),
      sessionDuration: this.getSessionDuration(),
      previousAction: this.getPreviousAction()
    };
  }

  /**
   * Get recent patterns within analysis window
   */
  private getRecentPatterns(patterns: UserBehaviorPattern[]): UserBehaviorPattern[] {
    const cutoff = Date.now() - (this.config.analysisWindow * 60 * 60 * 1000);
    return patterns.filter(p => p.timestamp >= cutoff);
  }

  /**
   * Get top resources by frequency and recency
   */
  private getTopResources(patterns: UserBehaviorPattern[]): BehaviorMetrics['topResources'] {
    const resourceStats = new Map<string, {
      frequency: number;
      lastAccessed: number;
      totalPriority: number;
    }>();

    patterns.forEach(pattern => {
      const existing = resourceStats.get(pattern.resource) || {
        frequency: 0,
        lastAccessed: 0,
        totalPriority: 0
      };

      resourceStats.set(pattern.resource, {
        frequency: existing.frequency + 1,
        lastAccessed: Math.max(existing.lastAccessed, pattern.timestamp),
        totalPriority: existing.totalPriority + this.getActionPriority(pattern.action)
      });
    });

    return Array.from(resourceStats.entries())
      .map(([resource, stats]) => ({
        resource,
        frequency: stats.frequency,
        lastAccessed: stats.lastAccessed,
        priority: stats.totalPriority / stats.frequency
      }))
      .sort((a, b) => (b.frequency * b.priority) - (a.frequency * a.priority))
      .slice(0, 20);
  }

  /**
   * Detect behavioral patterns
   */
  private detectPatterns(patterns: UserBehaviorPattern[]): BehaviorMetrics['patterns'] {
    const sequences = this.extractSequences(patterns);
    const patternStats = new Map<string, {
      sequences: string[][];
      frequency: number;
    }>();

    // Group similar sequences
    sequences.forEach(sequence => {
      const key = sequence.join('→');
      const existing = patternStats.get(key) || { sequences: [], frequency: 0 };
      existing.sequences.push(sequence);
      existing.frequency++;
      patternStats.set(key, existing);
    });

    // Calculate confidence and return top patterns
    return Array.from(patternStats.entries())
      .map(([key, stats]) => ({
        sequence: stats.sequences[0],
        frequency: stats.frequency,
        confidence: this.calculatePatternConfidence(stats.sequences)
      }))
      .filter(p => p.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  /**
   * Generate predictions based on patterns and trends
   */
  private generatePredictions(
    patterns: UserBehaviorPattern[],
    topResources: BehaviorMetrics['topResources']
  ): BehaviorMetrics['predictions'] {
    const predictions: BehaviorMetrics['predictions'] = [];

    // Time-based predictions
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    const timeBasedPatterns = patterns.filter(p => 
      p.context.timeOfDay === currentHour && p.context.dayOfWeek === currentDay
    );

    if (timeBasedPatterns.length > 0) {
      const timeBasedResources = this.getResourceFrequency(timeBasedPatterns);
      timeBasedResources.forEach((freq, resource) => {
        if (freq >= 3) {
          predictions.push({
            resource,
            probability: Math.min(freq / timeBasedPatterns.length, 1),
            reason: `Frequently accessed at this time (${currentHour}:00, day ${currentDay})`,
            suggestedPriority: 0.8
          });
        }
      });
    }

    // Sequential predictions
    const recentPatterns = patterns.slice(-10);
    if (recentPatterns.length >= this.config.minPatternLength) {
      const lastSequence = recentPatterns.slice(-this.config.minPatternLength).map(p => p.resource);
      const matchingPatterns = this.findMatchingPatterns(lastSequence, patterns);
      
      matchingPatterns.forEach(match => {
        const nextResource = this.getNextResourceInPattern(match.sequence);
        if (nextResource && !predictions.some(p => p.resource === nextResource)) {
          predictions.push({
            resource: nextResource,
            probability: match.confidence,
            reason: `Predicted next in sequence: ${match.sequence.join(' → ')} → ${nextResource}`,
            suggestedPriority: match.confidence * 0.9
          });
        }
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 15);
  }

  /**
   * Perform real-time analysis
   */
  private performRealTimeAnalysis(pattern: UserBehaviorPattern): void {
    // Quick analysis for immediate feedback
    const recentPatterns = this.behaviorHistory.slice(-50);
    const similarPatterns = recentPatterns.filter(p => 
      p.resource === pattern.resource && 
      Math.abs(p.timestamp - pattern.timestamp) < 60000 // Within 1 minute
    );

    if (similarPatterns.length >= 3) {
      this.emit('pattern-detected', {
        resource: pattern.resource,
        pattern: similarPatterns,
        confidence: similarPatterns.length / 10
      });
    }
  }

  /**
   * Helper methods
   */
  private getActionPriority(action: UserBehaviorPattern['action']): number {
    const priorities = {
      'view': 0.5,
      'click': 0.8,
      'search': 0.9,
      'navigate': 0.7,
      'idle': 0.1
    };
    return priorities[action] || 0.5;
  }

  private extractSequences(patterns: UserBehaviorPattern[]): string[][] {
    const sequences: string[][] = [];
    const windowSize = this.config.minPatternLength;

    for (let i = 0; i <= patterns.length - windowSize; i++) {
      const sequence = patterns.slice(i, i + windowSize).map(p => p.resource);
      sequences.push(sequence);
    }

    return sequences;
  }

  private calculatePatternConfidence(sequences: string[][]): number {
    if (sequences.length <= 1) return 0;
    
    // Calculate consistency of the pattern
    const firstSequence = sequences[0];
    let matches = 0;
    
    sequences.forEach(sequence => {
      if (JSON.stringify(sequence) === JSON.stringify(firstSequence)) {
        matches++;
      }
    });

    return matches / sequences.length;
  }

  private getNextResourceInPattern(sequence: string[]): string | null {
    // This is a simplified implementation
    // In practice, you'd use more sophisticated pattern matching
    return sequence.length > 0 ? sequence[sequence.length - 1] : null;
  }

  private findMatchingPatterns(targetSequence: string[], allPatterns: UserBehaviorPattern[]): Array<{
    sequence: string[];
    confidence: number;
  }> {
    // Simplified pattern matching
    const matches: Array<{ sequence: string[]; confidence: number }> = [];
    
    for (let i = 0; i <= allPatterns.length - targetSequence.length; i++) {
      const sequence = allPatterns.slice(i, i + targetSequence.length).map(p => p.resource);
      const similarity = this.calculateSequenceSimilarity(targetSequence, sequence);
      
      if (similarity >= 0.7) {
        matches.push({
          sequence,
          confidence: similarity
        });
      }
    }

    return matches;
  }

  private calculateSequenceSimilarity(seq1: string[], seq2: string[]): number {
    if (seq1.length !== seq2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i] === seq2[i]) matches++;
    }

    return matches / seq1.length;
  }

  private getResourceFrequency(patterns: UserBehaviorPattern[]): Map<string, number> {
    const frequency = new Map<string, number>();
    patterns.forEach(pattern => {
      const current = frequency.get(pattern.resource) || 0;
      frequency.set(pattern.resource, current + 1);
    });
    return frequency;
  }

  private calculateAverageSessionDuration(patterns: UserBehaviorPattern[]): number {
    const sessionDurations = new Map<string, number>();
    
    patterns.forEach(pattern => {
      const current = sessionDurations.get(pattern.sessionId) || 0;
      sessionDurations.set(pattern.sessionId, Math.max(current, pattern.context.sessionDuration));
    });

    const durations = Array.from(sessionDurations.values());
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  private getMostActiveHour(patterns: UserBehaviorPattern[]): number {
    const hourFrequency = new Map<number, number>();
    patterns.forEach(pattern => {
      const hour = pattern.context.timeOfDay;
      hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1);
    });

    let maxHour = 0;
    let maxFrequency = 0;
    hourFrequency.forEach((freq, hour) => {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        maxHour = hour;
      }
    });

    return maxHour;
  }

  private getMostActiveDay(patterns: UserBehaviorPattern[]): number {
    const dayFrequency = new Map<number, number>();
    patterns.forEach(pattern => {
      const day = pattern.context.dayOfWeek;
      dayFrequency.set(day, (dayFrequency.get(day) || 0) + 1);
    });

    let maxDay = 0;
    let maxFrequency = 0;
    dayFrequency.forEach((freq, day) => {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        maxDay = day;
      }
    });

    return maxDay;
  }

  // Device and context detection
  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile')) return 'mobile';
    if (userAgent.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return 'unknown';
    }
    
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem('behavior-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('behavior-session-id', sessionId);
    }
    return sessionId;
  }

  private getSessionDuration(): number {
    if (typeof window === 'undefined') return 0;
    
    const sessionStart = sessionStorage.getItem('session-start');
    if (!sessionStart) {
      sessionStorage.setItem('session-start', Date.now().toString());
      return 0;
    }
    
    return Date.now() - parseInt(sessionStart);
  }

  private getPreviousAction(): string | undefined {
    if (this.behaviorHistory.length === 0) return undefined;
    return this.behaviorHistory[this.behaviorHistory.length - 1].action;
  }

  // Periodic analysis
  private startPeriodicAnalysis(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      this.performFullAnalysis();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private performFullAnalysis(): void {
    const metrics = this.getBehaviorMetrics();
    this.lastAnalysis = Date.now();
    this.emit('analysis-completed', metrics);
  }

  // Event handling
  public on(event: string, listener: (event: string, data: any) => void): void {
    this.listeners.push(listener);
  }

  public off(event: string, listener: (event: string, data: any) => void): void {
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
        console.error('Behavior analyzer event listener error:', error);
      }
    });
  }

  // Data persistence
  private persistData(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        behaviorHistory: this.behaviorHistory.slice(-1000), // Keep last 1000
        resourceFrequency: Object.fromEntries(this.resourceFrequency),
        lastAnalysis: this.lastAnalysis
      };
      localStorage.setItem('user-behavior-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist behavior data:', error);
    }
  }

  private loadPersistedData(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('user-behavior-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.behaviorHistory = data.behaviorHistory || [];
        this.resourceFrequency = new Map(Object.entries(data.resourceFrequency || {}));
        this.lastAnalysis = data.lastAnalysis || 0;
      }
    } catch (error) {
      console.warn('Failed to load persisted behavior data:', error);
    }
  }

  /**
   * Clear all behavior data
   */
  clearData(): void {
    this.behaviorHistory = [];
    this.resourceFrequency.clear();
    this.patternCache.clear();
    this.lastAnalysis = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user-behavior-data');
      sessionStorage.removeItem('behavior-session-id');
      sessionStorage.removeItem('session-start');
    }

    this.emit('data-cleared', {});
  }

  /**
   * Get analyzer statistics
   */
  getStatistics(): {
    totalPatterns: number;
    uniqueResources: number;
    lastAnalysis: number;
    memoryUsage: number;
  } {
    return {
      totalPatterns: this.behaviorHistory.length,
      uniqueResources: this.resourceFrequency.size,
      lastAnalysis: this.lastAnalysis,
      memoryUsage: JSON.stringify(this.behaviorHistory).length + 
                   JSON.stringify(Object.fromEntries(this.resourceFrequency)).length
    };
  }
}

// Global instance
export const userBehaviorAnalyzer = new UserBehaviorAnalyzer();