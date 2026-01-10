'use client';

interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

interface SyncQueueItem {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  retries: number;
}

interface CacheStatus {
  static: {
    count: number;
    urls: string[];
  };
  api: {
    count: number;
    urls: string[];
  };
  syncQueue: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private swSupported: boolean = false;
  private messageChannel: MessageChannel | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.swSupported = 'serviceWorker' in navigator;
    }
  }

  // Initialize service worker
  async init(): Promise<boolean> {
    if (!this.swSupported) {
      console.warn('🔧 SW: Service Worker not supported');
      return false;
    }

    try {
      // Check if already registered in layout
      if (typeof window !== 'undefined' && window.swRegistration) {
        this.registration = window.swRegistration;
        console.log('🔧 SW: Using existing registration from layout');
      } else {
        // Register if not already registered
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('🔧 SW: Service Worker registered:', this.registration.scope);
      }

      // Setup message listener
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      // Wait for service worker to be active
      await this.waitForActivation();

      return true;
    } catch (error) {
      console.error('🔧 SW: Registration failed:', error);
      return false;
    }
  }

  // Wait for service worker activation
  private async waitForActivation(): Promise<void> {
    if (!this.registration) return;

    if (this.registration.active) {
      console.log('🔧 SW: Already active');
      return;
    }

    return new Promise((resolve) => {
      const handleUpdate = (registration: ServiceWorkerRegistration) => {
        if (registration.active) {
          console.log('🔧 SW: Service Worker activated');
          resolve();
        }
      };

      this.registration!.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              handleUpdate(this.registration!);
            }
          });
        }
      });

      // Check if already active
      if (this.registration!.active) {
        resolve();
      }
    });
  }

  // Handle messages from service worker
  private handleMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    console.log('🔧 SW: Message received:', type, data);

    // Trigger listeners
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('🔧 SW: Listener error:', error);
      }
    });

    // Handle special message types
    switch (type) {
      case 'API_OFFLINE':
        console.warn('🔧 SW: API is offline, using cache');
        break;
        
      case 'SYNC_QUEUE_UPDATED':
        console.log('🔧 SW: Sync queue updated:', data.queueLength);
        break;
        
      case 'SYNC_COMPLETED':
        console.log('🔧 SW: Sync completed, remaining:', data.remaining);
        break;
        
      case 'BEFORE_INSTALL_PROMPT':
        this.emit('INSTALL_PROMPT', event.data.event);
        break;
        
      case 'APP_INSTALLED':
        this.emit('APP_INSTALLED', {});
        break;
    }
  }

  // Send message to service worker
  async sendMessage(type: string, data?: any): Promise<any> {
    if (!this.registration?.active) {
      console.warn('🔧 SW: Service Worker not active');
      return null;
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.registration!.active!.postMessage({ type, data }, [channel.port2]);
    });
  }

  // Add event listener
  on(type: string, listener: (data: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  // Remove event listener
  off(type: string, listener: (data: any) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit event
  private emit(type: string, data: any): void {
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('🔧 SW: Emit error:', error);
      }
    });
  }

  // Get sync queue
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const response = await this.sendMessage('GET_SYNC_QUEUE');
    return response?.queue || [];
  }

  // Add operation to sync queue
  async addToSyncQueue(operation: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    await this.sendMessage('ADD_TO_SYNC_QUEUE', operation);
  }

  // Clear sync queue
  async clearSyncQueue(): Promise<void> {
    await this.sendMessage('CLEAR_SYNC_QUEUE');
  }

  // Force sync
  async forceSync(): Promise<void> {
    await this.sendMessage('FORCE_SYNC');
  }

  // Get cache status
  async getCacheStatus(): Promise<CacheStatus | null> {
    const response = await this.sendMessage('GET_CACHE_STATUS');
    return response?.status || null;
  }

  // Enhanced cache management functions
  async clearCache(cacheType: string): Promise<void> {
    await this.sendMessage('CLEAR_CACHE', { cacheType });
  }

  async clearExpiredCache(): Promise<number> {
    const response = await this.sendMessage('CLEAR_EXPIRED_CACHE');
    return response?.count || 0;
  }

  async warmCache(urls: string[]): Promise<string[]> {
    const response = await this.sendMessage('WARM_CACHE', { urls });
    return response?.urls || [];
  }

  async getCacheAnalytics(): Promise<any> {
    const response = await this.sendMessage('GET_CACHE_ANALYTICS');
    return response?.analytics || null;
  }

  async forceCacheCleanup(): Promise<void> {
    await this.sendMessage('FORCE_CACHE_CLEANUP');
  }

  // Skip waiting (for updates)
  async skipWaiting(): Promise<void> {
    await this.sendMessage('SKIP_WAITING');
  }

  // Check if service worker is active
  isActive(): boolean {
    return this.registration?.active?.state === 'activated';
  }

  // Get registration
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Check if update is available
  async checkForUpdate(): Promise<boolean> {
    if (!this.registration) return false;

    await this.registration.update();
    return !!this.registration.installing;
  }

  // Unregister service worker
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    const result = await this.registration.unregister();
    this.registration = null;
    return result;
  }
}

// Create singleton instance
export const swManager = new ServiceWorkerManager();

// Export types
export type { ServiceWorkerMessage, SyncQueueItem, CacheStatus };
export { ServiceWorkerManager };