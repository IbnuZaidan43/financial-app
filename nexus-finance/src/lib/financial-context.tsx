'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Tabungan, Transaksi } from '@prisma/client';

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

interface FinancialContextType {
  tabungan: TabunganData[];
  transaksi: TransaksiData[];
  refreshTabungan: () => Promise<void>;
  refreshTransaksi: () => Promise<void>;
  updateTabunganBalance: (id: number, newBalance: number) => void;
  userId: string;  // ← NEW: Expose userId
  createTabungan: (data: { nama: string; saldoAwal: number }) => Promise<any>;  // ← NEW: Add create method
  createTransaksi: (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: number;
    tabunganId?: number;
  }) => Promise<any>;  // ← NEW: Add create method
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

  // ← NEW: Initialize userId on mount
  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    console.log('👤 FinancialProvider initialized with userId:', currentUserId);
  }, []);

  const refreshTabungan = async () => {
    try {
      console.log('🔄 Refreshing tabungan for userId:', userId);
      const response = await fetch(getApiUrl('/api/savings', userId));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch savings: ${response.status}`);
      }
      
      const data = await response.json();
      setTabungan(data);
      console.log('✅ Tabungan refreshed:', data, 'for user:', userId);
    } catch (error) {
      console.error('Error refreshing tabungan:', error);
    }
  };

  const refreshTransaksi = async () => {
    try {
      console.log('🔄 Refreshing transaksi for userId:', userId);
      const response = await fetch(getApiUrl('/api/transactions', userId));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }
      
      const data = await response.json();
      setTransaksi(data);
      console.log('✅ Transaksi refreshed:', data, 'for user:', userId);
    } catch (error) {
      console.error('Error refreshing transaksi:', error);
    }
  };

  const updateTabunganBalance = (id: number, newBalance: number) => {
    console.log('🔄 Updating balance in context:', { id, newBalance, userId });
    setTabungan(prev => 
      prev.map(t => 
        t.id === id ? { ...t, jumlah: newBalance } : t
      )
    );
    console.log('✅ Balance updated in context');
  };

  // ← NEW: Enhanced initial load with userId dependency
  useEffect(() => {
    if (userId !== 'default_user') {
      console.log('🚀 FinancialProvider mounted, loading initial data for userId:', userId);
      refreshTabungan();
      refreshTransaksi();
    }
  }, [userId]); // ← Changed dependency from [] to [userId]

  // ← NEW: Method to create savings with userId
  const createTabungan = async (data: { nama: string; saldoAwal: number }) => {
    try {
      console.log('💾 Creating tabungan for userId:', userId, data);
      const response = await fetch(getApiUrl('/api/savings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId: userId  // ← NEW: Include userId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create savings: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Tabungan created:', result);
      
      // Refresh data
      await refreshTabungan();
      
      return result;
    } catch (error) {
      console.error('Error creating tabungan:', error);
      throw error;
    }
  };

  // ← NEW: Method to create transaction with userId
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
      const response = await fetch(getApiUrl('/api/transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId: userId  // ← NEW: Include userId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create transaction: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Transaction created:', result);
      
      // Refresh data
      await refreshTransaksi();
      await refreshTabungan();
      
      return result;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  };

  return (
    <FinancialContext.Provider value={{
      tabungan,
      transaksi,
      refreshTabungan,
      refreshTransaksi,
      updateTabunganBalance,
      userId,  // ← NEW: Expose userId
      createTabungan,  // ← NEW: Expose create method
      createTransaksi  // ← NEW: Expose create method
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