'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Tabungan, Transaksi } from '@prisma/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Interface untuk data dari API (mungkin berbeda dari Prisma types)
interface TabunganData {
  id: number;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TransaksiData {
  id: number;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: string | Date;
  tipe: string;
  kategoriId: number | null;
  tabunganId: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// NEW: Data source types
type DataSource = 'server' | 'local' | 'mixed';

interface FinancialContextType {
  tabungan: TabunganData[];
  transaksi: TransaksiData[];
  refreshTabungan: () => Promise<void>;
  refreshTransaksi: () => Promise<void>;
  updateTabunganBalance: (id: number, newBalance: number) => void;
  userId: string;
  createTabungan: (data: { nama: string; saldoAwal: number }) => Promise<any>;
  createTransaksi: (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: number;
    tabunganId?: number;
  }) => Promise<any>;
  // NEW: Local storage integration
  dataSource: DataSource;
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  forceSync: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Helper function untuk mendapatkan API URL berdasarkan environment
const getApiUrl = (endpoint: string, userId?: string) => {
  let url = endpoint;
  
  if (process.env.NODE_ENV === 'development') {
    url += '?XTransformPort=3000';
    
    // ← NEW: Add userId to URL for GET requests
    if (userId) {
      url += `&userId=${userId}`;
    }
  } else {
    // ← NEW: Add userId to URL for production
    if (userId) {
      url += `?userId=${userId}`;
    }
  }
  
  return url;
};

// ← NEW: Helper function untuk user management
const getUserId = () => {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return 'default_user'; // Server-side fallback
  }
  
  let userId = localStorage.getItem('financeUserId');
  if (!userId) {
    // Generate unique user ID
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('financeUserId', userId);
    console.log('🆔 Generated new userId:', userId);
  } else {
    console.log('🆔 Using existing userId:', userId);
  }
  
  return userId;
};

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [tabungan, setTabungan] = useState<TabunganData[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiData[]>([]);
  const [userId, setUserId] = useState<string>('default_user');
  
  // NEW: Local storage integration
  const [dataSource, setDataSource] = useState<DataSource>('server');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [isUsingLocalData, setIsUsingLocalData] = useState(false);

  // NEW: Initialize local storage hook
  const {
    tabungan: localTabungan,
    transaksi: localTransaksi,
    lastSync,
    isOnline: isStorageOnline,
    storageType,
    loadFromLocal,
    saveToLocal,
    updateData
  } = useLocalStorage({
    userId: 'default_user', // Will be updated when userId is set
    autoSave: true,
    autoLoad: true
  });

  // ← NEW: Initialize userId on mount
  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    console.log('👤 FinancialProvider initialized with userId:', currentUserId);
  }, []);

  // NEW: Update local storage userId when it changes
  useEffect(() => {
    if (userId !== 'default_user') {
      console.log('🔄 Updating local storage userId:', userId);
      // Note: useLocalStorage hook doesn't support dynamic userId change
      // This is a limitation we'll address in future iterations
    }
  }, [userId]);

  // NEW: Determine data source based on online status and local data
  const determineDataSource = (): DataSource => {
    if (!isStorageOnline) {
      return 'local';
    }
    
    const hasLocalData = localTabungan.length > 0 || localTransaksi.length > 0;
    const hasServerData = tabungan.length > 0 || transaksi.length > 0;
    
    if (hasLocalData && hasServerData) {
      return 'mixed';
    } else if (hasLocalData) {
      return 'local';
    } else {
      return 'server';
    }
  };

  // NEW: Update data source state
  useEffect(() => {
    const newDataSource = determineDataSource();
    setDataSource(newDataSource);
    
    // Update sync status based on online status
    if (!isStorageOnline) {
      setSyncStatus('offline');
    } else if (lastSync && new Date().getTime() - lastSync.getTime() < 60000) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('syncing');
    }
  }, [isStorageOnline, localTabungan, localTransaksi, tabungan, transaksi, lastSync]);

  // NEW: Merge server and local data
  const getMergedData = () => {
    const serverTabungan = tabungan;
    const serverTransaksi = transaksi;
    const localTabunganData = localTabungan;
    const localTransaksiData = localTransaksi;

    // For now, prioritize server data when online, local data when offline
    if (isStorageOnline) {
      return {
        tabungan: serverTabungan.length > 0 ? serverTabungan : localTabunganData,
        transaksi: serverTransaksi.length > 0 ? serverTransaksi : localTransaksiData
      };
    } else {
      return {
        tabungan: localTabunganData,
        transaksi: localTransaksiData
      };
    }
  };

  // NEW: Get current data (merged)
  const currentData = getMergedData();

  const refreshTabungan = async () => {
    try {
      console.log('🔄 Refreshing tabungan for userId:', userId);
      
      // NEW: Try server first if online
      if (isStorageOnline) {
        const response = await fetch(getApiUrl('/api/savings', userId));
        
        if (response.ok) {
          const data = await response.json();
          setTabungan(data);
          console.log('✅ Tabungan refreshed from server:', data, 'for user:', userId);
          
          // NEW: Save to local storage for offline access
          try {
            await saveToLocal(data, localTransaksi);
            console.log('💾 Tabungan saved to local storage');
          } catch (saveError) {
            console.warn('⚠️ Failed to save tabungan to local storage:', saveError);
          }
        } else {
          throw new Error(`Failed to fetch savings: ${response.status}`);
        }
      } else {
        // NEW: Use local data when offline
        console.log('📱 Using local tabungan data (offline mode)');
        setTabungan(localTabungan);
      }
    } catch (error) {
      console.error('Error refreshing tabungan:', error);
      
      // NEW: Fallback to local data on error
      console.log('📱 Falling back to local tabungan data');
      setTabungan(localTabungan);
      setSyncStatus('error');
    }
  };

  const refreshTransaksi = async () => {
    try {
      console.log('🔄 Refreshing transaksi for userId:', userId);
      
      // NEW: Try server first if online
      if (isStorageOnline) {
        const response = await fetch(getApiUrl('/api/transactions', userId));
        
        if (response.ok) {
          const data = await response.json();
          setTransaksi(data);
          console.log('✅ Transaksi refreshed from server:', data, 'for user:', userId);
          
          // NEW: Save to local storage for offline access
          try {
            await saveToLocal(localTabungan, data);
            console.log('💾 Transaksi saved to local storage');
          } catch (saveError) {
            console.warn('⚠️ Failed to save transaksi to local storage:', saveError);
          }
        } else {
          throw new Error(`Failed to fetch transactions: ${response.status}`);
        }
      } else {
        // NEW: Use local data when offline
        console.log('📱 Using local transaksi data (offline mode)');
        setTransaksi(localTransaksi);
      }
    } catch (error) {
      console.error('Error refreshing transaksi:', error);
      
      // NEW: Fallback to local data on error
      console.log('📱 Falling back to local transaksi data');
      setTransaksi(localTransaksi);
      setSyncStatus('error');
    }
  };

  const updateTabunganBalance = (id: number, newBalance: number) => {
    console.log('🔄 Updating balance in context:', { id, newBalance, userId });
    
    // Update server state
    setTabungan(prev => 
      prev.map(t => 
        t.id === id ? { ...t, jumlah: newBalance } : t
      )
    );
    
    // NEW: Update local storage immediately
    const updatedTabungan = tabungan.map(t => 
      t.id === id ? { ...t, jumlah: newBalance } : t
    );
    
    try {
      updateData(updatedTabungan, transaksi);
      console.log('💾 Balance updated in local storage');
    } catch (error) {
      console.warn('⚠️ Failed to update balance in local storage:', error);
    }
    
    console.log('✅ Balance updated in context');
  };

  // ← NEW: Enhanced initial load with userId dependency
  useEffect(() => {
    if (userId !== 'default_user') {
      console.log('🚀 FinancialProvider mounted, loading initial data for userId:', userId);
      
      // NEW: Load from local storage first for instant UI
      loadFromLocal().then(() => {
        console.log('📱 Local data loaded, refreshing from server...');
      });
      
      // Then refresh from server
      refreshTabungan();
      refreshTransaksi();
    }
  }, [userId]); // ← Changed dependency from [] to [userId]

  // ← NEW: Method to create savings with userId and local storage
  const createTabungan = async (data: { nama: string; saldoAwal: number }) => {
    try {
      console.log('💾 Creating tabungan for userId:', userId, data);
      
      // NEW: Save to local storage immediately for offline support
      const tempTabungan = {
        id: Date.now(), // Temporary ID
        nama: data.nama,
        saldoAwal: data.saldoAwal,
        jumlah: data.saldoAwal,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Update local state immediately
      setTabungan(prev => [...prev, tempTabungan]);
      
      try {
        updateData([...tabungan, tempTabungan], transaksi);
        console.log('💾 Tabungan saved to local storage immediately');
      } catch (saveError) {
        console.warn('⚠️ Failed to save tabungan to local storage:', saveError);
      }
      
      // NEW: Try server if online
      if (isStorageOnline) {
        const response = await fetch(getApiUrl('/api/savings'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            userId: userId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Tabungan created on server:', result);
          
          // Replace temporary data with server data
          setTabungan(prev => prev.map(t => t.id === tempTabungan.id ? result : t));
          
          // Update local storage with server data
          try {
            updateData(tabungan.map(t => t.id === tempTabungan.id ? result : t), transaksi);
            console.log('💾 Local storage updated with server data');
          } catch (saveError) {
            console.warn('⚠️ Failed to update local storage:', saveError);
          }
          
          return result;
        } else {
          throw new Error(`Failed to create savings: ${response.status}`);
        }
      } else {
        // NEW: Return local data when offline
        console.log('📱 Tabungan created locally (offline mode)');
        return tempTabungan;
      }
    } catch (error) {
      console.error('Error creating tabungan:', error);
      
      // NEW: Revert local state on error
      setTabungan(prev => prev.filter(t => t.id !== Date.now()));
      throw error;
    }
  };

  // ← NEW: Method to create transaction with userId and local storage
  const createTransaksi = async (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: number;
    tabunganId?: number;
  }) => {
    try {
      console.log('💾 Creating transaction for userId:', userId, data);
      
      // NEW: Save to local storage immediately for offline support
      const tempTransaksi = {
        id: Date.now(), // Temporary ID
        judul: data.judul,
        jumlah: data.jumlah,
        deskripsi: data.deskripsi || null,
        tanggal: data.tanggal,
        tipe: data.tipe,
        kategoriId: data.kategoriId || null,
        tabunganId: data.tabunganId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Update local state immediately
      setTransaksi(prev => [tempTransaksi, ...prev]);
      
      try {
        updateData(tabungan, [tempTransaksi, ...transaksi]);
        console.log('💾 Transaksi saved to local storage immediately');
      } catch (saveError) {
        console.warn('⚠️ Failed to save transaksi to local storage:', saveError);
      }
      
      // NEW: Try server if online
      if (isStorageOnline) {
        const response = await fetch(getApiUrl('/api/transactions'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            userId: userId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Transaction created on server:', result);
          
          // Replace temporary data with server data
          setTransaksi(prev => prev.map(t => t.id === tempTransaksi.id ? result : t));
          
          // Update local storage with server data
          try {
            updateData(tabungan, transaksi.map(t => t.id === tempTransaksi.id ? result : t));
            console.log('💾 Local storage updated with server data');
          } catch (saveError) {
            console.warn('⚠️ Failed to update local storage:', saveError);
          }
          
          // Refresh tabungan to update balances
          await refreshTabungan();
          
          return result;
        } else {
          throw new Error(`Failed to create transaction: ${response.status}`);
        }
      } else {
        // NEW: Return local data when offline
        console.log('📱 Transaksi created locally (offline mode)');
        return tempTransaksi;
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      
      // NEW: Revert local state on error
      setTransaksi(prev => prev.filter(t => t.id !== Date.now()));
      throw error;
    }
  };

  // NEW: Force sync method
  const forceSync = async () => {
    if (!isStorageOnline) {
      console.log('📱 Cannot sync while offline');
      return;
    }
    
    setSyncStatus('syncing');
    console.log('🔄 Force syncing data...');
    
    try {
      await refreshTabungan();
      await refreshTransaksi();
      setSyncStatus('synced');
      console.log('✅ Force sync completed');
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      setSyncStatus('error');
      throw error;
    }
  };

  return (
    <FinancialContext.Provider value={{
      // Use merged data for better UX
      tabungan: currentData.tabungan,
      transaksi: currentData.transaksi,
      refreshTabungan,
      refreshTransaksi,
      updateTabunganBalance,
      userId,
      createTabungan,
      createTransaksi,
      // NEW: Local storage integration
      dataSource,
      isOnline: isStorageOnline,
      lastSync,
      syncStatus,
      forceSync
    }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}