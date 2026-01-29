// Enhanced Cache Configuration
const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'keuangan-app';

// Cache names with versioning
const CACHE_NAMES = {
  STATIC: `${CACHE_PREFIX}-static-v${CACHE_VERSION}`,
  API: `${CACHE_PREFIX}-api-v${CACHE_VERSION}`,
  RUNTIME: `${CACHE_PREFIX}-runtime-v${CACHE_VERSION}`,
  CRITICAL: `${CACHE_PREFIX}-critical-v${CACHE_VERSION}`
};

// Cache configuration
const CACHE_CONFIG = {
  // Static assets cache (long-term)
  STATIC: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100,
    strategy: 'CACHE_FIRST'
  },
  
  // API cache (short-term)
  API: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50,
    strategy: 'NETWORK_FIRST'
  },
  
  // Runtime cache (medium-term)
  RUNTIME: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 200,
    strategy: 'STALE_WHILE_REVALIDATE'
  },
  
  // Critical resources (very long-term)
  CRITICAL: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 20,
    strategy: 'CACHE_FIRST'
  }
};

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/app/icons/icon-192x192.png',
  '/app/icons/icon-512x512.png'
];

// Static assets to cache
const STATIC_ASSETS = [
  // Images
  '/app-icons/icon-1024x1024.svg',
  '/app-icons/icon-512x512.png',
  '/screenshots/desktop.png',
  '/screenshots/mobile.jpg',
  
  // Common static files (will be dynamically added)
  '*.js',
  '*.css',
  '*.woff',
  '*.woff2',
  '*.ttf'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/transaksi',
  '/api/tabungan',
  '/api/kategori',
  '/api/statistik'
];

// Cache quotas and monitoring
const CACHE_QUOTAS = {
  maxStorage: 50 * 1024 * 1024, // 50MB
  warningThreshold: 40 * 1024 * 1024, // 40MB
  cleanupThreshold: 45 * 1024 * 1024 // 45MB
};

// Background sync queue
let syncQueue = [];

// Cache metadata storage
let cacheMetadata = new Map();

// Cache invalidation manager
let cacheInvalidationManager = {
  rules: new Map(),
  eventListeners: new Map(),
  versionHistory: new Map(),
  invalidationStats: {
    totalInvalidations: 0,
    successfulInvalidations: 0,
    failedInvalidations: 0,
    lastInvalidation: null
  },

  // Initialize default invalidation rules
  initializeRules() {
    // API responses - 5 minutes TTL
    this.addRule({
      pattern: /^\/api\//,
      config: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        timeToLive: 10 * 60 * 1000, // 10 minutes
        tags: ['api'],
        invalidateOnEvents: ['user-logout', 'data-update']
      },
      priority: 1
    });

    // Financial data - 2 minutes TTL
    this.addRule({
      pattern: /^\/api\/(financial|keuangan|transaksi|saldo|tabungan)/,
      config: {
        maxAge: 2 * 60 * 1000, // 2 minutes
        timeToLive: 5 * 60 * 1000, // 5 minutes
        tags: ['financial', 'sensitive'],
        invalidateOnEvents: ['user-logout', 'transaction-complete', 'balance-change']
      },
      priority: 10
    });

    // Static assets - 1 hour TTL
    this.addRule({
      pattern: /\.(js|css|png|jpg|jpeg|gif|webp|avif|woff|woff2|ttf|otf)$/i,
      config: {
        maxAge: 60 * 60 * 1000, // 1 hour
        timeToLive: 24 * 60 * 60 * 1000, // 24 hours
        tags: ['static'],
        versionKey: 'asset-version'
      },
      priority: 5
    });
  },

  // Add invalidation rule
  addRule(rule) {
    const ruleId = typeof rule.pattern === 'string' ? rule.pattern : rule.pattern.toString();
    this.rules.set(ruleId, rule);
  },

  // Check if cache entry should be invalidated
  shouldInvalidate(url, cacheType, metadata) {
    const sortedRules = Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesPattern(url, rule.pattern)) {
        return this.evaluateRule(url, cacheType, rule.config, metadata);
      }
    }

    return false;
  },

  // Check if URL matches pattern
  matchesPattern(url, pattern) {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    } else {
      return pattern.test(url);
    }
  },

  // Evaluate invalidation rule
  evaluateRule(url, cacheType, config, metadata) {
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

    return false;
  },

  // Invalidate by pattern
  async invalidateByPattern(pattern) {
    const startTime = Date.now();
    const result = {
      success: true,
      invalidatedKeys: [],
      errors: [],
      duration: 0
    };

    try {
      const cacheNames = Object.values(CACHE_NAMES);
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          if (this.matchesPattern(request.url, pattern)) {
            try {
              await cache.delete(request);
              result.invalidatedKeys.push(request.url);
              cacheMetadata.delete(request.url);
            } catch (error) {
              result.errors.push(`Failed to invalidate ${request.url}: ${error}`);
            }
          }
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
    
    // Notify clients
    notifyClients({
      type: 'CACHE_INVALIDATION_COMPLETE',
      result: result
    });

    return result;
  },

  // Invalidate by event
  async invalidateByEvent(eventType, eventData) {
    const startTime = Date.now();
    const result = {
      success: true,
      invalidatedKeys: [],
      errors: [],
      duration: 0
    };

    try {
      const event = {
        type: eventType,
        timestamp: Date.now(),
        data: eventData,
        source: 'service-worker'
      };

      // Find rules that listen for this event
      const affectedRules = Array.from(this.rules.values())
        .filter(rule => rule.config.invalidateOnEvents?.includes(eventType));

      for (const rule of affectedRules) {
        const patternResult = await this.invalidateByPattern(rule.pattern);
        result.invalidatedKeys.push(...patternResult.invalidatedKeys);
        result.errors.push(...patternResult.errors);
      }

      this.invalidationStats.totalInvalidations++;
      this.invalidationStats.successfulInvalidations++;

    } catch (error) {
      result.success = false;
      result.errors.push(`Event-based invalidation failed: ${error}`);
      this.invalidationStats.failedInvalidations++;
    }

    result.duration = Date.now() - startTime;
    
    // Notify clients
    notifyClients({
      type: 'CACHE_INVALIDATION_COMPLETE',
      result: result
    });

    return result;
  },

  // Get statistics
  getStats() {
    return {
      ...this.invalidationStats,
      rulesCount: this.rules.size,
      eventListenersCount: this.eventListeners.size
    };
  }
};

// Initialize cache invalidation rules
cacheInvalidationManager.initializeRules();

// Enhanced Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installing service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache critical assets immediately
      cacheCriticalAssets(),
      
      // Initialize other caches
      initializeCaches(),
      
      // Preload important data
      preloadCriticalData()
    ])
      .then(() => {
        console.log('🔧 SW: All caches initialized successfully');
        notifyClients({ 
          type: 'SW_INSTALLED', 
          version: CACHE_VERSION 
        });
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('🔧 SW: Installation error:', error);
        // Continue installation even if cache fails
        return self.skipWaiting();
      })
  );
});

// Cache critical assets
async function cacheCriticalAssets() {
  const cache = await caches.open(CACHE_NAMES.CRITICAL);
  console.log('🔧 SW: Caching critical assets');
  
  try {
    await cache.addAll(CRITICAL_ASSETS);
    console.log('🔧 SW: Critical assets cached:', CRITICAL_ASSETS.length);
  } catch (error) {
    console.warn('🔧 SW: Some critical assets failed to cache:', error);
  }
}

// Initialize all caches
async function initializeCaches() {
  const cachePromises = Object.values(CACHE_NAMES).map(cacheName => 
    caches.open(cacheName).then(cache => {
      console.log('🔧 SW: Cache initialized:', cacheName);
      return cache;
    })
  );
  
  await Promise.all(cachePromises);
}

// Preload critical data
async function preloadCriticalData() {
  console.log('🔧 SW: Preloading critical data');
  
  try {
    // Preload basic app data if online
    const preloadPromises = [
      fetch('/api/statistik').then(response => {
        if (response.ok) {
          return caches.open(CACHE_NAMES.API).then(cache => {
            return cache.put('/api/statistik', response);
          });
        }
      }).catch(() => {
        console.log('🔧 SW: Preload failed, will load later');
      })
    ];
    
    await Promise.allSettled(preloadPromises);
  } catch (error) {
    console.log('🔧 SW: Preload error:', error);
  }
}

// Enhanced Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔧 SW: Activating service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      cleanupOldCaches(),
      
      // Take control of all pages
      self.clients.claim(),
      
      // Check cache quotas
      checkCacheQuotas(),
      
      // Notify clients about activation
      notifyActivation()
    ])
      .then(() => {
        console.log('🔧 SW: Activation complete');
        notifyClients({ 
          type: 'SW_ACTIVATED', 
          version: CACHE_VERSION 
        });
      })
      .catch((error) => {
        console.error('🔧 SW: Activation error:', error);
      })
  );
});

// Clean up old caches
async function cleanupOldCaches() {
  const currentCacheNames = Object.values(CACHE_NAMES);
  const allCacheNames = await caches.keys();
  
  const cleanupPromises = allCacheNames
    .filter(cacheName => !currentCacheNames.includes(cacheName))
    .map(async (oldCacheName) => {
      console.log('🔧 SW: Deleting old cache:', oldCacheName);
      await caches.delete(oldCacheName);
      
      // Clean up metadata
      if (cacheMetadata.has(oldCacheName)) {
        cacheMetadata.delete(oldCacheName);
      }
    });
  
  await Promise.all(cleanupPromises);
  console.log('🔧 SW: Old cache cleanup complete');
}

// Check cache quotas and cleanup if needed
async function checkCacheQuotas() {
  try {
    const usage = await estimateCacheUsage();
    
    if (usage > CACHE_QUOTAS.cleanupThreshold) {
      console.log('🔧 SW: Cache usage high, triggering cleanup');
      await performCacheCleanup();
    }
    
    if (usage > CACHE_QUOTAS.warningThreshold) {
      console.warn('🔧 SW: Cache usage approaching limit:', formatBytes(usage));
      notifyClients({ 
        type: 'CACHE_WARNING', 
        usage: usage,
        threshold: CACHE_QUOTAS.warningThreshold
      });
    }
    
    console.log('🔧 SW: Cache usage:', formatBytes(usage));
  } catch (error) {
    console.warn('🔧 SW: Could not check cache quota:', error);
  }
}

// Estimate cache usage
async function estimateCacheUsage() {
  let totalSize = 0;
  
  for (const cacheName of Object.values(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const clonedResponse = response.clone();
          const buffer = await clonedResponse.arrayBuffer();
          totalSize += buffer.byteLength;
        }
      }
    } catch (error) {
      console.warn('🔧 SW: Error estimating cache size for', cacheName, error);
    }
  }
  
  return totalSize;
}

// Perform cache cleanup based on LRU and expiration
async function performCacheCleanup() {
  console.log('🔧 SW: Performing cache cleanup');
  
  for (const [cacheType, cacheName] of Object.entries(CACHE_NAMES)) {
    if (cacheType === 'CRITICAL') continue; // Never clean critical cache
    
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      const config = CACHE_CONFIG[cacheType];
      
      // Sort by last used (if we have metadata) or just remove oldest entries
      const entriesToRemove = [];
      const now = Date.now();
      
      for (const request of requests) {
        const metadata = cacheMetadata.get(request.url);
        const age = metadata ? now - metadata.timestamp : Infinity;
        
        // Remove if expired
        if (age > config.maxAge) {
          entriesToRemove.push(request);
        }
      }
      
      // If still too many entries, remove oldest
      if (requests.length - entriesToRemove.length > config.maxEntries) {
        const excess = (requests.length - entriesToRemove.length) - config.maxEntries;
        const remaining = requests.filter(req => !entriesToRemove.includes(req));
        entriesToRemove.push(...remaining.slice(0, excess));
      }
      
      // Remove entries
      for (const request of entriesToRemove) {
        await cache.delete(request);
        cacheMetadata.delete(request.url);
      }
      
      if (entriesToRemove.length > 0) {
        console.log(`🔧 SW: Cleaned ${entriesToRemove.length} entries from ${cacheName}`);
      }
    } catch (error) {
      console.warn('🔧 SW: Error cleaning cache', cacheName, error);
    }
  }
}

// Notify clients about activation
async function notifyActivation() {
  const clients = await self.clients.matchAll();
  
  for (const client of clients) {
    client.postMessage({
      type: 'SW_ACTIVATED',
      version: CACHE_VERSION,
      timestamp: Date.now()
    });
  }
}

// Utility: Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if ( request.headers.get('Next-Action') || request.method === 'POST' || 
    url.pathname.startsWith('/api/auth') || request.mode === 'navigate') {
    return;
  }

  if (request.mode === 'navigate' || 
      url.pathname.startsWith('/api/auth') || 
      url.pathname.includes('callback')) {
    return;
  }

  if (url.pathname.includes('manifest.json') || url.pathname.includes('app-icons')) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (isCriticalAsset(request.url)) {
    event.respondWith(handleCriticalAsset(request));
    return;
  }

  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  event.respondWith(handleStaleWhileRevalidate(request));
});

// Check if asset is critical
function isCriticalAsset(url) {
  return CRITICAL_ASSETS.some(asset => {
    if (asset.includes('*')) {
      const pattern = asset.replace('*', '.*');
      return new RegExp(pattern).test(url);
    }
    return url.endsWith(asset);
  });
}

// Handle critical assets - Cache First with long TTL
async function handleCriticalAsset(request) {
  const cache = await caches.open(CACHE_NAMES.CRITICAL);
  const cachedResponse = await cache.match(request);
  
  // Update metadata
  updateCacheMetadata(request.url, 'CRITICAL');
  
  if (cachedResponse && !isExpired(request.url, 'CRITICAL')) {
    console.log('🔧 SW: Serving critical asset from cache:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      console.log('🔧 SW: Cached critical asset:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('🔧 SW: Critical asset network failed, using cache:', request.url);
    return cachedResponse || createOfflineResponse('Critical asset unavailable');
  }
}

// Handle static assets - Enhanced with optimization
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAMES.STATIC);
  const cachedResponse = await cache.match(request);
  
  // Update metadata
  updateCacheMetadata(request.url, 'STATIC');
  
  if (cachedResponse && !isExpired(request.url, 'STATIC')) {
    // Check if we need to revalidate in background
    const config = getAssetConfig(request.url);
    if (config?.revalidateInterval) {
      backgroundRevalidateAsset(request.url, config);
    }
    
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Optimize and cache the response
      const optimizedResponse = await optimizeAssetResponse(request.url, networkResponse);
      const responseToCache = optimizedResponse.clone();
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔧 SW: Static asset failed, serving from cache:', request.url);
    return cachedResponse || createOfflineResponse('Static asset unavailable');
  }
}

// Get asset configuration (simplified version for SW)
function getAssetConfig(url) {
  // Critical assets
  if (url.includes('/app-icons/') || url.includes('/manifest.json')) {
    return {
      priority: 'critical',
      compress: true,
      format: 'auto',
      revalidateInterval: 24 * 60 * 60 * 1000 // 24 hours
    };
  }
  
  // Images
  if (url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
    return {
      priority: 'normal',
      compress: true,
      format: 'auto',
      revalidateInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
  }
  
  // Scripts and styles
  if (url.match(/\.(js|css)$/i)) {
    return {
      priority: 'high',
      compress: true,
      format: 'original',
      revalidateInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
    };
  }
  
  // Fonts
  if (url.match(/\.(woff|woff2|ttf|otf)$/i)) {
    return {
      priority: 'critical',
      compress: true,
      format: 'original',
      revalidateInterval: 365 * 24 * 60 * 60 * 1000 // 1 year
    };
  }
  
  return {
    priority: 'normal',
    compress: false,
    format: 'original',
    revalidateInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

// Optimize asset response
async function optimizeAssetResponse(url, response) {
  try {
    const config = getAssetConfig(url);
    
    if (!config.compress || !url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
      return response;
    }
    
    // In a real implementation, you would compress the image here
    // For now, we'll just add optimization headers
    const optimizedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'x-asset-optimized': 'true',
        'x-asset-compression': config.format,
        'x-asset-priority': config.priority
      }
    });
    
    return optimizedResponse;
  } catch (error) {
    console.warn('Failed to optimize asset response:', error);
    return response;
  }
}

// Background revalidate asset
async function backgroundRevalidateAsset(url, config) {
  try {
    const revalidateOptions = {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    const response = await fetch(url, revalidateOptions);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAMES.STATIC);
      const optimizedResponse = await optimizeAssetResponse(url, response);
      await cache.put(url, optimizedResponse);
      
      console.log('🔧 SW: Asset revalidated:', url);
    }
  } catch (error) {
    console.log('🔧 SW: Asset revalidation failed:', url, error);
  }
}

// Enhanced API request handler with Network First strategy
async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAMES.API);
  const cachedResponse = await cache.match(request);
  
  // Update metadata
  updateCacheMetadata(request.url, 'API');
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      console.log('🔧 SW: API response cached:', request.url);
      return networkResponse;
    }
    
    throw new Error(`API response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('🔧 SW: API network failed, trying cache:', request.url);
    
    if (cachedResponse && !isExpired(request.url, 'API')) {
      // Notify client about offline mode
      notifyClients({ 
        type: 'API_OFFLINE', 
        url: request.url,
        fromCache: true 
      });
      return cachedResponse;
    }
    
    // Return offline response for API
    return createOfflineResponse('API unavailable - offline mode');
  }
}

// Handle navigation requests - Network First with cache fallback
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAMES.RUNTIME);
  const cachedResponse = await cache.match(request);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      updateCacheMetadata(request.url, 'RUNTIME');
      return networkResponse;
    }
  } catch (error) {
    console.log('🔧 SW: Navigation failed, serving from cache');
  }

  // Always fallback to cached index or offline page
  return cachedResponse || 
         caches.match('/') || 
         createOfflineResponse('App unavailable - offline mode');
}

// Handle Stale While Revalidate strategy
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAMES.RUNTIME);
  const cachedResponse = await cache.match(request);
  
  // Update metadata
  updateCacheMetadata(request.url, 'RUNTIME');
  
  // Always try to update in background
  const networkPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const responseToCache = response.clone();
      await cache.put(request, responseToCache);
    }
    return response;
  }).catch(error => {
    console.log('🔧 SW: Background update failed:', error);
    return null;
  });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // If no cache, wait for network
  try {
    const networkResponse = await networkPromise;
    return networkResponse || createOfflineResponse('Resource unavailable');
  } catch (error) {
    return createOfflineResponse('Resource unavailable - offline mode');
  }
}

// Update cache metadata
function updateCacheMetadata(url, cacheType) {
  cacheMetadata.set(url, {
    timestamp: Date.now(),
    cacheType,
    accessCount: (cacheMetadata.get(url)?.accessCount || 0) + 1
  });
}

// Check if cache entry is expired
function isExpired(url, cacheType) {
  const metadata = cacheMetadata.get(url);
  if (!metadata) return true;
  
  // Check cache invalidation rules first
  if (cacheInvalidationManager.shouldInvalidate(url, cacheType, metadata)) {
    console.log('🔧 SW: Cache entry invalidated by rules:', url);
    return true;
  }
  
  const config = CACHE_CONFIG[cacheType];
  const age = Date.now() - metadata.timestamp;
  
  return age > config.maxAge;
}

// Create offline response
function createOfflineResponse(message) {
  return new Response(
    JSON.stringify({ 
      error: 'Offline mode', 
      message: message,
      offline: true,
      timestamp: Date.now()
    }),
    { 
      status: 503, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Handle beforeinstallprompt event
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('🔧 SW: Install prompt detected');
  // Forward to client
  event.waitUntil(
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'BEFORE_INSTALL_PROMPT',
          event: event
        });
      });
    })
  );
});

// Handle appinstalled event
self.addEventListener('appinstalled', (event) => {
  console.log('🔧 SW: App installed');
  // Forward to client
  event.waitUntil(
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'APP_INSTALLED'
        });
      });
    })
  );
});

// Enhanced message handler with cache management commands
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_SYNC_QUEUE':
      event.ports[0].postMessage({ 
        type: 'SYNC_QUEUE_RESPONSE', 
        queue: syncQueue 
      });
      break;
      
    case 'ADD_TO_SYNC_QUEUE':
      addToSyncQueue(data);
      break;
      
    case 'CLEAR_SYNC_QUEUE':
      syncQueue = [];
      notifyClients({ type: 'SYNC_QUEUE_CLEARED' });
      break;
      
    case 'FORCE_SYNC':
      processSyncQueue();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage({ 
          type: 'CACHE_STATUS_RESPONSE', 
          status 
        });
      });
      break;
      
    // Enhanced cache management commands
    case 'CLEAR_CACHE':
      clearCache(data.cacheType).then(() => {
        event.ports[0].postMessage({ 
          type: 'CACHE_CLEARED', 
          cacheType: data.cacheType 
        });
      });
      break;
      
    case 'CLEAR_EXPIRED_CACHE':
      clearExpiredCache().then((cleared) => {
        event.ports[0].postMessage({ 
          type: 'EXPIRED_CACHE_CLEARED', 
          count: cleared 
        });
      });
      break;
      
    case 'WARM_CACHE':
      warmCache(data.urls).then((warmed) => {
        event.ports[0].postMessage({ 
          type: 'CACHE_WARMED', 
          urls: warmed 
        });
      });
      break;
      
    case 'GET_CACHE_ANALYTICS':
      getCacheAnalytics().then(analytics => {
        event.ports[0].postMessage({ 
          type: 'CACHE_ANALYTICS_RESPONSE', 
          analytics 
        });
      });
      break;
      
    case 'FORCE_CACHE_CLEANUP':
      performCacheCleanup().then(() => {
        event.ports[0].postMessage({ 
          type: 'CACHE_CLEANUP_COMPLETED' 
        });
      });
      break;
      
    // Cache invalidation commands
    case 'INVALIDATE_CACHE_BY_PATTERN':
      cacheInvalidationManager.invalidateByPattern(data.pattern).then(result => {
        event.ports[0].postMessage({ 
          type: 'CACHE_INVALIDATION_COMPLETE', 
          result 
        });
      });
      break;
      
    case 'INVALIDATE_CACHE_BY_EVENT':
      cacheInvalidationManager.invalidateByEvent(data.eventType, data.eventData).then(result => {
        event.ports[0].postMessage({ 
          type: 'CACHE_INVALIDATION_COMPLETE', 
          result 
        });
      });
      break;
      
    case 'GET_CACHE_INVALIDATION_STATS':
      const stats = cacheInvalidationManager.getStats();
      event.ports[0].postMessage({ 
        type: 'CACHE_INVALIDATION_STATS_RESPONSE', 
        stats 
      });
      break;
      
    default:
      console.log('🔧 SW: Unknown message type:', type);
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('🔧 SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processSyncQueue());
  }
});

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('🔧 SW: Push received:', event);
  
  const options = {
    body: 'Data berhasil disinkronkan',
    icon: '/app-icons/icon-192x192.png',
    badge: '/app-icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Keuangan App', options)
  );
});

// Background sync queue management
function addToSyncQueue(operation) {
  syncQueue.push({
    ...operation,
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    retries: 0
  });
  
  console.log('🔧 SW: Added to sync queue:', operation);
  notifyClients({ 
    type: 'SYNC_QUEUE_UPDATED', 
    queueLength: syncQueue.length 
  });
}

// Process sync queue
async function processSyncQueue() {
  if (syncQueue.length === 0) {
    console.log('🔧 SW: Sync queue is empty');
    return;
  }

  console.log('🔧 SW: Processing sync queue:', syncQueue.length, 'items');
  
  const failedOperations = [];
  
  for (const operation of syncQueue) {
    try {
      await executeSyncOperation(operation);
      console.log('🔧 SW: Synced operation:', operation.id);
    } catch (error) {
      console.error('🔧 SW: Sync failed for operation:', operation.id, error);
      
      operation.retries++;
      if (operation.retries < 3) {
        failedOperations.push(operation);
      }
    }
  }
  
  syncQueue = failedOperations;
  
  notifyClients({ 
    type: 'SYNC_COMPLETED', 
    remaining: syncQueue.length 
  });
}

// Execute individual sync operation
async function executeSyncOperation(operation) {
  const { method, url, data } = operation;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
  
  return response.json();
}

// Notify all clients
function notifyClients(message) {
  clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

// Enhanced Get cache status with detailed analytics
async function getCacheStatus() {
  const status = {};
  let totalSize = 0;
  let totalEntries = 0;
  
  for (const [cacheType, cacheName] of Object.entries(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const entries = [];
      let cacheSize = 0;
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const clonedResponse = response.clone();
          const buffer = await clonedResponse.arrayBuffer();
          const size = buffer.byteLength;
          
          entries.push({
            url: request.url,
            size: size,
            timestamp: cacheMetadata.get(request.url)?.timestamp || Date.now(),
            accessCount: cacheMetadata.get(request.url)?.accessCount || 0,
            expired: isExpired(request.url, cacheType)
          });
          
          cacheSize += size;
        }
      }
      
      status[cacheType.toLowerCase()] = {
        count: entries.length,
        size: cacheSize,
        entries: entries.sort((a, b) => b.timestamp - a.timestamp), // Most recent first
        maxSize: CACHE_CONFIG[cacheType]?.maxEntries || 0,
        maxAge: CACHE_CONFIG[cacheType]?.maxAge || 0,
        strategy: CACHE_CONFIG[cacheType]?.strategy || 'UNKNOWN'
      };
      
      totalSize += cacheSize;
      totalEntries += entries.length;
    } catch (error) {
      console.warn('🔧 SW: Error getting cache status for', cacheName, error);
      status[cacheType.toLowerCase()] = {
        count: 0,
        size: 0,
        entries: [],
        error: error.message
      };
    }
  }
  
  return {
    caches: status,
    summary: {
      totalSize,
      totalEntries,
      quotaUsage: (totalSize / CACHE_QUOTAS.maxStorage) * 100,
      quotaWarning: totalSize > CACHE_QUOTAS.warningThreshold,
      quotaCritical: totalSize > CACHE_QUOTAS.cleanupThreshold,
      version: CACHE_VERSION
    },
    syncQueue: syncQueue.length,
    metadata: {
      totalMetadata: cacheMetadata.size,
      oldestEntry: getOldestEntry(),
      newestEntry: getNewestEntry()
    }
  };
}

// Get oldest cache entry
function getOldestEntry() {
  let oldest = null;
  let oldestTime = Date.now();
  
  for (const [url, metadata] of cacheMetadata.entries()) {
    if (metadata.timestamp < oldestTime) {
      oldestTime = metadata.timestamp;
      oldest = { url, ...metadata };
    }
  }
  
  return oldest;
}

// Get newest cache entry
function getNewestEntry() {
  let newest = null;
  let newestTime = 0;
  
  for (const [url, metadata] of cacheMetadata.entries()) {
    if (metadata.timestamp > newestTime) {
      newestTime = metadata.timestamp;
      newest = { url, ...metadata };
    }
  }
  
  return newest;
}

// Clear specific cache type
async function clearCache(cacheType) {
  if (!CACHE_NAMES[cacheType]) {
    throw new Error(`Unknown cache type: ${cacheType}`);
  }
  
  const cache = await caches.open(CACHE_NAMES[cacheType]);
  const keys = await cache.keys();
  
  for (const request of keys) {
    await cache.delete(request);
    cacheMetadata.delete(request.url);
  }
  
  console.log(`🔧 SW: Cleared ${cacheType} cache (${keys.length} entries)`);
  notifyClients({ 
    type: 'CACHE_CLEARED', 
    cacheType, 
    count: keys.length 
  });
}

// Clear expired cache entries
async function clearExpiredCache() {
  let totalCleared = 0;
  
  for (const [cacheType, cacheName] of Object.entries(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const expiredKeys = [];
      
      for (const request of keys) {
        if (isExpired(request.url, cacheType)) {
          expiredKeys.push(request);
        }
      }
      
      for (const request of expiredKeys) {
        await cache.delete(request);
        cacheMetadata.delete(request.url);
      }
      
      totalCleared += expiredKeys.length;
      console.log(`🔧 SW: Cleared ${expiredKeys.length} expired entries from ${cacheType}`);
    } catch (error) {
      console.warn('🔧 SW: Error clearing expired cache for', cacheName, error);
    }
  }
  
  if (totalCleared > 0) {
    notifyClients({ 
      type: 'EXPIRED_CACHE_CLEARED', 
      count: totalCleared 
    });
  }
  
  return totalCleared;
}

// Warm cache with specific URLs
async function warmCache(urls) {
  const warmedUrls = [];
  
  for (const url of urls) {
    try {
      const request = new Request(url);
      const response = await fetch(request);
      
      if (response.ok) {
        const cacheName = determineCacheType(url);
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
        
        updateCacheMetadata(url, cacheName.replace(`${CACHE_PREFIX}-`, '').replace(`-v${CACHE_VERSION}`, ''));
        warmedUrls.push(url);
        
        console.log('🔧 SW: Warmed cache for:', url);
      }
    } catch (error) {
      console.warn('🔧 SW: Failed to warm cache for:', url, error);
    }
  }
  
  return warmedUrls;
}

// Determine cache type for URL
function determineCacheType(url) {
  if (url.startsWith('/api/')) {
    return CACHE_NAMES.API;
  }
  
  if (isCriticalAsset(url)) {
    return CACHE_NAMES.CRITICAL;
  }
  
  if (url.includes('.js') || url.includes('.css') || url.includes('.woff')) {
    return CACHE_NAMES.STATIC;
  }
  
  return CACHE_NAMES.RUNTIME;
}

// Get detailed cache analytics
async function getCacheAnalytics() {
  const analytics = {
    hitRates: {},
    performanceMetrics: {},
    usagePatterns: {},
    recommendations: []
  };
  
  // Calculate hit rates (simplified - in real app would track hits/misses)
  for (const [cacheType, cacheName] of Object.entries(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      analytics.hitRates[cacheType.toLowerCase()] = {
        totalEntries: keys.length,
        estimatedHitRate: 0.85, // Placeholder - would track actual hits/misses
        avgResponseTime: cacheType === 'CRITICAL' ? 10 : 50 // ms
      };
    } catch (error) {
      analytics.hitRates[cacheType.toLowerCase()] = {
        error: error.message
      };
    }
  }
  
  // Performance metrics
  const totalUsage = await estimateCacheUsage();
  analytics.performanceMetrics = {
    totalStorageUsed: totalUsage,
    totalStorageAvailable: CACHE_QUOTAS.maxStorage,
    utilizationPercentage: (totalUsage / CACHE_QUOTAS.maxStorage) * 100,
    cacheEfficiency: totalUsage > 0 ? 'GOOD' : 'NEEDS_WARMING'
  };
  
  // Usage patterns
  analytics.usagePatterns = {
    mostAccessed: getMostAccessedEntries(),
    leastAccessed: getLeastAccessedEntries(),
    oldestEntries: getOldestEntries(),
    largestEntries: await getLargestEntries()
  };
  
  // Recommendations
  analytics.recommendations = generateRecommendations(analytics);
  
  return analytics;
}

// Get most accessed entries
function getMostAccessedEntries() {
  const entries = Array.from(cacheMetadata.entries())
    .map(([url, metadata]) => ({ url, ...metadata }))
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 10);
  
  return entries;
}

// Get least accessed entries
function getLeastAccessedEntries() {
  const entries = Array.from(cacheMetadata.entries())
    .map(([url, metadata]) => ({ url, ...metadata }))
    .sort((a, b) => a.accessCount - b.accessCount)
    .slice(0, 10);
  
  return entries;
}

// Get oldest entries
function getOldestEntries() {
  const entries = Array.from(cacheMetadata.entries())
    .map(([url, metadata]) => ({ url, ...metadata }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, 10);
  
  return entries;
}

// Get largest entries (async)
async function getLargestEntries() {
  const entries = [];
  
  for (const [cacheType, cacheName] of Object.entries(CACHE_NAMES)) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const clonedResponse = response.clone();
          const buffer = await clonedResponse.arrayBuffer();
          
          entries.push({
            url: request.url,
            size: buffer.byteLength,
            cacheType
          });
        }
      }
    } catch (error) {
      console.warn('🔧 SW: Error getting entry size for', cacheName);
    }
  }
  
  return entries.sort((a, b) => b.size - a.size).slice(0, 10);
}

// Generate cache recommendations
function generateRecommendations(analytics) {
  const recommendations = [];
  
  if (analytics.performanceMetrics.utilizationPercentage > 80) {
    recommendations.push({
      type: 'WARNING',
      message: 'Cache utilization is high. Consider clearing old entries.',
      priority: 'HIGH'
    });
  }
  
  if (analytics.performanceMetrics.utilizationPercentage < 20) {
    recommendations.push({
      type: 'INFO',
      message: 'Cache utilization is low. Consider warming up critical resources.',
      priority: 'MEDIUM'
    });
  }
  
  const oldEntries = analytics.usagePatterns.oldestEntries.filter(
    entry => Date.now() - entry.timestamp > 7 * 24 * 60 * 60 * 1000 // 7 days
  );
  
  if (oldEntries.length > 10) {
    recommendations.push({
      type: 'INFO',
      message: `${oldEntries.length} entries are older than 7 days. Consider cleanup.`,
      priority: 'LOW'
    });
  }
  
  return recommendations;
}