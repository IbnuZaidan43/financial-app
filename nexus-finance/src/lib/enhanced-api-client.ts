'use client';

import { apiCacheManager, type CacheStrategy, type APICacheConfig } from './cache-strategies';

// --- Interfaces ---
// Kata kunci 'export' di sini sudah cukup, tidak perlu diekspor lagi di bawah.
export interface APIOptions extends RequestInit {
  cacheStrategy?: CacheStrategy;
  maxAge?: number;
  tags?: string[];
  backgroundRevalidate?: boolean;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface APIResponse<T = any> {
  data: T;
  cached: boolean;
  timestamp: number;
  fromCache: boolean;
  etag?: string;
  lastModified?: string;
}

interface RetryConfig {
  maxRetries: number;
  delay: number;
  backoff: boolean;
}

// --- Enhanced API Client ---
class EnhancedAPIClient {
  private baseURL: string;
  private defaultTimeout: number = 10000;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    delay: 1000,
    backoff: true
  };

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  async request<T = any>(
    endpoint: string, 
    options: APIOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      cacheStrategy,
      maxAge,
      tags,
      backgroundRevalidate = true,
      retryCount = 3,
      retryDelay = 1000,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options;

    const url = this.buildURL(endpoint);
    const cacheKey = apiCacheManager.generateCacheKey(url, fetchOptions);
    const config = apiCacheManager.getConfigForEndpoint(url);

    const finalConfig: APICacheConfig = {
      ...config,
      strategy: cacheStrategy || config.strategy,
      maxAge: maxAge || config.maxAge
    };

    try {
      switch (finalConfig.strategy) {
        case 'cache-first':
          return await this.cacheFirstRequest<T>(url, cacheKey, finalConfig, fetchOptions);
        case 'network-first':
          return await this.networkFirstRequest<T>(url, cacheKey, finalConfig, fetchOptions);
        case 'stale-while-revalidate':
          return await this.staleWhileRevalidateRequest<T>(
            url, 
            cacheKey, 
            finalConfig, 
            fetchOptions, 
            backgroundRevalidate
          );
        case 'network-only':
        default:
          return await this.networkOnlyRequest<T>(url, fetchOptions, { maxRetries: retryCount, delay: retryDelay });
      }
    } catch (error) {
      console.error('🔧 API Client: Request failed', error);
      throw error;
    }
  }

  private async cacheFirstRequest<T>(
    url: string, 
    cacheKey: string, 
    config: APICacheConfig, 
    options: RequestInit
  ): Promise<APIResponse<T>> {
    const cached = await apiCacheManager.getCachedResponse(cacheKey);
    
    if (cached) {
      const isValid = await apiCacheManager.validateResponsePublic(cached.response, cached.metadata);
      if (isValid) {
        if (config.revalidateInterval) {
          this.backgroundRevalidate(url, cacheKey, config, options);
        }
        return {
          data: await cached.response.json(),
          cached: true,
          timestamp: cached.metadata.timestamp,
          fromCache: true,
          etag: cached.metadata.etag,
          lastModified: cached.metadata.lastModified
        };
      }
      await apiCacheManager.removeCachedResponse(cacheKey);
    }

    return await this.fetchAndCache<T>(url, cacheKey, config, options);
  }

  private async networkFirstRequest<T>(
    url: string, 
    cacheKey: string, 
    config: APICacheConfig, 
    options: RequestInit
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.fetchWithTimeout(url, options);
      if (response.ok) {
        await apiCacheManager.cacheResponse(cacheKey, response, config);
        return {
          data: await response.json(),
          cached: false,
          timestamp: Date.now(),
          fromCache: false,
          etag: response.headers.get('etag') || undefined,
          lastModified: response.headers.get('last-modified') || undefined
        };
      }
      throw new Error(`Network request failed: ${response.status}`);
    } catch (error) {
      const cached = await apiCacheManager.getCachedResponse(cacheKey);
      if (cached) {
        const isValid = await apiCacheManager.validateResponsePublic(cached.response, cached.metadata);
        if (isValid) {
          return {
            data: await cached.response.json(),
            cached: true,
            timestamp: cached.metadata.timestamp,
            fromCache: true,
            etag: cached.metadata.etag,
            lastModified: cached.metadata.lastModified
          };
        }
      }
      throw error;
    }
  }

  private async staleWhileRevalidateRequest<T>(
    url: string, 
    cacheKey: string, 
    config: APICacheConfig, 
    options: RequestInit, 
    backgroundRevalidate: boolean
  ): Promise<APIResponse<T>> {
    const cached = await apiCacheManager.getCachedResponse(cacheKey);
    if (cached) {
      const isValid = await apiCacheManager.validateResponsePublic(cached.response, cached.metadata);
      if (isValid) {
        if (backgroundRevalidate) {
          this.backgroundRevalidate(url, cacheKey, config, options);
        }
        return {
          data: await cached.response.json(),
          cached: true,
          timestamp: cached.metadata.timestamp,
          fromCache: true,
          etag: cached.metadata.etag,
          lastModified: cached.metadata.lastModified
        };
      }
    }
    return await this.fetchAndCache<T>(url, cacheKey, config, options);
  }

  private async networkOnlyRequest<T>(
    url: string, 
    options: RequestInit, 
    retryConfig: { maxRetries: number; delay: number }
  ): Promise<APIResponse<T>> {
    const response = await this.fetchWithRetry(url, options, retryConfig);
    return {
      data: await response.json(),
      cached: false,
      timestamp: Date.now(),
      fromCache: false,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined
    };
  }

  private async fetchAndCache<T>(
    url: string, 
    cacheKey: string, 
    config: APICacheConfig, 
    options: RequestInit
  ): Promise<APIResponse<T>> {
    const response = await this.fetchWithTimeout(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    await apiCacheManager.cacheResponse(cacheKey, response, config);
    
    return {
      data: await response.json(),
      cached: false,
      timestamp: Date.now(),
      fromCache: false,
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined
    };
  }

  private async backgroundRevalidate(
    url: string, 
    cacheKey: string, 
    config: APICacheConfig, 
    options: RequestInit
  ): Promise<void> {
    try {
      const revalidateOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };

      const response = await this.fetchWithTimeout(url, revalidateOptions);
      if (response.ok) {
        const cached = await apiCacheManager.getCachedResponse(cacheKey);
        const newETag = response.headers.get('etag');
        const newLM = response.headers.get('last-modified');
        
        const hasChanged = !cached || 
          (newETag && newETag !== cached.metadata.etag) ||
          (newLM && newLM !== cached.metadata.lastModified) ||
          (!newETag && !newLM);

        if (hasChanged) {
          await apiCacheManager.cacheResponse(cacheKey, response, config);
        }
      }
    } catch (e) {
      // Background revalidation failures are silent
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.defaultTimeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  private async fetchWithRetry(
    url: string, 
    options: RequestInit, 
    retryConfig: { maxRetries: number; delay: number }
  ): Promise<Response> {
    let lastErr: any;
    for (let i = 0; i <= retryConfig.maxRetries; i++) {
      try {
        return await this.fetchWithTimeout(url, options);
      } catch (err) {
        lastErr = err;
        if (i < retryConfig.maxRetries) {
          await new Promise(r => setTimeout(r, retryConfig.delay * Math.pow(2, i)));
        }
      }
    }
    throw lastErr;
  }

  private buildURL(endpoint: string): string {
    if (endpoint.startsWith('http')) return endpoint;
    const base = this.baseURL.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  // Helper Methods
  async get<T = any>(endpoint: string, options: APIOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options: APIOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }

  async put<T = any>(endpoint: string, data?: any, options: APIOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }

  async delete<T = any>(endpoint: string, options: APIOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async clearCache(tags?: string[]) {
    if (tags) {
      await apiCacheManager.clearCacheByTags(tags);
    } else {
      const cache = await caches.open('keuangan-api-cache-v2');
      const keys = await cache.keys();
      await Promise.all(keys.map(k => cache.delete(k)));
    }
  }
}

// --- Singleton Export ---
export const apiClient = new EnhancedAPIClient();