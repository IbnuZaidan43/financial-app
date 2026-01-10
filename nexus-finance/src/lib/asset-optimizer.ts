'use client';

// --- Asset optimization types ---
// Keyword 'export' di sini sudah cukup, jangan di-export ulang di bawah.
export interface AssetConfig {
  priority: 'critical' | 'high' | 'normal' | 'low';
  preload: boolean;
  compress: boolean;
  format: 'auto' | 'webp' | 'avif' | 'original';
  lazy: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxAge: number;
}

export interface AssetMetadata {
  url: string;
  type: 'image' | 'script' | 'style' | 'font' | 'video' | 'audio';
  size: number;
  format: string;
  compressed: boolean;
  priority: AssetConfig['priority'];
  loadTime: number;
  cached: boolean;
  lastAccessed: number;
  accessCount: number;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  loadTimeImprovement: number;
  format: string;
  cached: boolean;
}

// --- Asset optimization manager ---
class AssetOptimizer {
  private cacheName = 'keuangan-assets-v2';
  private config: Map<string, AssetConfig> = new Map();
  private metadata: Map<string, AssetMetadata> = new Map();
  private supportedFormats: string[] = [];

  constructor() {
    this.initializeConfig();
    this.detectSupportedFormats();
  }

  private initializeConfig() {
    this.config.set('/app-icons/icon-192x192.png', {
      priority: 'critical', preload: true, compress: true, format: 'auto', lazy: false,
      cacheStrategy: 'cache-first', maxAge: 365 * 24 * 60 * 60 * 1000
    });

    this.config.set('/app-icons/icon-512x512.png', {
      priority: 'critical', preload: true, compress: true, format: 'auto', lazy: false,
      cacheStrategy: 'cache-first', maxAge: 365 * 24 * 60 * 60 * 1000
    });

    this.config.set('/manifest.json', {
      priority: 'high', preload: true, compress: true, format: 'original', lazy: false,
      cacheStrategy: 'cache-first', maxAge: 30 * 24 * 60 * 60 * 1000
    });
  }

  private async detectSupportedFormats() {
    if (typeof window === 'undefined') return;
    const formats = ['webp', 'avif'];
    this.supportedFormats = [];

    for (const format of formats) {
      try {
        const support = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = `data:image/${format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
        });
        if (support) this.supportedFormats.push(format);
      } catch (e) {}
    }
  }

  private getAssetConfig(url: string): AssetConfig {
    if (this.config.has(url)) return this.config.get(url)!;

    for (const [pattern, config] of this.config.entries()) {
      if (url.includes(pattern) || pattern.includes('*')) return config;
    }

    const type = this.getAssetType(url);
    switch (type) {
      case 'image':
        return { priority: 'normal', preload: false, compress: true, format: 'auto', lazy: true, cacheStrategy: 'cache-first', maxAge: 7 * 24 * 60 * 60 * 1000 };
      case 'font':
        return { priority: 'critical', preload: true, compress: true, format: 'original', lazy: false, cacheStrategy: 'cache-first', maxAge: 365 * 24 * 60 * 60 * 1000 };
      default:
        return { priority: 'normal', preload: false, compress: false, format: 'original', lazy: true, cacheStrategy: 'cache-first', maxAge: 7 * 24 * 60 * 60 * 1000 };
    }
  }

  private getFileExtension(url: string): string {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const pathname = new URL(url, origin).pathname;
      const lastDot = pathname.lastIndexOf('.');
      return lastDot !== -1 ? pathname.substring(lastDot + 1).toLowerCase() : '';
    } catch {
      return '';
    }
  }

  private getAssetType(url: string): AssetMetadata['type'] {
    const ext = this.getFileExtension(url);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'ico'].includes(ext)) return 'image';
    if (['js', 'mjs'].includes(ext)) return 'script';
    if (['css', 'scss', 'sass'].includes(ext)) return 'style';
    if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) return 'font';
    return 'image';
  }

  private async optimizeImageFormat(url: string, config: AssetConfig): Promise<string> {
    if (config.format === 'original' || this.getAssetType(url) !== 'image') return url;
    return url; // Logika placeholder sesuai permintaan
  }

  private async compressAsset(_url: string, response: Response, _config: AssetConfig): Promise<Response> {
    return response; // Logika placeholder sesuai permintaan
  }

  async preloadCriticalAssets(): Promise<void> {
    if (typeof window === 'undefined') return;
    const criticalAssets = Array.from(this.config.entries())
      .filter(([_, config]) => config.priority === 'critical' && config.preload)
      .map(([url]) => url);

    for (const url of criticalAssets) {
      try {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        const type = this.getAssetType(url);
        if (type === 'font') link.type = 'font/woff2';
        link.as = type === 'style' ? 'style' : type === 'script' ? 'script' : type === 'font' ? 'font' : 'image';
        document.head.appendChild(link);
      } catch (e) {}
    }
  }

  async optimizeAsset(url: string): Promise<OptimizationResult> {
    const startTime = Date.now();
    const config = this.getAssetConfig(url);
    
    try {
      const cachedResponse = await this.getCachedAsset(url);
      const existingMetadata = this.metadata.get(url);

      if (cachedResponse && existingMetadata) {
        existingMetadata.lastAccessed = Date.now();
        existingMetadata.accessCount++;
        existingMetadata.cached = true;

        return {
          originalSize: existingMetadata.size,
          optimizedSize: existingMetadata.size,
          compressionRatio: 0,
          loadTimeImprovement: Date.now() - startTime,
          format: existingMetadata.format,
          cached: true
        };
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const originalBlob = await response.clone().blob();
      const originalSize = originalBlob.size;

      const optimizedUrl = await this.optimizeImageFormat(url, config);
      const optimizedResponse = await this.compressAsset(url, response, config);
      const optimizedBlob = await optimizedResponse.clone().blob();
      const optimizedSize = optimizedBlob.size;

      await this.cacheAsset(url, optimizedResponse.clone(), config);

      const metadata: AssetMetadata = {
        url,
        type: this.getAssetType(url),
        size: optimizedSize,
        format: this.getFileExtension(optimizedUrl),
        compressed: config.compress,
        priority: config.priority,
        loadTime: Date.now() - startTime,
        cached: true,
        lastAccessed: Date.now(),
        accessCount: 1
      };

      this.metadata.set(url, metadata);

      return {
        originalSize,
        optimizedSize,
        compressionRatio: originalSize > 0 ? (originalSize - optimizedSize) / originalSize : 0,
        loadTimeImprovement: 0,
        format: metadata.format,
        cached: false
      };
    } catch (error) {
      console.error('Failed to optimize asset:', url, error);
      throw error;
    }
  }

  private async cacheAsset(url: string, response: Response, _config: AssetConfig): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      await cache.put(url, response);
    } catch (e) {}
  }

  private async getCachedAsset(url: string): Promise<Response | null> {
    try {
      const cache = await caches.open(this.cacheName);
      // Perbaikan: caches.match mengembalikan Response | undefined. 
      // Kita ubah menjadi null agar sesuai dengan return type.
      const match = await cache.match(url);
      return match || null;
    } catch (e) {
      return null;
    }
  }

  setupLazyLoading(): void {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            this.optimizeAsset(src).then(() => {
              img.src = src;
              img.classList.remove('lazy');
            }).catch(() => {
              img.src = src;
            });
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '50px 0px', threshold: 0.1 });

    document.querySelectorAll('img.lazy').forEach((img) => observer.observe(img));
  }

  async getOptimizationStats() {
    const assets = Array.from(this.metadata.values());
    const totalAssets = assets.length;
    const totalSize = assets.reduce((sum, a) => sum + a.size, 0);
    const cachedAssets = assets.filter(a => a.cached).length;
    
    const formatDistribution: Record<string, number> = {};
    const priorityDistribution: Record<string, number> = {};

    assets.forEach((a) => {
      formatDistribution[a.format] = (formatDistribution[a.format] || 0) + 1;
      priorityDistribution[a.priority] = (priorityDistribution[a.priority] || 0) + 1;
    });

    return {
      totalAssets,
      totalSize,
      compressionSavings: 0,
      cacheHitRate: totalAssets > 0 ? cachedAssets / totalAssets : 0,
      averageLoadTime: totalAssets > 0 ? assets.reduce((s, a) => s + a.loadTime, 0) / totalAssets : 0,
      formatDistribution,
      priorityDistribution
    };
  }

  async clearCache(): Promise<void> {
    try {
      await caches.delete(this.cacheName);
      this.metadata.clear();
    } catch (e) {}
  }

  async warmCache(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.optimizeAsset(url).catch(() => null));
    await Promise.allSettled(promises);
  }
}

// --- Singleton Export ---
export const assetOptimizer = new AssetOptimizer();