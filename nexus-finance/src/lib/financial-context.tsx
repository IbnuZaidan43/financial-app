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
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Helper function untuk mendapatkan API URL berdasarkan environment
const getApiUrl = (endpoint: string) => {
  if (process.env.NODE_ENV === 'development') {
    return `${endpoint}?XTransformPort=3000`;
  }
  return endpoint;
};

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [tabungan, setTabungan] = useState<TabunganData[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiData[]>([]);

  const refreshTabungan = async () => {
    try {
      console.log('🔄 Refreshing tabungan...');
      const response = await fetch(getApiUrl('/api/savings'));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch savings: ${response.status}`);
      }
      
      const data = await response.json();
      setTabungan(data);
      console.log('✅ Tabungan refreshed:', data);
    } catch (error) {
      console.error('Error refreshing tabungan:', error);
    }
  };

  const refreshTransaksi = async () => {
    try {
      console.log('🔄 Refreshing transaksi...');
      const response = await fetch(getApiUrl('/api/transactions'));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }
      
      const data = await response.json();
      setTransaksi(data);
      console.log('✅ Transaksi refreshed:', data);
    } catch (error) {
      console.error('Error refreshing transaksi:', error);
    }
  };

  const updateTabunganBalance = (id: number, newBalance: number) => {
    console.log('🔄 Updating balance in context:', { id, newBalance });
    setTabungan(prev => 
      prev.map(t => 
        t.id === id ? { ...t, jumlah: newBalance } : t
      )
    );
    console.log('✅ Balance updated in context');
  };

  // Initial load menggunakan useEffect (bukan useState)
  useEffect(() => {
    console.log('🚀 FinancialProvider mounted, loading initial data...');
    refreshTabungan();
    refreshTransaksi();
  }, []);

  return (
    <FinancialContext.Provider value={{
      tabungan,
      transaksi,
      refreshTabungan,
      refreshTransaksi,
      updateTabunganBalance
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