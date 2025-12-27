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
  Wallet
} from 'lucide-react';
import { KeuanganService, Tabungan, Transaksi } from '@/lib/keuangan-db';

interface RiwayatTransaksiTabProps {
  transaksi: Transaksi[];
  tabungan: Tabungan[];
  onDataUpdate: () => void;
}

export default function RiwayatTransaksiTab({ transaksi, tabungan, onDataUpdate }: RiwayatTransaksiTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTabungan, setFilterTabungan] = useState<string>('semua');
  const [filterJenis, setFilterJenis] = useState<string>('semua');
  const [filterBulan, setFilterBulan] = useState<string>('semua');

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

  // Filter transaksi
  const filteredTransaksi = useMemo(() => {
    return transaksi.filter(t => {
      // Search filter
      if (searchTerm && !t.keterangan.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Tabungan filter
      if (filterTabungan !== 'semua' && t.tabunganId.toString() !== filterTabungan) {
        return false;
      }

      // Jenis filter
      if (filterJenis !== 'semua' && t.jenis !== filterJenis) {
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
        await KeuanganService.deleteTransaksi(id);
        onDataUpdate();
      } catch (error) {
        console.error('Error deleting transaksi:', error);
        alert('Gagal menghapus transaksi');
      }
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

  return (
    <div className="space-y-6">
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
                placeholder="Cari keterangan..."
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
                  {tabungan.map((t) => (
                    <SelectItem key={t.id} value={t.id!.toString()}>
                      {t.nama}
                    </SelectItem>
                  ))}
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
              {filteredTransaksi.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      t.jenis === 'pemasukan' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {t.jenis === 'pemasukan' ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{t.keterangan}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          {t.tabunganNama}
                        </span>
                        <span>•</span>
                        <span>{new Date(t.tanggal).toLocaleDateString('id-ID')}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {getKategoriLabel(t.kategoriTabungan)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${
                        t.jenis === 'pemasukan' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.jenis === 'pemasukan' ? '+' : '-'}
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(t.jumlah)}
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
              ))}
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