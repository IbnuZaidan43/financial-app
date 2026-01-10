'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  DollarSign,
  Edit,
  Trash2,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  AlertCircle,
  RefreshCw,
  Building,
  CreditCard as CreditCardIcon,
  Smartphone as SmartphoneIcon,
  Banknote
} from 'lucide-react';
import { useFinancial } from '@/lib/financial-context';
import type { Tabungan as PrismaTabungan } from '@prisma/client';

// Use the same type as in financial context to avoid conflicts
type Tabungan = {
  id: number;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

interface TabunganTabProps {
  onDataUpdate: () => void;
}

export default function TabunganTab({ onDataUpdate }: TabunganTabProps) {
  // NEW: Get financial context for sync status
  const { 
    isOnline, 
    dataSource, 
    syncStatus, 
    lastSync, 
    forceSync,
    createTabungan,
    tabungan
  } = useFinancial();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTabungan, setEditingTabungan] = useState<Tabungan | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    saldoAwal: ''
  });
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

  const getDataSourceIcon = () => {
    switch (dataSource) {
      case 'server': return <Cloud className="w-4 h-4" />;
      case 'local': return <Database className="w-4 h-4" />;
      case 'mixed': return <Database className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getDataSourceColor = () => {
    switch (dataSource) {
      case 'server': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'local': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'mixed': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
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
      case 'bank': return <Building className="h-5 w-5" />;
      case 'e-wallet': return <SmartphoneIcon className="h-5 w-5" />;
      case 'e-money': return <CreditCardIcon className="h-5 w-5" />;
      case 'cash': return <Banknote className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
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

  const resetForm = () => {
    setFormData({
      nama: '',
      saldoAwal: ''
    });
  };

  const resetAllForm = () => {
    setFormData({
      nama: '',
      saldoAwal: ''
    });
    setEditingTabungan(null);
  };

  // NEW: Enhanced submit with local storage support
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama) {
      alert('Mohon lengkapi nama tabungan');
      return;
    }

    try {
      // Use createTabungan from financial context for offline support
      const tabunganData = {
        nama: formData.nama,
        saldoAwal: parseFloat(formData.saldoAwal.replace(/\./g, '') || '0')
      };
      const result = await createTabungan(tabunganData);

      setShowAddDialog(false);
      setShowEditDialog(false);
      setEditingTabungan(null);
      resetForm();
      
      // Refresh parent data
      await onDataUpdate();
      
      alert('Tabungan berhasil disimpan');
    } catch (error) {
      console.error('Error saving tabungan:', error);
      alert('Gagal menyimpan tabungan');
    }
  };

  const handleEdit = (tabungan: Tabungan) => {
    setEditingTabungan(tabungan);
    setFormData({
      nama: tabungan.nama,
      saldoAwal: tabungan.saldoAwal.toString()
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama || !editingTabungan) {
      alert('Mohon lengkapi nama tabungan');
      return;
    }

    try {
      console.log('🔄 Updating tabungan...');
      const response = await fetch(`/api/savings/${editingTabungan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTabungan.id,
          nama: formData.nama,
          saldoAwal: parseFloat(formData.saldoAwal.replace(/\./g, '')) || 0
        }),
      });

      if (response.ok) {
        console.log('✅ Tabungan updated');
        setShowEditDialog(false);
        resetAllForm();
        await onDataUpdate();
        alert('Tabungan berhasil diupdate');
      } else {
        throw new Error('Gagal mengupdate tabungan');
      }
    } catch (error) {
      console.error('Error updating tabungan:', error);
      alert('Gagal mengupdate tabungan');
    }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tabungan "${nama}"?`)) {
      try {
        console.log('🔄 Deleting tabungan:', { id, nama });
        const response = await fetch(`/api/savings/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          console.log('✅ Tabungan deleted');
          await onDataUpdate();
          alert('Tabungan berhasil dihapus');
        } else {
          throw new Error('Gagal menghapus tabungan');
        }
      } catch (error) {
        console.error('Error deleting tabungan:', error);
        alert('Gagal menghapus tabungan');
      }
    }
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.jumlah, 0);

  // Group tabungan by kategori
  const tabunganByKategori = tabungan.reduce((acc, t) => {
    const kategori = getKategoriFromNama(t.nama);
    if (!acc[kategori]) acc[kategori] = [];
    acc[kategori].push(t);
    return acc;
  }, {} as Record<string, Tabungan[]>);

  const totalSaldoByKategori = Object.entries(tabunganByKategori).map(([kategori, items]) => ({
    kategori,
    total: (items as Tabungan[]).reduce((sum, t) => sum + t.jumlah, 0),
    count: (items as Tabungan[]).length
  }));

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
          
          <Badge className={`${getDataSourceColor()} flex items-center gap-1`}>
            {getDataSourceIcon()}
            <span className="text-xs font-medium">
              {dataSource === 'server' && 'Server'}
              {dataSource === 'local' && 'Local'}
              {dataSource === 'mixed' && 'Mixed'}
            </span>
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
                You're currently offline. You can view and manage tabungan, and changes will sync when you're back online.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Daftar Tabungan</h2>
          <p className="text-gray-600">Kelola semua rekening dan dompet digital Anda</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tabungan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Tabungan Baru</DialogTitle>
              <DialogDescription>
                Tambahkan rekening bank atau dompet digital baru untuk melacak saldo Anda
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nama Tabungan</label>
                <Input
                  placeholder="Contoh: BCA, Mandiri, GoPay, dll"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  required
                />
                <p className="text-xs text-gray-500">
                  Kategori akan otomatis dideteksi dari nama (bank, e-wallet, e-money, cash)
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Saldo Awal</label>
                <Input
                  type="text"
                  placeholder="Contoh: 1000000"
                  value={formData.saldoAwal}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    setFormData({...formData, saldoAwal: formatted});
                  }}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Simpan
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Saldo Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Wallet className="h-5 w-5" />
            Total Saldo Semua Tabungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-700">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(totalSaldo)}
          </div>
          <p className="text-sm text-blue-600 mt-2">
            {tabungan.length} tabungan aktif
          </p>
        </CardContent>
      </Card>

      {/* Total Saldo by Kategori */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {totalSaldoByKategori.map(({ kategori, total, count }) => (
          <Card key={kategori} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${getKategoriColor(kategori)}`}>
                  {getKategoriIcon(kategori)}
                </div>
                <div>
                  <h4 className="font-semibold capitalize">{kategori}</h4>
                  <p className="text-xs text-gray-500">{count} tabungan</p>
                </div>
              </div>
              <div className="text-lg font-bold">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(total)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daftar Tabungan by Kategori */}
      {Object.entries(tabunganByKategori).map(([kategori, items]) => (
        <div key={kategori} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${getKategoriColor(kategori)}`}>
              {getKategoriIcon(kategori)}
            </div>
            <h3 className="text-lg font-semibold capitalize">{kategori}</h3>
            <Badge variant="outline" className="text-xs">
              {items.length} tabungan
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getKategoriColor(kategori)}`}>
                        {getKategoriIcon(kategori)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{t.nama}</h3>
                        <Badge variant="outline" className={`text-xs ${getKategoriColor(kategori)}`}>
                          {kategori.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(t)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id!, t.nama)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Saldo Saat Ini</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(t.jumlah)}
                      </p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        Saldo Awal: {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(t.saldoAwal)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Dibuat: {new Date(t.createdAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {tabungan.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Tabungan</h3>
            <p className="text-gray-600 mb-6">
              Mulai tambahkan tabungan untuk mengelola keuangan Anda
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tabungan Pertama
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tabungan</DialogTitle>
            <DialogDescription>
              Perbarui nama atau saldo awal tabungan yang sudah ada
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nama Tabungan</label>
              <Input
                placeholder="Contoh: BCA, Mandiri, GoPay, dll"
                value={formData.nama}
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                required
              />
              <p className="text-xs text-gray-500">
                Ubah nama tabungan tidak akan mengubah kategori
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Saldo Awal</label>
              <Input
                type="text"
                placeholder="Contoh: 1000000"
                value={formData.saldoAwal}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setFormData({...formData, saldoAwal: formatted});
                }}
              />
              <p className="text-xs text-gray-500">
                Perubahan saldo awal akan menyesuaikan saldo saat ini
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false);
                  resetAllForm();
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}