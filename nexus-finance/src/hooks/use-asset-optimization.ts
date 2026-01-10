'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { assetOptimizer, type AssetConfig, type OptimizationResult } from '@/lib/asset-optimizer';

// Hook state interface
interface UseAssetOptimizationState {
  stats: {
    totalAssets: number;
    totalSize: number;
    compressionSavings: number;
    cacheHitRate: number;
    averageLoadTime: number;
    formatDistribution: Record<string, number>;
    priorityDistribution: Record<string, number>;
  } | null;
  loading: boolean;
  error: string | null;
  optimizedAssets: Map<string, OptimizationResult>;
}

// Hook options
interface UseAssetOptimizationOptions {
  autoPreload?: boolean;
  autoLazyLoad?: boolean;
  statsInterval?: number;
  onAssetOptimized?: (url: string, result: OptimizationResult) => void;
  onError?: (error: string, url?: string) => void;
}

// Main asset optimization hook
export function useAssetOptimization(options: UseAssetOptimizationOptions = {}) {
  const {
    autoPreload = true,
    autoLazyLoad = true,
    statsInterval = 30000, // 30 seconds
    onAssetOptimized,
    onError
  } = options;

  const [state, setState] = useState<UseAssetOptimizationState>({
    stats: null,
    loading: false,
    error: null,
    optimizedAssets: new Map()
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Initialize asset optimization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Preload critical assets
        if (autoPreload) {
          await assetOptimizer.preloadCriticalAssets();
        }

        // Setup lazy loading
        if (autoLazyLoad) {
          assetOptimizer.setupLazyLoading();
        }

        // Get initial stats
        const stats = await assetOptimizer.getOptimizationStats();
        
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            stats,
            loading: false
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to initialize asset optimization:', error);
        
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
          }));
        }
        
        onError?.(errorMessage);
      }
    };

    initialize();

    // Setup stats polling
    if (statsInterval > 0) {
      intervalRef.current = setInterval(async () => {
        try {
          const stats = await assetOptimizer.getOptimizationStats();
          if (mountedRef.current) {
            setState(prev => ({ ...prev, stats }));
          }
        } catch (error) {
          console.warn('Failed to update optimization stats:', error);
        }
      }, statsInterval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoPreload, autoLazyLoad, statsInterval, onError]);

  // Optimize single asset
  const optimizeAsset = useCallback(async (url: string): Promise<OptimizationResult> => {
    try {
      const result = await assetOptimizer.optimizeAsset(url);
      
      if (mountedRef.current) {
        setState(prev => {
          const newOptimizedAssets = new Map(prev.optimizedAssets);
          newOptimizedAssets.set(url, result);
          return { ...prev, optimizedAssets: newOptimizedAssets };
        });
      }

      onAssetOptimized?.(url, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to optimize asset:', url, error);
      onError?.(errorMessage, url);
      throw error;
    }
  }, [onAssetOptimized, onError]);

  // Optimize multiple assets
  const optimizeAssets = useCallback(async (urls: string[]): Promise<Map<string, OptimizationResult>> => {
    const results = new Map<string, OptimizationResult>();
    
    const promises = urls.map(async (url) => {
      try {
        const result = await optimizeAsset(url);
        results.set(url, result);
      } catch (error) {
        console.warn('Failed to optimize asset:', url, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }, [optimizeAsset]);

  // Warm up cache
  const warmCache = useCallback(async (urls: string[]): Promise<void> => {
    try {
      await assetOptimizer.warmCache(urls);
      
      // Update stats after warming
      const stats = await assetOptimizer.getOptimizationStats();
      if (mountedRef.current) {
        setState(prev => ({ ...prev, stats }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to warm cache:', error);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Clear cache
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await assetOptimizer.clearCache();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          optimizedAssets: new Map(),
          stats: null
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to clear cache:', error);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Refresh stats
  const refreshStats = useCallback(async (): Promise<void> => {
    try {
      const stats = await assetOptimizer.getOptimizationStats();
      if (mountedRef.current) {
        setState(prev => ({ ...prev, stats }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to refresh stats:', error);
      onError?.(errorMessage);
    }
  }, [onError]);

  return {
    ...state,
    optimizeAsset,
    optimizeAssets,
    warmCache,
    clearCache,
    refreshStats
  };
}

// Hook for lazy loading images
export function useLazyImage(src: string, options: {
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
} = {}) {
  const { placeholder = '/images/placeholder.png', threshold = 0.1, rootMargin = '50px' } = options;
  
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!imgRef.current || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      async (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setLoading(true);
            setError(null);
            
            // Optimize and load image
            assetOptimizer.optimizeAsset(src)
              .then((result) => {
                setImageSrc(src);
                setLoaded(true);
                console.log('🖼️ Lazy loaded image:', src, result);
              })
              .catch((err) => {
                console.warn('Failed to lazy load image:', src, err);
                setImageSrc(src); // Fallback to original
                setError(err instanceof Error ? err.message : 'Failed to load image');
              })
              .finally(() => {
                setLoading(false);
              });
            
            observer.unobserve(imgRef.current!);
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, rootMargin, threshold]);

  return {
    ref: imgRef,
    src: imageSrc,
    loading,
    error,
    loaded,
    retry: () => {
      setLoading(true);
      setError(null);
      assetOptimizer.optimizeAsset(src)
        .then((result) => {
          setImageSrc(src);
          setLoaded(true);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load image');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
}

// Hook for progressive image loading
export function useProgressiveImage(src: string, options: {
  lowQualitySrc?: string;
  placeholder?: string;
} = {}) {
  const { lowQualitySrc, placeholder = '/images/placeholder.png' } = options;
  
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async (url: string, isHighQuality: boolean = false) => {
      try {
        // Optimize the image first
        await assetOptimizer.optimizeAsset(url);
        
        const img = new Image();
        img.onload = () => {
          if (isMounted) {
            setImageSrc(url);
            if (isHighQuality) {
              setLoading(false);
            }
          }
        };
        
        img.onerror = () => {
          if (isMounted && isHighQuality) {
            setError('Failed to load image');
            setLoading(false);
          }
        };
        
        img.src = url;
      } catch (err) {
        console.warn('Failed to load image:', url, err);
        if (isMounted && isHighQuality) {
          setError(err instanceof Error ? err.message : 'Failed to load image');
          setLoading(false);
        }
      }
    };

    // Load low quality first
    if (lowQualitySrc) {
      loadImage(lowQualitySrc, false);
    }

    // Load high quality
    loadImage(src, true);

    return () => {
      isMounted = false;
    };
  }, [src, lowQualitySrc]);

  return {
    src: imageSrc,
    loading,
    error,
    retry: () => {
      setLoading(true);
      setError(null);
      assetOptimizer.optimizeAsset(src)
        .then(() => {
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setLoading(false);
          };
          img.onerror = () => {
            setError('Failed to load image');
            setLoading(false);
          };
          img.src = src;
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load image');
          setLoading(false);
        });
    }
  };
}

// Hook for asset configuration
export function useAssetConfig() {
  const [configs, setConfigs] = useState<Map<string, AssetConfig>>(new Map());

  const getConfig = useCallback((url: string): AssetConfig => {
    // This would use the assetOptimizer's getAssetConfig method
    // For now, return a default config
    return {
      priority: 'normal',
      preload: false,
      compress: true,
      format: 'auto',
      lazy: true,
      cacheStrategy: 'cache-first',
      maxAge: 7 * 24 * 60 * 60 * 1000
    };
  }, []);

  const updateConfig = useCallback((url: string, config: Partial<AssetConfig>) => {
    setConfigs(prev => {
      const newConfigs = new Map(prev);
      const currentConfig = newConfigs.get(url) || getConfig(url);
      newConfigs.set(url, { ...currentConfig, ...config });
      return newConfigs;
    });
  }, [getConfig]);

  return {
    configs,
    getConfig,
    updateConfig
  };
}

// Export types
export type { UseAssetOptimizationState, UseAssetOptimizationOptions };