'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  DollarSign,
  Edit,
  Trash2
} from 'lucide-react';
import { KeuanganService, Tabungan } from '@/lib/keuangan-db';

interface TabunganTabProps {
  tabungan: Tabungan[];
  onDataUpdate: () => void;
}

export default function TabunganTab({ tabungan, onDataUpdate }: TabunganTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTabungan, setEditingTabungan] = useState<Tabungan | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    kategori: '' as 'rekening_bank' | 'cash' | 'e_wallet' | 'e_money',
    saldoAwal: ''
  });

  const resetForm = () => {
    setFormData({
      nama: '',
      kategori: '',
      saldoAwal: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama || !formData.kategori || !formData.saldoAwal) {
      alert('Mohon lengkapi semua field');
      return;
    }

    try {
      if (editingTabungan) {
        // Update existing tabungan
        await KeuanganService.updateTabungan(editingTabungan.id!, {
          nama: formData.nama,
          kategori: formData.kategori,
          saldoAwal: parseFloat(formData.saldoAwal.replace(/\./g, ''))
        });
      } else {
        // Create new tabungan
        await KeuanganService.createTabungan({
          nama: formData.nama,
          kategori: formData.kategori,
          saldoAwal: parseFloat(formData.saldoAwal.replace(/\./g, ''))
        });
      }
      
      setShowAddDialog(false);
      setShowEditDialog(false);
      setEditingTabungan(null);
      resetForm();
      onDataUpdate();
    } catch (error) {
      console.error('Error saving tabungan:', error);
      alert('Gagal menyimpan tabungan');
    }
  };

  const handleEdit = (tabungan: Tabungan) => {
    setEditingTabungan(tabungan);
    setFormData({
      nama: tabungan.nama,
      kategori: tabungan.kategori,
      saldoAwal: tabungan.saldoAwal.toString()
    });
    setShowEditDialog(true);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tabungan "${nama}"? Semua transaksi terkait juga akan dihapus.`)) {
      try {
        await KeuanganService.deleteTabungan(id);
        onDataUpdate();
      } catch (error) {
        console.error('Error deleting tabungan:', error);
        alert('Gagal menghapus tabungan');
      }
    }
  };

  const getKategoriIcon = (kategori: string) => {
    switch (kategori) {
      case 'rekening_bank':
        return <CreditCard className="h-5 w-5" />;
      case 'cash':
        return <DollarSign className="h-5 w-5" />;
      case 'e_wallet':
        return <Smartphone className="h-5 w-5" />;
      case 'e_money':
        return <Wallet className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getKategoriLabel = (kategori: string) => {
    const kategoriMap = {
      'rekening_bank': 'Rekening Bank',
      'cash': 'Cash',
      'e_wallet': 'E-Wallet',
      'e_money': 'E-Money'
    };
    return kategoriMap[kategori as keyof typeof kategoriMap] || kategori;
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.saldoSaatIni, 0);

  return (
    <div className="space-y-6">
      {/* Header dengan tombol tambah */}
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
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Kategori</label>
                <Select value={formData.kategori} onValueChange={(value: any) => setFormData({...formData, kategori: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rekening_bank">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Rekening Bank
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="e_wallet">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        E-Wallet
                      </div>
                    </SelectItem>
                    <SelectItem value="e_money">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        E-Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Saldo Awal</label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formData.saldoAwal}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    setFormData({...formData, saldoAwal: formatted});
                  }}
                  required
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

      {/* Daftar Tabungan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tabungan.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    t.kategori === 'rekening_bank' ? 'bg-blue-100 text-blue-600' :
                    t.kategori === 'cash' ? 'bg-green-100 text-green-600' :
                    t.kategori === 'e_wallet' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {getKategoriIcon(t.kategori)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{t.nama}</h3>
                    <Badge variant="outline" className="text-xs">
                      {getKategoriLabel(t.kategori)}
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
                    }).format(t.saldoSaatIni)}
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
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Kategori</label>
              <Select value={formData.kategori} onValueChange={(value: any) => setFormData({...formData, kategori: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rekening_bank">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Rekening Bank
                    </div>
                  </SelectItem>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cash
                    </div>
                  </SelectItem>
                  <SelectItem value="e_wallet">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      E-Wallet
                    </div>
                  </SelectItem>
                  <SelectItem value="e_money">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      E-Money
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Saldo Awal</label>
              <Input
                type="text"
                placeholder="0"
                value={formData.saldoAwal}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setFormData({...formData, saldoAwal: formatted});
                }}
                required
              />
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
                  setEditingTabungan(null);
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
  );
}