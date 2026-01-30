const DB_NAME = 'keuanganPWA';
const DB_VERSION = 1;
const STORE_NAME = 'keuanganData';

export interface StoredTabungan {
  id: number;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastSync?: string;
}

export interface StoredTransaksi {
  id: number;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: string;
  tipe: string;
  kategoriId: number | null;
  tabunganId: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastSync?: string;
}

export interface StoredData {
  tabungan: StoredTabungan[];
  transaksi: StoredTransaksi[];
  userId: string;
  lastSync: string;
  version: string;
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
          store.createIndex('userId', 'userId', { unique: true });
          store.createIndex('lastSync', 'lastSync', { unique: false });
          
          console.log('📁 Created IndexedDB store and indexes');
        }
      };
    });
  }

  private getDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.');
    }
    return this.db;
  }

  async saveData(data: StoredData): Promise<void> {
    try {
      await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.getDB().transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.put({
          ...data,
          lastSync: new Date().toISOString(),
          version: '1.0.0'
        });

        request.onsuccess = () => {
          console.log('💾 Data saved to IndexedDB:', data.userId);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ Failed to save data to IndexedDB');
          reject(new Error('Failed to save data to IndexedDB'));
        };
      });
    } catch (error) {
      console.error('❌ Error saving data:', error);
      throw error;
    }
  }

  async getData(userId: string): Promise<StoredData | null> {
    try {
      await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.getDB().transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.get(userId);

        request.onsuccess = () => {
          const data = request.result;
          if (data) {
            console.log('📖 Data loaded from IndexedDB:', userId);
            resolve(data);
          } else {
            console.log('📂 No data found for user:', userId);
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('❌ Failed to load data from IndexedDB');
          reject(new Error('Failed to load data from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('❌ Error loading data:', error);
      throw error;
    }
  }

  async deleteData(userId: string): Promise<void> {
    try {
      await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.getDB().transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(userId);

        request.onsuccess = () => {
          console.log('🗑️ Data deleted from IndexedDB:', userId);
          resolve();
        };

        request.onerror = () => {
          console.error('❌ Failed to delete data from IndexedDB');
          reject(new Error('Failed to delete data from IndexedDB'));
        };
      });
    } catch (error) {
      console.error('❌ Error deleting data:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await this.init();
      
      return new Promise((resolve, reject) => {
        const transaction = this.getDB().transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.clear();

        request.onsuccess = () => {
          console.log('🗑️ All data cleared from IndexedDB');
          resolve();
        };

        request.onerror = () => {
          console.error('❌ Failed to clear IndexedDB');
          reject(new Error('Failed to clear IndexedDB'));
        };
      });
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        };
      }
      
      return { used: 0, available: 0 };
    } catch (error) {
      console.error('❌ Error getting storage usage:', error);
      return { used: 0, available: 0 };
    }
  }
}

const indexedDBStorage = new IndexedDBStorage();

export const storage = {
  async saveUserData(userId: string, tabungan: any[], transaksi: any[]): Promise<void> {
    const data: StoredData = {
      tabungan,
      transaksi,
      userId,
      lastSync: new Date().toISOString(),
      version: '1.0.0'
    };

    await indexedDBStorage.saveData(data);
  },

  async loadUserData(userId: string): Promise<{ tabungan: any[]; transaksi: any[] } | null> {
    const data = await indexedDBStorage.getData(userId);
    
    if (!data) {
      return null;
    }

    return {
      tabungan: data.tabungan || [],
      transaksi: data.transaksi || []
    };
  },

  async deleteUserData(userId: string): Promise<void> {
    await indexedDBStorage.deleteData(userId);
  },

  async clearAllData(): Promise<void> {
    await indexedDBStorage.clearAllData();
  },
  
  async getStorageInfo(): Promise<{
    usage: { used: number; available: number };
    isSupported: boolean;
    hasData: boolean;
  }> {
    const usage = await indexedDBStorage.getStorageUsage();
    const isSupported = 'indexedDB' in window;
    
    let hasData = false;
    try {
      if (isSupported) {
        await indexedDBStorage.init();
        hasData = true;
      }
    } catch (error) {
      hasData = false;
    }

    return {
      usage,
      isSupported,
      hasData
    };
  },

  async exportData(userId: string): Promise<string> {
    const data = await indexedDBStorage.getData(userId);
    
    if (!data) {
      throw new Error('No data found for user');
    }

    return JSON.stringify(data, null, 2);
  },

  async importData(jsonData: string): Promise<void> {
    try {
      const data: StoredData = JSON.parse(jsonData);
      
      if (!data.userId || !data.tabungan || !data.transaksi) {
        throw new Error('Invalid data format');
      }

      await indexedDBStorage.saveData({
        ...data,
        lastSync: new Date().toISOString(),
        version: '1.0.0'
      });

      console.log('📥 Data imported successfully for user:', data.userId);
    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw error;
    }
  },

  async isDataStale(userId: string, maxAgeHours: number = 24): Promise<boolean> {
    const data = await indexedDBStorage.getData(userId);
    
    if (!data || !data.lastSync) {
      return true;
    }

    const lastSync = new Date(data.lastSync);
    const now = new Date();
    const ageInHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    return ageInHours > maxAgeHours;
  },

  async getLastSync(userId: string): Promise<Date | null> {
    const data = await indexedDBStorage.getData(userId);
    
    if (!data || !data.lastSync) {
      return null;
    }

    return new Date(data.lastSync);
  }
};

export const localStorageFallback = {
  saveData(userId: string, data: any): void {
    if (typeof window === 'undefined') {
      console.warn('⚠️ localStorage not available in SSR environment');
      return;
    }

    try {
      const key = `keuangan_${userId}`;
      localStorage.setItem(key, JSON.stringify({
        ...data,
        lastSync: new Date().toISOString(),
        version: '1.0.0'
      }));
      console.log('💾 Data saved to localStorage fallback');
    } catch (error) {
      console.error('❌ Error saving to localStorage fallback:', error);
    }
  },

  loadData(userId: string): any | null {
    if (typeof window === 'undefined') {
      console.warn('⚠️ localStorage not available in SSR environment');
      return null;
    }

    try {
      const key = `keuangan_${userId}`;
      const data = localStorage.getItem(key);
      
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error loading from localStorage fallback:', error);
      return null;
    }
  },

  deleteData(userId: string): void {
    if (typeof window === 'undefined') {
      console.warn('⚠️ localStorage not available in SSR environment');
      return;
    }

    try {
      const key = `keuangan_${userId}`;
      localStorage.removeItem(key);
      console.log('🗑️ Data deleted from localStorage fallback');
    } catch (error) {
      console.error('❌ Error deleting from localStorage fallback:', error);
    }
  }
};

export const checkStorageSupport = (): {
  indexedDB: boolean;
  localStorage: boolean;
  recommended: 'indexedDB' | 'localStorage';
} => {
  if (typeof window === 'undefined') {
    return {
      indexedDB: false,
      localStorage: false,
      recommended: 'localStorage'
    };
  }
  
  const indexedDB = 'indexedDB' in window;
  const localStorage = 'localStorage' in window;
  
  return {
    indexedDB,
    localStorage,
    recommended: indexedDB ? 'indexedDB' : 'localStorage'
  };
};