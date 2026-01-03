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
import { useSavings } from '@/hooks/use-api';
import type { Tabungan as PrismaTabungan } from '@prisma/client';

type Tabungan = PrismaTabungan;

interface TabunganTabProps {
  onDataUpdate: () => void;
}

export default function TabunganTab({ onDataUpdate }: TabunganTabProps) {
  const { savings: tabungan, refetch } = useSavings();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTabungan, setEditingTabungan] = useState<Tabungan | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    saldoAwal: ''
  });

  const resetForm = () => {
    setFormData({
      nama: '',
      saldoAwal: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama) {
      alert('Mohon lengkapi nama tabungan');
      return;
    }

    try {
      const response = await fetch('/api/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama: formData.nama,
          saldoAwal: formData.saldoAwal.replace(/\./g, '') || '0'
        }),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setShowEditDialog(false);
        setEditingTabungan(null);
        resetForm();
        refetch();
        onDataUpdate();
        alert('Tabungan berhasil disimpan');
      } else {
        throw new Error('Gagal menyimpan tabungan');
      }
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

  const handleDelete = async (id: number, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus tabungan "${nama}"?`)) {
      try {
        const response = await fetch(`/api/savings/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          refetch();
          onDataUpdate();
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

  const getTabunganIcon = () => {
    return <Wallet className="h-5 w-5" />;
  };

  const getTabunganLabel = () => {
    return 'Tabungan';
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.jumlah, 0);

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tabungan.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    {getTabunganIcon()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{t.nama}</h3>
                    <Badge variant="outline" className="text-xs">
                      {getTabunganLabel()}
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