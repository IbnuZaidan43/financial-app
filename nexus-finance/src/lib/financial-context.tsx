'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Tabungan, Transaksi } from '@prisma/client';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { syncTransaksiToCloud, syncTabunganToCloud } from '@/app/actions';
import * as XLSX from 'xlsx';

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

// Data source types (disederhanakan untuk local-first)
type DataSource = 'local';

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
  dataSource: DataSource;
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  forceSync: () => Promise<void>;
  exportData: (type: 'transactions' | 'savings') => Promise<void>;
  importData: (file: File) => Promise<any>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

const getUserId = () => {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
  
  let id = localStorage.getItem('financeUserId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('financeUserId', id);
    console.log('🆔 Generated new userId:', id);
  } else {
    console.log('🆔 Using existing userId:', id);
  }
  return id;
};

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [tabungan, setTabungan] = useState<TabunganData[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiData[]>([]);
  const [userId, setUserId] = useState<string>('default_user');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const {
    tabungan: localTabungan,
    transaksi: localTransaksi,
    isOnline,
    loadFromLocal,
    updateData
  } = useLocalStorage({
    userId,
    autoSave: true,
    autoLoad: true
  });
  
  const syncToCloud = async (type: 'transaksi' | 'tabungan', data: any) => {
    if (!navigator.onLine || userId === 'default_user') {
      if (!navigator.onLine) setSyncStatus('offline');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      if (type === 'transaksi') {
        await syncTransaksiToCloud(userId, data);
      } else {
        await syncTabunganToCloud(userId, data);
      }
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (error) {
      console.error(`☁️ Sync Error (${type}):`, error);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    const currentUserId = getUserId();
    setUserId(currentUserId);
    console.log('👤 FinancialProvider initialized with userId:', currentUserId);
  }, []);

  useEffect(() => {
    if (userId !== 'default_user') {
      console.log('🚀 FinancialProvider mounted, loading initial data for userId:', userId);
      loadFromLocal().then(() => {
        console.log('📱 Local data loaded');
        setTabungan(localTabungan);
        setTransaksi(localTransaksi);
        setLastSync(new Date());

        if (navigator.onLine) {
          forceSync();
        }
      });
    }
  }, [userId]);

  const refreshTabungan = async () => {
    console.log('🔄 Refreshing tabungan from local storage...');
    try {
      await loadFromLocal();
      setTabungan(localTabungan);
      console.log('✅ Tabungan loaded from local storage');
    } catch (error) {
      console.error('Error loading tabungan from local storage:', error);
      setSyncStatus('error');
    }
  };

  const refreshTransaksi = async () => {
    try {
      await loadFromLocal();
      setTransaksi(localTransaksi);
      console.log('✅ Transaksi loaded from local storage');
    } catch (error) {
      console.error('Error loading transaksi from local storage:', error);
      setSyncStatus('error');
    }
  };

  const updateTabunganBalance = (id: number, newBalance: number) => {
    const target = tabungan.find(t => t.id === id);
    if (!target) return;

    const updatedTab: TabunganData = { 
      ...target, 
      jumlah: newBalance, 
      updatedAt: new Date() 
    };
    
    const newList = tabungan.map((t): TabunganData => 
      t.id === id ? updatedTab : t
    );

    setTabungan(newList);
    updateData(newList, transaksi);
    syncToCloud('tabungan', updatedTab);
  };

  const createTabungan = async (data: { nama: string; saldoAwal: number }) => {
    const newTabungan: TabunganData = {
      id: Date.now(),
      nama: data.nama,
      saldoAwal: data.saldoAwal,
      jumlah: data.saldoAwal,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updatedTabunganList = [...tabungan, newTabungan];
    setTabungan(updatedTabunganList);
    
    try {
      await updateData(updatedTabunganList, transaksi);
      setLastSync(new Date());
      syncToCloud('tabungan', newTabungan);
      return newTabungan;
    } catch (error) {
      setTabungan(tabungan);
      throw error;
    }
  };

  const createTransaksi = async (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: number;
    tabunganId?: number;
  }) => {
    const newTransaksi: TransaksiData = {
      id: Date.now(),
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

    let affectedTabungan: TabunganData | null = null;
    let updatedTabunganList: TabunganData[] = [...tabungan];

    if (data.tabunganId) {
      updatedTabunganList = tabungan.map((t): TabunganData => {
        if (t.id === data.tabunganId) {
          const change = data.tipe === 'pengeluaran' ? -data.jumlah : data.jumlah;
          const updatedObj = { ...t, jumlah: t.jumlah + change, updatedAt: new Date() };
          affectedTabungan = updatedObj;
          return updatedObj;
        }
        return t;
      });
    }

    const updatedTransaksiList = [newTransaksi, ...transaksi];
    setTransaksi(updatedTransaksiList);
    setTabungan(updatedTabunganList);
    
    try {
      await updateData(updatedTabunganList, updatedTransaksiList);
      setLastSync(new Date());
      syncToCloud('transaksi', newTransaksi);
      if (affectedTabungan) {
        syncToCloud('tabungan', affectedTabungan);
      }
      
      return newTransaksi;
    } catch (error) {
      setTransaksi(transaksi);
      setTabungan(tabungan);
      throw error;
    }
  };

  const forceSync = async () => {
    console.log('🔄 "Syncing" is just refreshing local data...');
    setSyncStatus('syncing');
    
    try {
      await loadFromLocal();
      setTabungan(localTabungan);
      setTransaksi(localTransaksi);
      setSyncStatus('synced');
      setLastSync(new Date());
      console.log('✅ Local data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh local data:', error);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
  const handleOnline = () => {
    console.log('🌐 Internet terdeteksi aktif! Menjalankan sinkronisasi otomatis...');
    forceSync(); 
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, [forceSync]);

  const exportData = async (type: 'transactions' | 'savings') => {
  try {
    let worksheet: XLSX.WorkSheet;
    let fileName: string;

    if (type === 'transactions') {
      const dataForExcel = transaksi.map(t => ({
        Tanggal: t.tanggal,
        Judul: t.judul,
        Keterangan: t.deskripsi || '',
        Jumlah: t.jumlah,
        Tipe: t.tipe,
        Tabungan: tabungan.find(tab => tab.id === t.tabunganId)?.nama || 'Tidak diketahui'
      }));
      worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      fileName = `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
      const dataForExcel = tabungan.map(t => ({
        Nama: t.nama,
        Saldo: t.jumlah,
        'Dibuat Tanggal': new Date(t.createdAt).toLocaleDateString('id-ID')
      }));
      worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      fileName = `Laporan_Tabungan_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'transactions' ? 'Transaksi' : 'Tabungan');
    XLSX.writeFile(workbook, fileName);

    console.log(`✅ ${type} exported successfully`);
  } catch (error) {
    console.error(`❌ Failed to export ${type}:`, error);
    throw error;
  }
};

// Fungsi untuk import dari Excel
const importData = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedTransactions: TransaksiData[] = [];
        for (const row of jsonData as any[]) {
          if (row.Tanggal && row.Jumlah && row.Tipe) {
            const newTransaction: TransaksiData = {
              id: Math.floor(Date.now() + Math.random()),
              judul: row.Judul || 'Transaksi Import',
              jumlah: parseFloat(row.Jumlah),
              deskripsi: row.Keterangan || null,
              tanggal: new Date(row.Tanggal).toISOString().split('T')[0],
              tipe: row.Tipe,
              tabunganId: tabungan.find(t => t.nama === row.Tabungan)?.id || null,
              kategoriId: null,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            importedTransactions.push(newTransaction);
          }
        }
        
        const updatedTransaksi = [...importedTransactions, ...transaksi];
        setTransaksi(updatedTransaksi);
        await updateData(tabungan, updatedTransaksi);

        importedTransactions.forEach(item => {
          syncToCloud('transaksi', item);
        });

        setLastSync(new Date());
        console.log(`✅ ${importedTransactions.length} transactions imported successfully`);
        resolve(importedTransactions);
      } catch (error) {
        console.error('❌ Failed to import data:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsBinaryString(file);
  });
};

  return (
    <FinancialContext.Provider value={{
      tabungan,
      transaksi,
      refreshTabungan,
      refreshTransaksi,
      updateTabunganBalance,
      userId,
      createTabungan,
      createTransaksi,
      dataSource: 'local',
      isOnline: !!isOnline,
      syncStatus,
      lastSync,
      forceSync,
      exportData,
      importData
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