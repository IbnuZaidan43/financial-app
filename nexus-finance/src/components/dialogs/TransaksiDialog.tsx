'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  DollarSign,
  Wallet
} from 'lucide-react';

interface TabunganData {
  id: number;
  nama: string;
  saldoAwal: number;
  jumlah: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TransaksiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabungan: TabunganData[];
  onSuccess: () => void;
}

export default function TransaksiDialog({ open, onOpenChange, tabungan, onSuccess }: TransaksiDialogProps) {
  const [formData, setFormData] = useState({
    tipe: '' as 'pemasukan' | 'pengeluaran',
    jumlah: '',
    deskripsi: '',
    tabunganId: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  const resetForm = () => {
    setFormData({
      tipe: 'pemasukan',
      jumlah: '',
      deskripsi: '',
      tabunganId: '',
      tanggal: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipe || !formData.jumlah || !formData.tabunganId || !formData.tanggal) {
      alert('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    try {
      const selectedTabungan = tabungan.find(t => t.id!.toString() === formData.tabunganId);
      if (!selectedTabungan) {
        alert('Tabungan tidak ditemukan');
        return;
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          judul: formData.deskripsi || 'Transaksi',
          jumlah: parseFloat(formData.jumlah.replace(/\./g, '')),
          deskripsi: formData.deskripsi || 'Transaksi tanpa keterangan',
          tipe: formData.tipe,
          tanggal: formData.tanggal,
          kategoriId: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const currentJumlah = selectedTabungan.jumlah;
      const newJumlah = formData.tipe === 'pemasukan' 
        ? currentJumlah + parseFloat(formData.jumlah.replace(/\./g, ''))
        : currentJumlah - parseFloat(formData.jumlah.replace(/\./g, ''));

      await fetch('/api/savings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedTabungan.id,
          jumlah: newJumlah
        }),
      });

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating transaksi:', error);
      alert('Gagal menyimpan transaksi');
    }
  };

  const getTabunganIcon = () => {
    return '💰';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.tipe === 'pemasukan' ? (
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            ) : formData.tipe === 'pengeluaran' ? (
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            ) : (
              <DollarSign className="h-5 w-5" />
            )}
            Tambah Transaksi
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Jenis Transaksi *</label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={formData.tipe === 'pemasukan' ? 'default' : 'outline'}
                className={`h-16 flex-col gap-2 ${
                  formData.tipe === 'pemasukan' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                }`}
                onClick={() => setFormData({...formData, tipe: 'pemasukan'})}
              >
                <ArrowUpRight className="h-5 w-5" />
                <span className="text-sm">Pemasukan</span>
              </Button>
              
              <Button
                type="button"
                variant={formData.tipe === 'pengeluaran' ? 'default' : 'outline'}
                className={`h-16 flex-col gap-2 ${
                  formData.tipe === 'pengeluaran' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                    : 'border-red-200 text-red-700 hover:bg-red-50'
                }`}
                onClick={() => setFormData({...formData, tipe: 'pengeluaran'})}
              >
                <ArrowDownRight className="h-5 w-5" />
                <span className="text-sm">Pengeluaran</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Jumlah *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                Rp
              </span>
              <Input
                type="text"
                placeholder="0"
                value={formData.jumlah}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setFormData({...formData, jumlah: formatted});
                }}
                className="pl-12"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Sumber/Tujuan *</label>
            <Select value={formData.tabunganId} onValueChange={(value) => setFormData({...formData, tabunganId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tabungan" />
              </SelectTrigger>
              <SelectContent>
                {tabungan.map((t) => (
                  <SelectItem key={t.id} value={t.id!.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{getTabunganIcon()}</span>
                      <span>{t.nama}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        Tabungan
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tanggal *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Keterangan</label>
            <Textarea
              placeholder="Tambahkan keterangan transaksi (opsional)"
              value={formData.deskripsi}
              onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
              rows={3}
            />
          </div>

          {formData.tipe && formData.jumlah && formData.tabunganId && (
            <div className={`p-3 rounded-lg border ${
              formData.tipe === 'pemasukan' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm font-medium">Preview:</span>
                <div className="flex items-center gap-2">
                  {formData.tipe === 'pemasukan' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-bold text-sm ${
                    formData.tipe === 'pemasukan' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formData.tipe === 'pemasukan' ? '+' : '-'}
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(parseFloat(formData.jumlah.replace(/\./g, '') || '0'))}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {tabungan.find(t => t.id!.toString() === formData.tabunganId)?.nama} • {formData.tanggal}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.tipe || !formData.jumlah || !formData.tabunganId}
            >
              Simpan Transaksi
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}