/**
 * Queue Persistence Logic
 * 
 * Handles persistence of offline queue data to local storage
 * and recovery mechanisms.
 */

'use client';

import { QueuedRequest } from './offline-queue';

export interface QueueStorage {
  version: string;
  timestamp: number;
  requests: QueuedRequest[];
  metadata: {
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    lastSync: number | null;
  };
}

export interface PersistenceConfig {
  storageKey: string;
  maxStorageSize: number; // in bytes
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  autoCleanup: boolean;
  retentionDays: number;
}

export class QueuePersistence {
  private config: PersistenceConfig;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = {
      storageKey: 'offline-queue-data',
      maxStorageSize: 10 * 1024 * 1024, // 10MB
      compressionEnabled: true,
      encryptionEnabled: false,
      autoCleanup: true,
      retentionDays: 30,
      ...config
    };

    this.initializeCompressionWorker();
  }

  /**
   * Initialize compression worker
   */
  private initializeCompressionWorker(): void {
    if (this.config.compressionEnabled && typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const { type, data } = e.data;
            
            if (type === 'compress') {
              const compressed = new TextEncoder().encode(JSON.stringify(data));
              self.postMessage({ type: 'compressed', data: compressed });
            } else if (type === 'decompress') {
              const decompressed = JSON.parse(new TextDecoder().decode(data));
              self.postMessage({ type: 'decompressed', data: decompressed });
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
      }
    }
  }

  /**
   * Save queue to storage
   */
  async saveQueue(requests: QueuedRequest[], metadata: any): Promise<boolean> {
    try {
      // Check storage quota
      if (!await this.checkStorageQuota()) {
        console.warn('Storage quota exceeded, performing cleanup');
        await this.performCleanup();
      }

      const queueData: QueueStorage = {
        version: '1.0.0',
        timestamp: Date.now(),
        requests: requests.filter(req => req.status !== 'completed'), // Don't persist completed requests
        metadata: {
          totalRequests: metadata.totalRequests || 0,
          completedRequests: metadata.completedRequests || 0,
          failedRequests: metadata.failedRequests || 0,
          lastSync: metadata.lastSync || null
        }
      };

      let dataToStore = JSON.stringify(queueData);

      // Compress if enabled
      if (this.config.compressionEnabled && this.compressionWorker) {
        dataToStore = await this.compressData(dataToStore);
      }

      // Encrypt if enabled
      if (this.config.encryptionEnabled) {
        dataToStore = await this.encryptData(dataToStore);
      }

      // Save to localStorage
      localStorage.setItem(this.config.storageKey, dataToStore);

      // Save metadata separately for quick access
      localStorage.setItem(`${this.config.storageKey}-meta`, JSON.stringify({
        size: dataToStore.length,
        timestamp: Date.now(),
        requestCount: queueData.requests.length
      }));

      return true;
    } catch (error) {
      console.error('Failed to save queue:', error);
      return false;
    }
  }

  /**
   * Load queue from storage
   */
  async loadQueue(): Promise<{ requests: QueuedRequest[]; metadata: any } | null> {
    try {
      const storedData = localStorage.getItem(this.config.storageKey);
      if (!storedData) {
        return null;
      }

      let dataToProcess = storedData;

      // Decrypt if encrypted
      if (this.config.encryptionEnabled) {
        dataToProcess = await this.decryptData(dataToProcess);
      }

      // Decompress if compressed
      if (this.config.compressionEnabled && this.compressionWorker) {
        dataToProcess = await this.decompressData(dataToProcess);
      }

      const queueData: QueueStorage = JSON.parse(dataToProcess);

      // Validate version
      if (queueData.version !== '1.0.0') {
        console.warn('Queue data version mismatch, attempting migration');
        return await this.migrateQueueData(queueData);
      }

      // Filter out expired requests
      const validRequests = queueData.requests.filter(req => 
        this.isRequestValid(req)
      );

      return {
        requests: validRequests,
        metadata: queueData.metadata
      };
    } catch (error) {
      console.error('Failed to load queue:', error);
      return null;
    }
  }

  /**
   * Check storage quota
   */
  private async checkStorageQuota(): Promise<boolean> {
    try {
      const testData = 'x'.repeat(1024); // 1KB test data
      localStorage.setItem('storage-test', testData);
      localStorage.removeItem('storage-test');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform cleanup of old data
   */
  private async performCleanup(): Promise<void> {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

    for (const key of keys) {
      if (key.startsWith('offline-queue-') && key !== this.config.storageKey) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            if (data.timestamp && (now - data.timestamp) > retentionMs) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Check if request is still valid
   */
  private isRequestValid(request: QueuedRequest): boolean {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Check timestamp
    if (now - request.timestamp > maxAge) {
      return false;
    }

    // Check retry count
    if (request.retryCount >= request.maxRetries && request.status === 'failed') {
      return false;
    }

    return true;
  }

  /**
   * Migrate queue data from older versions
   */
  private async migrateQueueData(oldData: any): Promise<{ requests: QueuedRequest[]; metadata: any }> {
    try {
      // Simple migration - add missing fields
      const requests = oldData.requests.map((req: any) => ({
        ...req,
        retryCount: req.retryCount || 0,
        maxRetries: req.maxRetries || 3,
        metadata: req.metadata || {}
      }));

      return {
        requests,
        metadata: oldData.metadata || {
          totalRequests: requests.length,
          completedRequests: 0,
          failedRequests: 0,
          lastSync: null
        }
      };
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        requests: [],
        metadata: {
          totalRequests: 0,
          completedRequests: 0,
          failedRequests: 0,
          lastSync: null
        }
      };
    }
  }

  /**
   * Compress data using worker
   */
  private async compressData(data: string): Promise<string> {
    if (!this.compressionWorker) {
      return data;
    }

    return new Promise((resolve, reject) => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'compressed') {
          if (this.compressionWorker) {
            this.compressionWorker.removeEventListener('message', handleMessage);
          }
          resolve(btoa(String.fromCharCode(...new Uint8Array(e.data.data))));
        }
      };

      if (this.compressionWorker) {
        this.compressionWorker.addEventListener('message', handleMessage);
        this.compressionWorker.postMessage({ type: 'compress', data });
      }

      // Fallback timeout
      setTimeout(() => {
        if (this.compressionWorker) {
          this.compressionWorker.removeEventListener('message', handleMessage);
        }
        resolve(data);
      }, 5000);
    });
  }

  /**
   * Decompress data using worker
   */
  private async decompressData(data: string): Promise<string> {
    if (!this.compressionWorker) {
      return data;
    }

    try {
      const compressedData = new Uint8Array(atob(data).split('').map(c => c.charCodeAt(0)));

      return new Promise((resolve, reject) => {
        const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'decompressed') {
            if (this.compressionWorker) {
              this.compressionWorker.removeEventListener('message', handleMessage);
            }
            resolve(JSON.stringify(e.data.data));
          }
        };

        if (this.compressionWorker) {
          this.compressionWorker.addEventListener('message', handleMessage);
          this.compressionWorker.postMessage({ type: 'decompress', data: compressedData });
        }

        // Fallback timeout
        setTimeout(() => {
          if (this.compressionWorker) {
            this.compressionWorker.removeEventListener('message', handleMessage);
          }
          resolve(data);
        }, 5000);
      });
    } catch (error) {
      return data;
    }
  }

  /**
   * Encrypt data (simple implementation)
   */
  private async encryptData(data: string): Promise<string> {
    // Simple XOR encryption for demonstration
    // In production, use proper encryption libraries
    const key = 'offline-queue-key';
    let encrypted = '';
    
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  }

  /**
   * Decrypt data (simple implementation)
   */
  private async decryptData(data: string): Promise<string> {
    try {
      const key = 'offline-queue-key';
      const decrypted = atob(data);
      let result = '';
      
      for (let i = 0; i < decrypted.length; i++) {
        result += String.fromCharCode(
          decrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return result;
    } catch (error) {
      return data;
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalSize: number;
    queueSize: number;
    metadataSize: number;
    itemCount: number;
    lastUpdated: number | null;
  } {
    try {
      const queueData = localStorage.getItem(this.config.storageKey);
      const metaData = localStorage.getItem(`${this.config.storageKey}-meta`);
      
      return {
        totalSize: (queueData?.length || 0) + (metaData?.length || 0),
        queueSize: queueData?.length || 0,
        metadataSize: metaData?.length || 0,
        itemCount: metaData ? JSON.parse(metaData).requestCount : 0,
        lastUpdated: metaData ? JSON.parse(metaData).timestamp : null
      };
    } catch (error) {
      return {
        totalSize: 0,
        queueSize: 0,
        metadataSize: 0,
        itemCount: 0,
        lastUpdated: null
      };
    }
  }

  /**
   * Clear all persisted data
   */
  clearPersistedData(): void {
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem(`${this.config.storageKey}-meta`);
    
    // Clear old data
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('offline-queue-')) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Export queue data
   */
  async exportQueueData(): Promise<string | null> {
    try {
      const data = await this.loadQueue();
      if (!data) {
        return null;
      }

      const exportData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        queue: data
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export queue data:', error);
      return null;
    }
  }

  /**
   * Import queue data
   */
  async importQueueData(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.queue || !importData.queue.requests) {
        throw new Error('Invalid import data format');
      }

      // Validate imported data
      const validRequests = importData.queue.requests.filter((req: any) => 
        req.id && req.url && req.method && req.timestamp
      );

      await this.saveQueue(validRequests, importData.queue.metadata);
      return true;
    } catch (error) {
      console.error('Failed to import queue data:', error);
      return false;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
  }
}

// Global instance
export const queuePersistence = new QueuePersistence();