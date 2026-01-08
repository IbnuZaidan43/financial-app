'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage, localStorageFallback, checkStorageSupport } from '@/lib/storage';

// Data interfaces
export interface LocalStorageData {
  tabungan: any[];
  transaksi: any[];
  lastSync: Date | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  storageType: 'indexedDB' | 'localStorage' | 'none';
}

export interface UseLocalStorageOptions {
  userId: string;
  autoSave?: boolean;
  autoLoad?: boolean;
  syncInterval?: number; // in minutes
  maxAge?: number; // in hours, before considering data stale
}

export function useLocalStorage(options: UseLocalStorageOptions) {
  const { userId, autoSave = true, autoLoad = true, syncInterval = 5, maxAge = 24 } = options;

  // State management
  const [data, setData] = useState<LocalStorageData>({
    tabungan: [],
    transaksi: [],
    lastSync: null,
    isLoading: false,
    error: null,
    isOnline: navigator.onLine,
    storageType: 'none'
  });

  // Storage support check
  const [storageSupport, setStorageSupport] = useState(checkStorageSupport());

  // Update online status
  useEffect(() => {
    const handleOnline = () => setData(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setData(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data from local storage
  const loadFromLocal = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('📥 Loading data from local storage for user:', userId);

      let result: { tabungan: any[]; transaksi: any[]; lastSync?: string } | null = null;
      let usedStorage: 'indexedDB' | 'localStorage' = 'indexedDB';

      // Try IndexedDB first
      if (storageSupport.indexedDB) {
        try {
          result = await storage.loadUserData(userId);
          console.log('✅ Loaded from IndexedDB');
        } catch (error) {
          console.warn('⚠️ IndexedDB failed, trying localStorage fallback:', error);
          usedStorage = 'localStorage';
          result = localStorageFallback.loadData(userId);
        }
      } else if (storageSupport.localStorage) {
        usedStorage = 'localStorage';
        result = localStorageFallback.loadData(userId);
        console.log('✅ Loaded from localStorage fallback');
      }

      if (result) {
        setData(prev => ({
          ...prev,
          tabungan: result.tabungan || [],
          transaksi: result.transaksi || [],
          lastSync: result.lastSync ? new Date(result.lastSync) : null,
          isLoading: false,
          error: null,
          storageType: usedStorage
        }));
        return true;
      } else {
        console.log('📂 No local data found for user:', userId);
        setData(prev => ({
          ...prev,
          tabungan: [],
          transaksi: [],
          lastSync: null,
          isLoading: false,
          error: null,
          storageType: usedStorage
        }));
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading from local storage:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load local data'
      }));
      return false;
    }
  }, [userId, storageSupport]);

  // Save data to local storage
  const saveToLocal = useCallback(async (tabungan: any[], transaksi: any[]): Promise<boolean> => {
    if (!userId) return false;

    try {
      console.log('💾 Saving data to local storage for user:', userId);

      let usedStorage: 'indexedDB' | 'localStorage' = 'indexedDB';

      // Try IndexedDB first
      if (storageSupport.indexedDB) {
        try {
          await storage.saveUserData(userId, tabungan, transaksi);
          console.log('✅ Saved to IndexedDB');
        } catch (error) {
          console.warn('⚠️ IndexedDB failed, using localStorage fallback:', error);
          usedStorage = 'localStorage';
          localStorageFallback.saveData(userId, { tabungan, transaksi });
        }
      } else if (storageSupport.localStorage) {
        usedStorage = 'localStorage';
        localStorageFallback.saveData(userId, { tabungan, transaksi });
        console.log('✅ Saved to localStorage fallback');
      }

      setData(prev => ({
        ...prev,
        tabungan,
        transaksi,
        lastSync: new Date(),
        storageType: usedStorage,
        error: null
      }));

      return true;
    } catch (error) {
      console.error('❌ Error saving to local storage:', error);
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save local data'
      }));
      return false;
    }
  }, [userId, storageSupport]);

  // Clear local data
  const clearLocal = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      console.log('🗑️ Clearing local data for user:', userId);

      if (storageSupport.indexedDB) {
        await storage.deleteUserData(userId);
      } else if (storageSupport.localStorage) {
        localStorageFallback.deleteData(userId);
      }

      setData(prev => ({
        ...prev,
        tabungan: [],
        transaksi: [],
        lastSync: null,
        error: null
      }));

      return true;
    } catch (error) {
      console.error('❌ Error clearing local data:', error);
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear local data'
      }));
      return false;
    }
  }, [userId, storageSupport]);

  // Check if data is stale
  const isDataStale = useCallback(async (): Promise<boolean> => {
    if (!userId) return true;

    try {
      if (storageSupport.indexedDB) {
        return await storage.isDataStale(userId, maxAge);
      }
      return false; // Can't check with localStorage
    } catch (error) {
      console.error('❌ Error checking data freshness:', error);
      return true; // Assume stale if we can't check
    }
  }, [userId, storageSupport, maxAge]);

  // Get storage info
  const getStorageInfo = useCallback(async () => {
    try {
      if (storageSupport.indexedDB) {
        return await storage.getStorageInfo();
      }
      return {
        usage: { used: 0, available: 0 },
        isSupported: storageSupport.localStorage,
        hasData: false
      };
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return {
        usage: { used: 0, available: 0 },
        isSupported: false,
        hasData: false
      };
    }
  }, [storageSupport]);

  // Export data
  const exportData = useCallback(async (): Promise<string> => {
    if (!userId) throw new Error('User ID required');

    if (storageSupport.indexedDB) {
      return await storage.exportData(userId);
    } else {
      const data = localStorageFallback.loadData(userId);
      if (!data) throw new Error('No data to export');
      return JSON.stringify(data, null, 2);
    }
  }, [userId, storageSupport]);

  // Import data
  const importData = useCallback(async (jsonData: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      if (storageSupport.indexedDB) {
        await storage.importData(jsonData);
      } else {
        const data = JSON.parse(jsonData);
        localStorageFallback.saveData(userId, data);
      }

      // Reload data after import
      await loadFromLocal();
      return true;
    } catch (error) {
      console.error('❌ Error importing data:', error);
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to import data'
      }));
      return false;
    }
  }, [userId, storageSupport, loadFromLocal]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && userId) {
      loadFromLocal();
    }
  }, [autoLoad, userId, loadFromLocal]);

  // Auto-save when data changes
  useEffect(() => {
    if (autoSave && userId && (data.tabungan.length > 0 || data.transaksi.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveToLocal(data.tabungan, data.transaksi);
      }, 1000); // Debounce save

      return () => clearTimeout(timeoutId);
    }
  }, [autoSave, userId, data.tabungan, data.transaksi, saveToLocal]);

  // Periodic sync check
  useEffect(() => {
    if (!syncInterval || !userId) return;

    const intervalId = setInterval(async () => {
      const stale = await isDataStale();
      if (stale && data.isOnline) {
        console.log('🔄 Data is stale, consider refreshing from server');
        // This would trigger a server refresh in the full implementation
      }
    }, syncInterval * 60 * 1000); // Convert minutes to milliseconds

    return () => clearInterval(intervalId);
  }, [syncInterval, userId, isDataStale, data.isOnline]);

  // Manual data update
  const updateData = useCallback((tabungan: any[], transaksi: any[]) => {
    setData(prev => ({
      ...prev,
      tabungan,
      transaksi,
      error: null
    }));
  }, []);

  // Add single tabungan
  const addTabungan = useCallback((tabungan: any) => {
    setData(prev => ({
      ...prev,
      tabungan: [...prev.tabungan, tabungan],
      error: null
    }));
  }, []);

  // Update single tabungan
  const updateTabungan = useCallback((id: number, updates: any) => {
    setData(prev => ({
      ...prev,
      tabungan: prev.tabungan.map(t => t.id === id ? { ...t, ...updates } : t),
      error: null
    }));
  }, []);

  // Delete single tabungan
  const deleteTabungan = useCallback((id: number) => {
    setData(prev => ({
      ...prev,
      tabungan: prev.tabungan.filter(t => t.id !== id),
      error: null
    }));
  }, []);

  // Add single transaksi
  const addTransaksi = useCallback((transaksi: any) => {
    setData(prev => ({
      ...prev,
      transaksi: [transaksi, ...prev.transaksi],
      error: null
    }));
  }, []);

  // Update single transaksi
  const updateTransaksi = useCallback((id: number, updates: any) => {
    setData(prev => ({
      ...prev,
      transaksi: prev.transaksi.map(t => t.id === id ? { ...t, ...updates } : t),
      error: null
    }));
  }, []);

  // Delete single transaksi
  const deleteTransaksi = useCallback((id: number) => {
    setData(prev => ({
      ...prev,
      transaksi: prev.transaksi.filter(t => t.id !== id),
      error: null
    }));
  }, []);

  return {
    // Data
    tabungan: data.tabungan,
    transaksi: data.transaksi,
    lastSync: data.lastSync,
    isLoading: data.isLoading,
    error: data.error,
    isOnline: data.isOnline,
    storageType: data.storageType,
    storageSupport,

    // Actions
    loadFromLocal,
    saveToLocal,
    clearLocal,
    updateData,
    
    // CRUD operations
    addTabungan,
    updateTabungan,
    deleteTabungan,
    addTransaksi,
    updateTransaksi,
    deleteTransaksi,
    
    // Utilities
    isDataStale,
    getStorageInfo,
    exportData,
    importData
  };
}