'use client';

import { useSession } from 'next-auth/react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { syncTransaksiToCloud, syncTabunganToCloud, getFinancialData, deleteTabunganFromCloud, deleteTransaksiFromCloud } from '@/app/actions';
import * as XLSX from 'xlsx';

interface TabunganData {
  id: string;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TransaksiData {
  id: string;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: string | Date;
  tipe: string;
  kategoriId: string | null;
  tabunganId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

type DataSource = 'local';

interface FinancialContextType {
  tabungan: TabunganData[];
  transaksi: TransaksiData[];
  refreshTabungan: () => Promise<void>;
  refreshTransaksi: () => Promise<void>;
  updateTabunganBalance: (id: string, newBalance: number) => void;
  userId: string;
  createTabungan: (data: { nama: string; saldoAwal: number }) => Promise<any>;
  createTransaksi: (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: string;
    tabunganId?: string;
  }) => Promise<any>;
  dataSource: DataSource;
  isOnline: boolean;
  lastSync: Date | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  forceSync: () => Promise<void>;
  exportData: (type: 'transactions' | 'savings') => Promise<void>;
  importData: (file: File) => Promise<any>;
  updateTabungan: (id: string, data: { nama: string; saldoAwal: number }) => Promise<void>;
  deleteTabungan: (id: string) => Promise<void>;
  deleteTransaksi: (id: string) => Promise<void>;
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

export const getKategoriFromNama = (nama: string) => {
  const lowerNama = nama.toLowerCase();
  if (lowerNama.includes('bca') || lowerNama.includes('mandiri') || lowerNama.includes('bni') || 
      lowerNama.includes('bri') || lowerNama.includes('cimb') || lowerNama.includes('danamon') ||
      lowerNama.includes('permata') || lowerNama.includes('bank')) {
    return 'bank';
  } else if (lowerNama.includes('gopay') || lowerNama.includes('ovo') || lowerNama.includes('dana') || 
             lowerNama.includes('shopeepay') || lowerNama.includes('linkaja') || lowerNama.includes('sakuku')) {
    return 'e-wallet';
  } else if (lowerNama.includes('ktm') || lowerNama.includes('tapcash') || lowerNama.includes('flazz') || lowerNama.includes('brizzi') || 
             lowerNama.includes('emoney') || lowerNama.includes('ezlink')) {
    return 'e-money';
  } else if (lowerNama.includes('cash') || lowerNama.includes('tunai') || lowerNama.includes('uang')) {
    return 'cash';
  }
  return 'lainnya';
};

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [tabungan, setTabungan] = useState<TabunganData[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiData[]>([]);
  const { data: session, status } = useSession();
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
      throw error;
    }
  };

  const [isMigrating, setIsMigrating] = useState(false);
  useEffect(() => {
    const handleIdentityAndMigration = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        const currentId = session.user.id;
        const anonId = localStorage.getItem('financeUserId');

        if (anonId && anonId !== currentId && anonId !== 'default_user' && !isMigrating) {
          setIsMigrating(true);
          console.log('🔄 Mendeteksi data anonim, memulai migrasi...');
          
          try {
            const tabKey = `finance_data_tabungan_${anonId}`;
            const trxKey = `finance_data_transaksi_${anonId}`;
            
            const oldTabungan = localStorage.getItem(tabKey);
            const oldTransaksi = localStorage.getItem(trxKey);
            
            if (oldTabungan || oldTransaksi) {
              const tabunganData = JSON.parse(oldTabungan || '[]');
              const transaksiData = JSON.parse(oldTransaksi || '[]');

              await Promise.all([
                ...tabunganData.map((tab: any) => syncTabunganToCloud(currentId, tab)),
                ...transaksiData.map((trx: any) => syncTransaksiToCloud(currentId, trx))
              ]);
              
              localStorage.removeItem(tabKey);
              localStorage.removeItem(trxKey);
              console.log('✅ Data berhasil dikirim ke Cloud');
            }

            localStorage.removeItem('financeUserId');
            document.cookie = "guest-mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
            
            console.log('✅ Migrasi tuntas, menyegarkan sesi...');
            window.location.href = "/";
            
          } catch (err) {
            console.error('❌ Migrasi gagal:', err);
            setIsMigrating(false);
          }
        } else {
          if (userId !== currentId) {
            setUserId(currentId);
          }
        }
      } else if (status === 'unauthenticated') {
        const id = getUserId();
        if (userId !== id) setUserId(id);
      }
    };

    handleIdentityAndMigration();
  }, [status, session?.user?.id, isMigrating]);

  const fetchFromCloud = async (id: string) => {
    if (!navigator.onLine || id === 'default_user') return;
    setSyncStatus('syncing');

    try {
      const cloudData = await getFinancialData(id);
      if (cloudData && (cloudData.tabungan.length > 0 || cloudData.transaksi.length > 0)) {
        setTabungan(cloudData.tabungan);
        setTransaksi(cloudData.transaksi);
        updateData(cloudData.tabungan, cloudData.transaksi);
        console.log('✅ Data berhasil disinkronkan dari Cloud');
      }
      
      setSyncStatus('synced');
      setLastSync(new Date());
    } catch (error) {
      console.error('❌ Gagal fetch dari cloud:', error);
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    if (userId !== 'default_user') {
      const initData = async () => {
        await loadFromLocal();
        setTabungan(localTabungan);
        setTransaksi(localTransaksi);

        if (status === 'authenticated') {
          await fetchFromCloud(userId);
        }
      };

      initData();
    }
  }, [userId, status]);

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

  const updateTabunganBalance = (id: string, newBalance: number) => {
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
      id: crypto.randomUUID(),
      nama: data.nama,
      saldoAwal: data.saldoAwal,
      jumlah: data.saldoAwal,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setTabungan((prev) => [...prev, newTabungan]);
    
    try {
      await updateData([...tabungan, newTabungan], transaksi);
      await syncToCloud('tabungan', newTabungan);

      return newTabungan;
    } catch (error) {
      refreshTabungan();
      throw error;
    }
  };

  const updateTabungan = async (id: string, data: { nama: string; saldoAwal: number }) => {
    const oldData = [...tabungan];

    setTabungan((prev) => 
      prev.map((t) => t.id === id ? { 
        ...t, nama: data.nama, saldoAwal: data.saldoAwal, jumlah: data.saldoAwal,updatedAt: new Date() 
      } : t)
    );

    try {
      const updatedObj = { id, ...data, jumlah: data.saldoAwal, updatedAt: new Date() };
      await updateData(tabungan.map(t => t.id === id ? (updatedObj as any) : t), transaksi);
      await syncToCloud('tabungan', updatedObj);
      
      if (status === 'authenticated') await fetchFromCloud(userId);
    } catch (error) {
      setTabungan(oldData);
      throw error;
    }
  };

  const deleteTabungan = async (id: string) => {
    const oldData = [...tabungan];
    setTabungan((prev) => prev.filter((t) => t.id !== id));

    try {
      await updateData(tabungan.filter(t => t.id !== id), transaksi);
      if (status === 'authenticated') {
        await deleteTabunganFromCloud(userId, id);
        await fetchFromCloud(userId);
      }
    } catch (error) {
      setTabungan(oldData);
      throw error;
    }
  };

  const createTransaksi = async (data: {
    judul: string;
    jumlah: number;
    deskripsi?: string;
    tanggal: string;
    tipe: string;
    kategoriId?: string;
    tabunganId?: string;
  }) => {
    const newTransaksi: TransaksiData = {
      id: crypto.randomUUID(),
      judul: data.judul || (data.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'),
      jumlah: data.jumlah,
      deskripsi: data.deskripsi || null,
      tanggal: new Date(data.tanggal).toISOString(), 
      tipe: data.tipe,
      kategoriId: data.kategoriId || null,
      tabunganId: data.tabunganId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const oldTransactions = [...transaksi];
    const oldSavings = [...tabungan];
    const newTransactionsList = [newTransaksi, ...oldTransactions];
    setTransaksi(newTransactionsList);

    let affectedTab: TabunganData | null = null;
    let newTabunganList = [...oldSavings];

    if (data.tabunganId) {
      newTabunganList = oldSavings.map((t) => {
        if (t.id === data.tabunganId) {
          const change = data.tipe === 'pengeluaran' ? -data.jumlah : data.jumlah;
          const updated = { ...t, jumlah: t.jumlah + change, updatedAt: new Date() };
          affectedTab = updated;
          return updated;
        }
        return t;
      });
      setTabungan(newTabunganList);
    }

    try {
      await updateData(newTabunganList, newTransactionsList);
      await syncToCloud('transaksi', newTransaksi);
      
      if (affectedTab) {
        console.log('☁️ Sinkronisasi saldo tabungan ke Supabase...');
        await syncToCloud('tabungan', affectedTab);
      }
      
      return newTransaksi;
    } catch (error) {
      console.error("❌ Gagal sinkron ke Cloud, memulihkan data lokal...", error);
      setTransaksi(oldTransactions);
      setTabungan(oldSavings);
      await updateData(oldSavings, oldTransactions);
      throw error;
    }
  };

  const deleteTransaksi = async (id: string) => {
    const transactionToDelete = transaksi.find((t) => t.id === id);
    if (!transactionToDelete) return;

    const originalTransactions = [...transaksi];
    const originalSavings = [...tabungan];
    const updatedTransactions = originalTransactions.filter((t) => t.id !== id);
    setTransaksi(updatedTransactions);

    let affectedTab: TabunganData | null = null;
    let newTabunganList = [...originalSavings];

    if (transactionToDelete.tabunganId) {
      newTabunganList = originalSavings.map((t) => {
        if (t.id === transactionToDelete.tabunganId) {
          const amountChange = transactionToDelete.tipe === 'pemasukan' 
            ? -transactionToDelete.jumlah
            : transactionToDelete.jumlah;
          
          const updated = { ...t, jumlah: t.jumlah + amountChange, updatedAt: new Date() };
          affectedTab = updated;
          return updated;
        }
        return t;
      });
      setTabungan(newTabunganList);
    }

    try {
      await updateData(newTabunganList, updatedTransactions);
      if (status === 'authenticated') {
        await deleteTransaksiFromCloud(userId, id);
        if (affectedTab) {
          await syncTabunganToCloud(userId, affectedTab);
        }
      }
      
      console.log('✅ Berhasil hapus transaksi');
    } catch (error) {
      setTransaksi(originalTransactions);
      setTabungan(originalSavings);
      await updateData(originalSavings, originalTransactions);
      console.error("❌ Gagal hapus, data dipulihkan");
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
      const workbook = XLSX.utils.book_new();
      let fileName: string;
  
      if (type === 'transactions') {
        const categoriesOrder = ['bank', 'e-wallet', 'e-money', 'cash', 'lainnya'];
        const groupedTransactions: Record<string, typeof transaksi> = {};
  
        transaksi.forEach(t => {
          const monthYear = new Date(t.tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          if (!groupedTransactions[monthYear]) groupedTransactions[monthYear] = [];
          groupedTransactions[monthYear].push(t);
        });
  
        if (Object.keys(groupedTransactions).length === 0) {
          const emptySheet = XLSX.utils.json_to_sheet([{ Pesan: 'Tidak ada data transaksi' }]);
          XLSX.utils.book_append_sheet(workbook, emptySheet, 'Data Kosong');
        } else {
          Object.entries(groupedTransactions).forEach(([monthYear, monthTransactions]) => {
            const sortedTrx = [...monthTransactions].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
            const firstTrxInMonth = sortedTrx[0];
            const startOfMonth = new Date(
              new Date(firstTrxInMonth.tanggal).getFullYear(),
              new Date(firstTrxInMonth.tanggal).getMonth(),
              1
            ).getTime();
  
            const activeTabungan = [...tabungan];
            const headerRow4 = ['No', 'Tanggal'];
            const headerRow5 = ['', ''];
            const merges: any[] = [];
            const colMap: Record<string, { in: number; out: number; balance: number }> = {};
            const catMap: Record<string, { balance: number; tabs: string[] }> = {}; 
            let currentCol = 2; 
  
            categoriesOrder.forEach(cat => {
              const tabsInCat = activeTabungan.filter(t => getKategoriFromNama(t.nama) === cat);
              if (tabsInCat.length === 0) return;
  
              catMap[cat] = { balance: 0, tabs: tabsInCat.map(t => t.id) };
  
              tabsInCat.forEach(tab => {
                headerRow4.push(tab.nama, '', `Saldo ${tab.nama}`);
                headerRow5.push('IN', 'OUT', '');
                
                merges.push({ s: { r: 3, c: currentCol }, e: { r: 3, c: currentCol + 1 } });
                merges.push({ s: { r: 3, c: currentCol + 2 }, e: { r: 4, c: currentCol + 2 } });
                
                colMap[tab.id] = { in: currentCol, out: currentCol + 1, balance: currentCol + 2 };
                currentCol += 3;
              });
  
              const catLabel = cat.toUpperCase();
              headerRow4.push(`TOTAL SALDO ${catLabel}`);
              headerRow5.push('');
              
              merges.push({ s: { r: 3, c: currentCol }, e: { r: 4, c: currentCol } }); 
              
              catMap[cat].balance = currentCol;
              currentCol += 1; 
            });
  
            const totalColIndex = currentCol;
            const noteColIndex = currentCol + 1;
            headerRow4.push('TOTAL SALDO', 'DESKRIPSI / CATATAN');
            headerRow5.push('', '');
            merges.push({ s: { r: 3, c: totalColIndex }, e: { r: 4, c: totalColIndex } });
            merges.push({ s: { r: 3, c: noteColIndex }, e: { r: 4, c: noteColIndex } });
  
            const dataRows: any[][] = [];
            const runningBalances: Record<string, number> = {}; 
            
            activeTabungan.forEach(tab => { 
              let startBal = tab.saldoAwal || 0;
              const pastTrx = transaksi.filter(t => t.tabunganId === tab.id && new Date(t.tanggal).getTime() < startOfMonth);
              
              pastTrx.forEach(t => {
                if (t.tipe === 'pemasukan') startBal += t.jumlah;
                else startBal -= t.jumlah;
              });
              
              runningBalances[tab.id] = startBal; 
            });

            const initialRow = new Array(noteColIndex + 1).fill('-');
            initialRow[0] = '';
            initialRow[1] = '';
            initialRow[noteColIndex] = 'SALDO AWAL BULAN';

            let initialGrandTotal = 0;
            Object.keys(catMap).forEach(cat => {
              let catBal = 0;
              catMap[cat].tabs.forEach(tabId => {
                const b = runningBalances[tabId] || 0;
                initialRow[colMap[tabId].balance] = b;
                catBal += b;
              });
              initialRow[catMap[cat].balance] = catBal;
              initialGrandTotal += catBal;
            });
            initialRow[totalColIndex] = initialGrandTotal;
            dataRows.push(initialRow);
  
            let lastDate = '';
            let startMergeRow = -1;
            const DATA_START_ROW_INDEX = 6; 
  
            sortedTrx.forEach((trx, index) => {
              const currentRowIndex = DATA_START_ROW_INDEX + index;
              const trxDate = new Date(trx.tanggal).toLocaleDateString('id-ID');
              const row = new Array(noteColIndex + 1).fill('-');
              row[0] = index + 1;
              row[noteColIndex] = trx.judul + (trx.deskripsi ? ` - ${trx.deskripsi}` : '');
  
              if (trxDate !== lastDate) {
                if (startMergeRow !== -1 && currentRowIndex - 1 > startMergeRow) {
                  merges.push({ s: { r: startMergeRow, c: 1 }, e: { r: currentRowIndex - 1, c: 1 } });
                }
                lastDate = trxDate;
                startMergeRow = currentRowIndex;
                row[1] = trxDate; 
              } else {
                row[1] = ''; 
              }
  
              if (trx.tabunganId && colMap[trx.tabunganId]) {
                const cols = colMap[trx.tabunganId];
                const amount = trx.jumlah;
                
                if (trx.tipe === 'pemasukan') {
                  row[cols.in] = amount;
                  runningBalances[trx.tabunganId] += amount;
                } else {
                  row[cols.out] = amount;
                  runningBalances[trx.tabunganId] -= amount;
                }
              }
  
              let grandTotal = 0;
              Object.keys(catMap).forEach(cat => {
                let catBalance = 0;
  
                catMap[cat].tabs.forEach(tabId => {
                  const cols = colMap[tabId];
                  const b = runningBalances[tabId] || 0;
                  row[cols.balance] = b; 
                  catBalance += b;
                });
  
                row[catMap[cat].balance] = catBalance;
                grandTotal += catBalance;
              });
  
              row[totalColIndex] = grandTotal;
              dataRows.push(row);
            });
  
            const lastDataRowIndex = DATA_START_ROW_INDEX + sortedTrx.length - 1;
            if (startMergeRow !== -1 && lastDataRowIndex > startMergeRow) {
              merges.push({ s: { r: startMergeRow, c: 1 }, e: { r: lastDataRowIndex, c: 1 } });
            }
  
            const wsData = [
              [`Laporan Keuangan Bulan ${monthYear}`], 
              [''],                                   
              [''],                                   
              headerRow4,                             
              headerRow5,                             
              ...dataRows                             
            ];
            const worksheet = XLSX.utils.aoa_to_sheet(wsData);
            const colWidths = [{ wch: 5 }, { wch: 15 }]; 
            for(let i = 2; i < noteColIndex; i++) colWidths.push({ wch: 15 });
            colWidths.push({ wch: 30 }); 
            worksheet['!cols'] = colWidths;
  
            merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: noteColIndex } }); 
            merges.push({ s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }); 
            merges.push({ s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }); 
            
            worksheet['!merges'] = merges;
            XLSX.utils.book_append_sheet(workbook, worksheet, monthYear);
          });
        }
  
        fileName = `Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.xlsx`;
  
      } else {
        const dataForExcel = tabungan.map(t => ({
          'Nama Dompet / Bank': t.nama,
          'Total Saldo Saat Ini': new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(t.jumlah),
          'Tanggal Dibuat': new Date(t.createdAt).toLocaleDateString('id-ID')
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        worksheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabungan');
        fileName = `Laporan_Tabungan_${new Date().toISOString().split('T')[0]}.xlsx`;
      }
  
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error(`❌ Failed to export ${type}:`, error);
      throw error;
    }
  };

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
              id: crypto.randomUUID(),
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
      importData,
      updateTabungan,
      deleteTabungan,
      deleteTransaksi
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