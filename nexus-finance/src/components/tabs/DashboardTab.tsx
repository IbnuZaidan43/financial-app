'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { KeuanganService, Tabungan, Transaksi } from '@/lib/keuangan-db';

interface DashboardTabProps {
  tabungan: Tabungan[];
  transaksi: Transaksi[];
  onDataUpdate: () => void;
}

export default function DashboardTab({ tabungan, transaksi, onDataUpdate }: DashboardTabProps) {
  const [pemasukanBulanIni, setPemasukanBulanIni] = useState(0);
  const [pengeluaranBulanIni, setPengeluaranBulanIni] = useState(0);
  const [statistikBulanan, setStatistikBulanan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [transaksi]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [pemasukan, pengeluaran, statistik] = await Promise.all([
        KeuanganService.getPemasukanBulanIni(),
        KeuanganService.getPengeluaranBulanIni(),
        KeuanganService.getStatistikBulanan()
      ]);

      setPemasukanBulanIni(pemasukan);
      setPengeluaranBulanIni(pengeluaran);
      setStatistikBulanan(statistik);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.saldoSaatIni, 0);
  const bulanIni = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Format data untuk chart
  const chartData = statistikBulanan.map(stat => ({
    bulan: new Date(stat.bulan + '-01').toLocaleDateString('id-ID', { month: 'short' }),
    pemasukan: stat.totalPemasukan,
    pengeluaran: stat.totalPengeluaran,
    saldo: stat.saldoAkhir
  }));

  // Ambil 6 bulan terakhir untuk chart
  const recentChartData = chartData.slice(-6);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Pemasukan {bulanIni}</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(pemasukanBulanIni)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {transaksi.filter(t => t.jenis === 'pemasukan').length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Pengeluaran {bulanIni}</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(pengeluaranBulanIni)}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {transaksi.filter(t => t.jenis === 'pengeluaran').length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(totalSaldo)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              {tabungan.length} tabungan aktif
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafik Saldo Per Bulan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Grafik Saldo Per Bulan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="bulan" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => 
                      new Intl.NumberFormat('id-ID', {
                        notation: 'compact',
                        maximumFractionDigits: 0
                      }).format(value)
                    }
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value),
                      ''
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada data untuk ditampilkan</p>
                <p className="text-sm">Mulai tambahkan transaksi untuk melihat grafik</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grafik Pemasukan vs Pengeluaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pemasukan vs Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="bulan" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => 
                      new Intl.NumberFormat('id-ID', {
                        notation: 'compact',
                        maximumFractionDigits: 0
                      }).format(value)
                    }
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value),
                      name === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'
                    ]}
                  />
                  <Bar dataKey="pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada data untuk ditampilkan</p>
                <p className="text-sm">Mulai tambahkan transaksi untuk melihat grafik</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ringkasan Tabungan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Ringkasan Tabungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tabungan.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tabungan.map((t) => (
                <div key={t.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{t.nama}</h4>
                    <Badge variant="outline" className="text-xs">
                      {t.kategori.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Saldo: {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(t.saldoSaatIni)}
                  </p>
                  <div className="text-xs text-gray-500">
                    Awal: {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(t.saldoAwal)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Belum ada tabungan</p>
              <p className="text-sm">Tambahkan tabungan di tab Tabungan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}