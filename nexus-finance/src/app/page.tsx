'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Wallet, History, PiggyBank, FileText, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import DashboardTab from '@/components/tabs/DashboardTab';
import RiwayatTransaksiTab from '@/components/tabs/RiwayatTransaksiTab';
import TabunganTab from '@/components/tabs/TabunganTab';
import FileTab from '@/components/tabs/FileTab';
import TransaksiDialog from '@/components/dialogs/TransaksiDialog';

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
  deskripsi?: string | null;
  tanggal: string | Date;
  tipe: string;
  kategoriId?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default function KeuanganPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTransaksiDialog, setShowTransaksiDialog] = useState(false);
  const [tabungan, setTabungan] = useState<TabunganData[]>([]);
  const [transaksi, setTransaksi] = useState<TransaksiData[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadData();
  }, [activeTab, refreshKey]);

  const loadData = async () => {
    try {
      const [tabunganResponse, transaksiResponse] = await Promise.all([
        fetch('/api/savings'),
        fetch('/api/transactions')
      ]);
      
      if (!tabunganResponse.ok || !transaksiResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const [tabunganData, transaksiData] = await Promise.all([
        tabunganResponse.json(),
        transaksiResponse.json()
      ]);
      
      console.log('Loaded tabungan:', tabunganData);
      console.log('Loaded transaksi:', transaksiData);
      
      setTabungan(tabunganData);
      setTransaksi(transaksiData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleTransaksiSuccess = () => {
    setShowTransaksiDialog(false);
    setRefreshKey(prev => prev + 1);
  };

  const totalSaldo = tabungan.reduce((total, t) => {
    console.log('Calculating total - t:', t, 'jumlah:', t.jumlah);
    return total + t.jumlah;
  }, 0);

  console.log('Final total saldo:', totalSaldo);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Aplikasi Keuangan</h1>
              <p className="text-sm text-gray-600">Kelola keuangan pribadi dengan mudah</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Saldo</p>
              <p className="text-xl font-bold text-green-600">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(totalSaldo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white p-1 rounded-lg shadow-sm">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="riwayat" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Riwayat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tabungan" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <PiggyBank className="w-4 h-4" />
              <span className="hidden sm:inline">Tabungan</span>
            </TabsTrigger>
            <TabsTrigger 
              value="file" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">File</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardTab 
              tabungan={tabungan as any} 
              transaksi={transaksi as any}
              onDataUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="riwayat" className="space-y-6">
            <RiwayatTransaksiTab 
              transaksi={transaksi as any}
              tabungan={tabungan as any}
              onDataUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="tabungan" className="space-y-6">
            <TabunganTab 
              onDataUpdate={loadData}
            />
          </TabsContent>

          <TabsContent value="file" className="space-y-6">
            <FileTab />
          </TabsContent>
        </Tabs>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowTransaksiDialog(true)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg h-14 w-14 p-0"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <TransaksiDialog
        open={showTransaksiDialog}
        onOpenChange={setShowTransaksiDialog}
        tabungan={tabungan as any}
        onSuccess={handleTransaksiSuccess}
      />
    </div>
  );
}