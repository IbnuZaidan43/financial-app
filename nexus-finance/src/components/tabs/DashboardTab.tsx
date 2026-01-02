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
import type { Tabungan as PrismaTabungan, Transaksi as PrismaTransaksi } from '@prisma/client';

type Tabungan = PrismaTabungan;
type Transaksi = PrismaTransaksi;

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
      
      // Hitung dari transaksi yang sudah ada
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const pemasukan = transaksi
        .filter(t => t.tipe === 'pemasukan')
        .filter(t => {
          const tDate = new Date(t.tanggal);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.jumlah, 0);
        
      const pengeluaran = transaksi
        .filter(t => t.tipe === 'pengeluaran')
        .filter(t => {
          const tDate = new Date(t.tanggal);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.jumlah, 0);

      // Buat statistik bulanan sederhana
      const statistik = transaksi.reduce((acc: any[], t) => {
        const tDate = new Date(t.tanggal);
        const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = tDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        
        let existing = acc.find(item => item.bulan === monthName);
        if (!existing) {
          existing = { bulan: monthName, pemasukan: 0, pengeluaran: 0 };
          acc.push(existing);
        }
        
        if (t.tipe === 'pemasukan') {
          existing.pemasukan += t.jumlah;
        } else {
          existing.pengeluaran += t.jumlah;
        }
        
        return acc;
      }, []).slice(-6); // 6 bulan terakhir

      setPemasukanBulanIni(pemasukan);
      setPengeluaranBulanIni(pengeluaran);
      setStatistikBulanan(statistik);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.jumlah, 0);
  const bulanIni = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // Format data untuk chart
  const chartData = statistikBulanan.map(stat => ({
    bulan: stat.bulan,
    pemasukan: stat.pemasukan,
    pengeluaran: stat.pengeluaran,
    saldo: stat.pemasukan - stat.pengeluaran
  }));

  const recentChartData = statistikBulanan.map(stat => ({
    bulan: stat.bulan,
    pemasukan: stat.pemasukan,
    pengeluaran: stat.pengeluaran
  }));

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Pemasukan {bulanIni}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
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
              {transaksi.filter(t => t.tipe === 'pemasukan').length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Pengeluaran {bulanIni}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
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
              {transaksi.filter(t => t.tipe === 'pengeluaran').length} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Saldo
            </CardTitle>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Saldo Bulanan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trend Saldo 6 Bulan Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                          currency: 'IDR',
                          style: 'currency',
                          minimumFractionDigits: 0,
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
                          currency: 'IDR',
                          style: 'currency',
                          minimumFractionDigits: 0,
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
                    <Bar dataKey="pemasukan" fill="#10b981" />
                    <Bar dataKey="pengeluaran" fill="#ef4444" />
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
      </div>

      {/* Recent Savings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Semua Tabungan
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
                      Tabungan
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Saldo: {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(t.jumlah)}
                  </p>
                  <div className="text-xs text-gray-500">
                    Dibuat: {new Date(t.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Belum ada tabungan</p>
              <p className="text-sm">Mulai tambahkan tabungan untuk melihat data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}