'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Wallet,
  Building,
  Smartphone,
  CreditCard,
  Banknote,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useFinancial } from '@/lib/financial-context';

// Interface yang sesuai dengan schema baru
interface TransaksiData {
  id: number;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: string | Date;
  tipe: string; // 'pemasukan' atau 'pengeluaran'
  kategoriId: number | null;
  tabunganId: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TabunganData {
  id: number;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RiwayatTransaksiTabProps {
  transaksi: TransaksiData[];
  tabungan: TabunganData[];
  onDataUpdate: () => void;
}

export default function RiwayatTransaksiTab({ transaksi, tabungan, onDataUpdate }: RiwayatTransaksiTabProps) {
  // NEW: Get financial context for sync status
  const { 
    isOnline,
    syncStatus, 
    lastSync, 
    forceSync 
  } = useFinancial();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTabungan, setFilterTabungan] = useState<string>('semua');
  const [filterJenis, setFilterJenis] = useState<string>('semua');
  const [filterBulan, setFilterBulan] = useState<string>('semua');
  const [isSyncing, setIsSyncing] = useState(false);

  // NEW: Helper functions for sync status
  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'synced': return <Database className="w-4 h-4" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'offline': return <WifiOff className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'synced': return 'bg-green-100 text-green-800 border-green-300';
      case 'syncing': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'offline': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'error': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // NEW: Handle manual sync
  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      await onDataUpdate(); // Refresh parent data
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate bulan options
  const bulanOptions = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  // Fungsi untuk mendeteksi kategori dari nama tabungan
  const getKategoriFromNama = (nama: string) => {
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

  // Fungsi untuk mendapatkan icon berdasarkan kategori
  const getKategoriIcon = (kategori: string) => {
    switch (kategori) {
      case 'bank': return <Building className="h-3 w-3" />;
      case 'e-wallet': return <Smartphone className="h-3 w-3" />;
      case 'e-money': return <CreditCard className="h-3 w-3" />;
      case 'cash': return <Banknote className="h-3 w-3" />;
      default: return <Wallet className="h-3 w-3" />;
    }
  };

  // Fungsi untuk mendapatkan warna berdasarkan kategori
  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'bank': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'e-wallet': return 'bg-green-100 text-green-700 border-green-200';
      case 'e-money': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cash': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get nama tabungan dari tabunganId
  const getTabunganNama = (tabunganId: number | null) => {
    if (!tabunganId) return 'Tidak diketahui';
    const tab = tabungan.find(t => t.id === tabunganId);
    return tab ? tab.nama : 'Tabungan dihapus';
  };

  // Get kategori dari nama tabungan
  const getTabunganKategori = (tabunganId: number | null) => {
    if (!tabunganId) return 'lainnya';
    const tab = tabungan.find(t => t.id === tabunganId);
    return tab ? getKategoriFromNama(tab.nama) : 'lainnya';
  };

  // Filter transaksi
  const filteredTransaksi = useMemo(() => {
    return transaksi.filter(t => {
      // Search filter - cari di judul dan deskripsi
      const searchText = (t.judul + ' ' + (t.deskripsi || '')).toLowerCase();
      if (searchTerm && !searchText.includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Tabungan filter
      if (filterTabungan !== 'semua' && t.tabunganId?.toString() !== filterTabungan) {
        return false;
      }

      // Jenis filter - menggunakan tipe bukan jenis
      if (filterJenis !== 'semua' && t.tipe !== filterJenis) {
        return false;
      }

      // Bulan filter
      if (filterBulan !== 'semua') {
        const bulanTransaksi = new Date(t.tanggal).getMonth() + 1;
        if (bulanTransaksi.toString() !== filterBulan) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [transaksi, searchTerm, filterTabungan, filterJenis, filterBulan]);

  const handleDeleteTransaksi = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
      try {
        const response = await fetch(`/api/transactions?XTransformPort=3000`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete transaction');
        }

        onDataUpdate();
      } catch (error) {
        console.error('Error deleting transaksi:', error);
        alert('Gagal menghapus transaksi');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* NEW: Sync Status Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Badge className={`${getSyncColor()} flex items-center gap-1`}>
            {getSyncIcon()}
            <span className="text-xs font-medium">
              {syncStatus === 'synced' && 'Synced'}
              {syncStatus === 'syncing' && 'Syncing...'}
              {syncStatus === 'offline' && 'Offline'}
              {syncStatus === 'error' && 'Sync Error'}
            </span>
          </Badge>
          
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 flex items-center gap-1">
            <Database className="w-4 h-4" />
            <span className="text-xs font-medium">Local</span>
          </Badge>

          <div className="flex items-center gap-1 text-xs text-gray-600">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Last sync: {formatLastSync(lastSync)}
          </span>
          
          {!isOnline || syncStatus === 'error' ? (
            <Button
              onClick={handleForceSync}
              disabled={isSyncing || !isOnline}
              size="sm"
              variant="outline"
              className="h-8"
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* NEW: Offline Mode Alert */}
      {!isOnline && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-orange-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-orange-800">Offline Mode</h5>
              <p className="text-sm text-orange-700">
                You're currently offline. You can view and manage transactions, and changes will sync when you're back online.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari judul atau keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Horizontal Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter Tabungan */}
              <Select value={filterTabungan} onValueChange={setFilterTabungan}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Semua Tabungan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Tabungan</SelectItem>
                  {tabungan.map((t) => {
                    const kategori = getKategoriFromNama(t.nama);
                    return (
                      <SelectItem key={t.id} value={t.id!.toString()}>
                        <div className="flex items-center gap-2">
                          {getKategoriIcon(kategori)}
                          <span>{t.nama}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Filter Jenis */}
              <Select value={filterJenis} onValueChange={setFilterJenis}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Semua Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Jenis</SelectItem>
                  <SelectItem value="pemasukan">Pemasukan</SelectItem>
                  <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter Bulan */}
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Semua Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Bulan</SelectItem>
                  {bulanOptions.map((bulan) => (
                    <SelectItem key={bulan.value} value={bulan.value}>
                      {bulan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaksi List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Riwayat Transaksi
            </span>
            <span className="text-sm font-normal text-gray-600">
              {filteredTransaksi.length} transaksi
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransaksi.length > 0 ? (
            <div className="space-y-3">
              {filteredTransaksi.map((t) => {
                const tabunganNama = getTabunganNama(t.tabunganId);
                const kategori = getTabunganKategori(t.tabunganId);
                
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.tipe === 'pemasukan' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {t.tipe === 'pemasukan' ? (
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{t.judul}</h4>
                        {t.deskripsi && (
                          <p className="text-sm text-gray-600 mb-1">{t.deskripsi}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <div className={`p-0.5 rounded ${getKategoriColor(kategori)}`}>
                              {getKategoriIcon(kategori)}
                            </div>
                            {tabunganNama}
                          </span>
                          <span>•</span>
                          <span>{new Date(t.tanggal).toLocaleDateString('id-ID')}</span>
                          <span>•</span>
                          <Badge variant="outline" className={`text-xs ${getKategoriColor(kategori)}`}>
                            {kategori.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-bold ${
                          t.tipe === 'pemasukan' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.tipe === 'pemasukan' ? '+' : '-'}
                          {new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(t.jumlah)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransaksi(t.id!)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Tidak ada transaksi</p>
              <p className="text-sm">
                {searchTerm || filterTabungan !== 'semua' || filterJenis !== 'semua' || filterBulan !== 'semua'
                  ? 'Coba ubah filter atau kata kunci pencarian'
                  : 'Mulai tambahkan transaksi untuk melihat riwayat'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}