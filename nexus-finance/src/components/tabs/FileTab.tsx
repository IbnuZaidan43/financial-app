'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, Database,FileSpreadsheet,Settings } from 'lucide-react';
import { ExportDialog } from '@/components/dialogs/ExportDialog';
import { ImportDialog } from '@/components/dialogs/ImportDialog';
import { useTransactions, useSavings } from '@/hooks/use-api';

export default function FileTab() {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { transactions, refetch: refetchTransactions } = useTransactions();
  const { savings, refetch: refetchSavings } = useSavings();

  const handleExport = async (type: string) => {
    try {
      let endpoint = '';
      
      if (type === 'transactions') {
        endpoint = '/api/export/transactions';
      } else if (type === 'savings') {
        endpoint = '/api/export/savings';
      } else {
        endpoint = '/api/export/transactions';
      }
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const filename = type === 'savings' 
          ? `Laporan_Tabungan_${new Date().toISOString().split('T')[0]}.csv`
          : `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.csv`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  };

  const handleImportComplete = () => {
    Promise.all([
      refetchTransactions(),
      refetchSavings()
    ]);
  };

  useEffect(() => {
    const handleImportCompleteEvent = () => {
      Promise.all([
        refetchTransactions(),
        refetchSavings()
      ]);
    };

    window.addEventListener('import-complete', handleImportCompleteEvent);
    
    return () => {
      window.removeEventListener('import-complete', handleImportCompleteEvent);
    };
  }, [refetchTransactions, refetchSavings]);

  const totalSaldo = savings.reduce((total, s) => total + s.jumlah, 0);
  const totalPemasukan = transactions.reduce((total, t) => 
    t.tipe === 'pemasukan' ? total + t.jumlah : total, 0
  );
  const totalPengeluaran = transactions.reduce((total, t) => 
    t.tipe === 'pengeluaran' ? total + t.jumlah : total, 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Ringkasan Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{savings.length}</div>
              <p className="text-sm text-gray-600">Total Tabungan</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{transactions.length}</div>
              <p className="text-sm text-gray-600">Total Transaksi</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(totalSaldo)}
              </div>
              <p className="text-sm text-gray-600">Total Saldo Tabungan</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(totalPemasukan - totalPengeluaran)}
              </div>
              <p className="text-sm text-gray-600">Saldo Transaksi</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data ke Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowExportDialog(true)}
                disabled={transactions.length === 0}
                className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileSpreadsheet className="h-6 w-6" />
                <span>Export Laporan Keuangan</span>
                <span className="text-xs text-blue-100">
                  {transactions.length} transaksi • {savings.length} tabungan
                </span>
              </Button>
              
              <Button
                onClick={() => setShowExportDialog(true)}
                disabled={transactions.length === 0}
                variant="outline"
                className="h-20 flex-col gap-2"
              >
                <Settings className="h-6 w-6" />
                <span>Pilih Format Export</span>
                <span className="text-xs text-gray-500">
                  Merge tanggal atau format asli
                </span>
              </Button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Fitur Export:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Format sesuai template yang kamu upload</li>
                <li>• Tanggal yang sama di-merge untuk efisiensi</li>
                <li>• Deskripsi diambil dari input user</li>
                <li>• Tabungan menyesuaikan data aplikasi</li>
                <li>• Format: .csv (Excel Compatible)</li>
                <li>• Otomatis download ke browser</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data dari Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowImportDialog(true)}
                className="h-20 flex-col gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <FileSpreadsheet className="h-6 w-6" />
                <span>Import Transaksi</span>
                <span className="text-xs text-green-100">
                  Upload file Excel
                </span>
              </Button>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Atau klik tombol Import untuk upload file
                </p>
              </div>
            </div>

            <Separator />

            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Panduan Import:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Gunakan template export sebagai referensi format</li>
                <li>• Format tanggal: YYYY-MM-DD (contoh: 2024-12-01)</li>
                <li>• Kolom deskripsi bebas sesuai input user</li>
                <li>• Setiap baris akan menjadi transaksi individual</li>
                <li>• Sistem otomatis mapping kategori berdasarkan deskripsi</li>
                <li>• Data duplikat akan ditambah sebagai transaksi baru</li>
                <li>• Support export dengan merge tanggal</li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Template:</h4>
              <p className="text-sm text-gray-600 mb-3">
                Template export yang sudah di-generate bisa langsung digunakan untuk import.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Export dulu → Edit → Import kembali
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Format otomatis sesuai aplikasi
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Fitur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                Ready
              </Badge>
              <span className="text-sm">Export transaksi dengan merge tanggal</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                Ready
              </Badge>
              <span className="text-sm">Import transaksi dari Excel</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Smart
              </Badge>
              <span className="text-sm">Otomatis mapping kategori dan deskripsi</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                Efficient
              </Badge>
              <span className="text-sm">Merge tanggal untuk tampilan yang rapi</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}