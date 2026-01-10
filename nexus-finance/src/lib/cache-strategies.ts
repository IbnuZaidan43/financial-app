'use client';

// --- Types & Interfaces ---

export type CacheStrategy = 'network-first' | 'cache-first' | 'stale-while-revalidate' | 'network-only';

export interface APICacheConfig {
  strategy: CacheStrategy;
  maxAge: number; // in milliseconds
  maxEntries: number;
  revalidateInterval?: number;
  compress?: boolean;
  encryption?: boolean;
}

// Interface ini otomatis ter-export, tidak perlu re-export di bawah
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
  lastModified?: string;
  hitCount: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  tags: string[];
}

// --- Manager Class ---

class APICacheManager {
  private cacheName = 'keuangan-api-cache-v2';
  private config: Map<string, APICacheConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Critical financial data
    this.config.set('/api/transaksi', {
      strategy: 'network-first',
      maxAge: 2 * 60 * 1000,
      maxEntries: 100,
      revalidateInterval: 30 * 1000,
      compress: true
    });

    this.config.set('/api/tabungan', {
      strategy: 'network-first',
      maxAge: 5 * 60 * 1000,
      maxEntries: 50,
      revalidateInterval: 60 * 1000,
      compress: true
    });

    // Reference data
    this.config.set('/api/kategori', {
      strategy: 'cache-first',
      maxAge: 30 * 60 * 1000,
      maxEntries: 20,
      compress: true
    });

    // Statistics
    this.config.set('/api/statistik', {
      strategy: 'stale-while-revalidate',
      maxAge: 10 * 60 * 1000,
      maxEntries: 10,
      revalidateInterval: 2 * 60 * 1000,
      compress: true
    });

    // User data
    this.config.set('/api/user', {
      strategy: 'network-only',
      maxAge: 0,
      maxEntries: 0
    });
  }

  generateCacheKey(url: string, options?: RequestInit): string {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    let key = `${options?.method || 'GET'}:${urlObj.pathname}`;
    
    if (urlObj.search) key += urlObj.search;
    
    if (options?.body && typeof options.body === 'string') {
      key += `:body:${this.simpleHash(options.body)}`;
    }
    
    if (options?.headers) {
      const headers = new Headers(options.headers);
      const relevantHeaders = ['authorization', 'accept-language'];
      const headerValues = relevantHeaders
        .filter(h => headers.get(h))
        .map(h => `${h}:${headers.get(h)}`)
        .join(',');
      
      if (headerValues) {
        key += `:headers:${this.simpleHash(headerValues)}`;
      }
    }
    
    return key;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getConfig(url: string): APICacheConfig {
    try {
      const pathname = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
      
      for (const [pattern, config] of this.config.entries()) {
        if (pathname === pattern || pathname.startsWith(pattern)) {
          return config;
        }
      }
    } catch (e) {
      // fallback if URL is invalid
    }

    return {
      strategy: 'network-first',
      maxAge: 5 * 60 * 1000,
      maxEntries: 50,
      compress: true
    };
  }

  async cacheResponse(key: string, response: Response, config: APICacheConfig): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      const responseToCache = response.clone();
      const now = Date.now();
      
      const metadata: CacheEntry = {
        data: null,
        timestamp: now,
        expiresAt: now + config.maxAge,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        hitCount: 0,
        size: 0, 
        compressed: config.compress || false,
        encrypted: config.encryption || false,
        tags: this.extractTagsFromURL(key)
      };

      const cacheRequest = new Request(key, {
        method: 'GET',
        headers: { 'x-cache-metadata': 'true' }
      });
      
      await cache.put(cacheRequest, responseToCache);
      await this.storeMetadata(key, metadata);
      
      console.log('🔧 API Cache: Cached response for', key);
    } catch (error) {
      console.warn('🔧 API Cache: Failed to cache response', error);
    }
  }

  async getCachedResponse(key: string): Promise<{ response: Response; metadata: CacheEntry } | null> {
    try {
      const cache = await caches.open(this.cacheName);
      const cacheRequest = new Request(key, {
        method: 'GET',
        headers: { 'x-cache-metadata': 'true' }
      });
      
      const cachedResponse = await cache.match(cacheRequest);
      if (!cachedResponse) return null;

      const metadata = await this.getMetadata(key);
      if (!metadata) return null;

      if (Date.now() > metadata.expiresAt) {
        await this.removeCachedResponse(key);
        return null;
      }

      metadata.hitCount++;
      await this.storeMetadata(key, metadata);

      return { response: cachedResponse, metadata };
    } catch (error) {
      console.warn('🔧 API Cache: Failed to get cached response', error);
      return null;
    }
  }

  private async storeMetadata(key: string, metadata: CacheEntry): Promise<void> {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      store.put({ key, metadata });
    } catch (error) {
      console.warn('🔧 API Cache: Failed to store metadata', error);
    }
  }

  private async getMetadata(key: string): Promise<CacheEntry | null> {
    try {
      const db = await this.getIndexedDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.metadata || null);
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      return null;
    }
  }

  private async getIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('api-cache-db', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async removeCachedResponse(key: string): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      const cacheRequest = new Request(key, {
        method: 'GET',
        headers: { 'x-cache-metadata': 'true' }
      });
      
      await cache.delete(cacheRequest);
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['metadata'], 'readwrite');
      transaction.objectStore('metadata').delete(key);
    } catch (error) {
      console.warn('🔧 API Cache: Failed to remove cached response', error);
    }
  }

  private extractTagsFromURL(key: string): string[] {
    const tags: string[] = [];
    try {
      const urlPart = key.includes(':') ? key.split(':').slice(1).join(':') : key;
      const url = new URL(urlPart, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      
      tags.push(url.pathname.replace(/^\//, ''));
      if (key.startsWith('POST:')) tags.push('post');
      if (key.startsWith('GET:')) tags.push('get');
      if (url.searchParams.has('month')) tags.push('monthly');
      if (url.searchParams.has('year')) tags.push('yearly');
    } catch (e) {}
    return tags;
  }

  async clearCacheByTags(tags: string[]): Promise<void> {
    try {
      const db = await this.getIndexedDB();
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      
      const allEntries: any[] = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
      });

      for (const entry of allEntries) {
        if (entry.metadata.tags.some((tag: string) => tags.includes(tag))) {
          await this.removeCachedResponse(entry.key);
        }
      }
    } catch (error) {
      console.warn('🔧 API Cache: Failed to clear cache by tags', error);
    }
  }

  async getCacheStats(): Promise<any> {
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      const db = await this.getIndexedDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const allMetadata = getAllRequest.result;
          const stats = {
            totalEntries: keys.length,
            totalSize: 0,
            hitCounts: 0,
            expiredEntries: 0,
            tagStats: {} as Record<string, number>
          };

          const now = Date.now();
          for (const entry of allMetadata) {
            const m = entry.metadata;
            stats.hitCounts += m.hitCount;
            if (now > m.expiresAt) stats.expiredEntries++;
            m.tags.forEach((tag: string) => {
              stats.tagStats[tag] = (stats.tagStats[tag] || 0) + 1;
            });
          }
          resolve(stats);
        };
      });
    } catch (error) {
      return null;
    }
  }

  async validateResponse(response: Response, _metadata: CacheEntry): Promise<boolean> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) return false;
      
      const clonedResponse = response.clone();
      const text = await clonedResponse.text();
      if (!text) return false;
      
      JSON.parse(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  public getConfigForEndpoint(url: string): APICacheConfig {
    return this.getConfig(url);
  }

  public async validateResponsePublic(response: Response, metadata: CacheEntry): Promise<boolean> {
    return this.validateResponse(response, metadata);
  }
}

// --- Exports ---

export const apiCacheManager = new APICacheManager();
// Tidak perlu export type { CacheEntry } lagi karena sudah di-export di atas.