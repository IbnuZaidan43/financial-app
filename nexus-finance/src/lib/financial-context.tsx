'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Tabungan, Transaksi } from '@prisma/client';

interface FinancialContextType {
  tabungan: Tabungan[];
  transaksi: Transaksi[];
  refreshTabungan: () => Promise<void>;
  refreshTransaksi: () => Promise<void>;
  updateTabunganBalance: (id: number, newBalance: number) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [tabungan, setTabungan] = useState<Tabungan[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);

  const refreshTabungan = async () => {
    try {
      const response = await fetch('/api/savings');
      const data = await response.json();
      setTabungan(data);
      console.log('✅ Tabungan refreshed:', data);
    } catch (error) {
      console.error('Error refreshing tabungan:', error);
    }
  };

  const refreshTransaksi = async () => {
    try {
      const response = await fetch('/api/transactions');
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

  // Initial load
  useState(() => {
    refreshTabungan();
    refreshTransaksi();
  });

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