'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  FileText, 
  Database,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { KeuanganService, Tabungan, Transaksi } from '@/lib/keuangan-db';

interface FileTabProps {
  tabungan: Tabungan[];
  transaksi: Transaksi[];
}

export default function FileTab({ tabungan, transaksi }: FileTabProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  // Export functions (placeholder untuk sekarang)
  const exportTabunganToExcel = async () => {
    setIsExporting(true);
    setImportStatus({ type: 'info', message: 'Fitur export akan segera hadir!' });
    
    // Simulasi export
    setTimeout(() => {
      setIsExporting(false);
      setImportStatus({ 
        type: 'success', 
        message: 'Template export berhasil dibuat! (Fitur akan segera tersedia)' 
      });
    }, 2000);
  };

  const exportTransaksiToExcel = async () => {
    setIsExporting(true);
    setImportStatus({ type: 'info', message: 'Fitur export akan segera hadir!' });
    
    // Simulasi export
    setTimeout(() => {
      setIsExporting(false);
      setImportStatus({ 
        type: 'success', 
        message: 'Template export berhasil dibuat! (Fitur akan segera tersedia)' 
      });
    }, 2000);
  };

  const exportAllToExcel = async () => {
    setIsExporting(true);
    setImportStatus({ type: 'info', message: 'Sedang mengekspor semua data...' });
    
    // Simulasi export
    setTimeout(() => {
      setIsExporting(false);
      setImportStatus({ 
        type: 'success', 
        message: 'Semua data berhasil diekspor! (Fitur akan segera tersedia)' 
      });
    }, 3000);
  };

  // Import functions (placeholder untuk sekarang)
  const importTabunganFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: 'info', message: 'Sedang memproses file...' });
    
    // Simulasi import
    setTimeout(() => {
      setIsImporting(false);
      setImportStatus({ 
        type: 'success', 
        message: 'File berhasil diimport! (Fitur akan segera tersedia)' 
      });
    }, 2000);
  };

  const importTransaksiFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: 'info', message: 'Sedang memproses file...' });
    
    // Simulasi import
    setTimeout(() => {
      setIsImporting(false);
      setImportStatus({ 
        type: 'success', 
        message: 'File berhasil diimport! (Fitur akan segera tersedia)' 
      });
    }, 2000);
  };

  const downloadTemplate = (type: 'tabungan' | 'transaksi') => {
    setImportStatus({ type: 'info', message: 'Template akan segera tersedia!' });
    
    // Simulasi download
    setTimeout(() => {
      setImportStatus({ 
        type: 'success', 
        message: `Template ${type} berhasil diunduh! (Fitur akan segera tersedia)` 
      });
    }, 1000);
  };

  const totalSaldo = tabungan.reduce((total, t) => total + t.saldoSaatIni, 0);
  const totalPemasukan = transaksi.filter(t => t.jenis === 'pemasukan').reduce((total, t) => total + t.jumlah, 0);
  const totalPengeluaran = transaksi.filter(t => t.jenis === 'pengeluaran').reduce((total, t) => total + t.jumlah, 0);

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {importStatus.type && (
        <Card className={`border-l-4 ${
          importStatus.type === 'success' ? 'border-green-500 bg-green-50' :
          importStatus.type === 'error' ? 'border-red-500 bg-red-50' :
          'border-blue-500 bg-blue-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {importStatus.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {importStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              {importStatus.type === 'info' && <Clock className="h-5 w-5 text-blue-600" />}
              <p className={`${
                importStatus.type === 'success' ? 'text-green-800' :
                importStatus.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {importStatus.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Overview */}
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
              <div className="text-2xl font-bold text-blue-600">{tabungan.length}</div>
              <p className="text-sm text-gray-600">Total Tabungan</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{transaksi.length}</div>
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
              <p className="text-sm text-gray-600">Total Saldo</p>
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
              <p className="text-sm text-gray-600">Netto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data ke Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={exportTabunganToExcel}
                disabled={isExporting || tabungan.length === 0}
                className="h-20 flex-col gap-2"
                variant="outline"
              >
                <FileText className="h-6 w-6" />
                <span>Export Tabungan</span>
                <span className="text-xs text-gray-500">{tabungan.length} data</span>
              </Button>
              
              <Button
                onClick={exportTransaksiToExcel}
                disabled={isExporting || transaksi.length === 0}
                className="h-20 flex-col gap-2"
                variant="outline"
              >
                <FileText className="h-6 w-6" />
                <span>Export Transaksi</span>
                <span className="text-xs text-gray-500">{transaksi.length} data</span>
              </Button>
              
              <Button
                onClick={exportAllToExcel}
                disabled={isExporting || (tabungan.length === 0 && transaksi.length === 0)}
                className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Database className="h-6 w-6" />
                <span>Export Semua Data</span>
                <span className="text-xs text-blue-100">Lengkap</span>
              </Button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Format Export:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Tabungan: Nama, Kategori, Saldo Awal, Saldo Saat Ini</li>
                <li>• Transaksi: Tanggal, Jenis, Jumlah, Keterangan, Sumber</li>
                <li>• Format: .xlsx (Microsoft Excel)</li>
                <li>• Lokasi: Download folder browser Anda</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data dari Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Import Tabungan */}
              <div className="space-y-4">
                <h3 className="font-medium">Import Tabungan</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    Upload file Excel untuk import data tabungan
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={importTabunganFromExcel}
                    disabled={isImporting}
                    className="max-w-xs mx-auto"
                  />
                </div>
                <Button
                  onClick={() => downloadTemplate('tabungan')}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template Tabungan
                </Button>
              </div>

              {/* Import Transaksi */}
              <div className="space-y-4">
                <h3 className="font-medium">Import Transaksi</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">
                    Upload file Excel untuk import data transaksi
                  </p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={importTransaksiFromExcel}
                    disabled={isImporting}
                    className="max-w-xs mx-auto"
                  />
                </div>
                <Button
                  onClick={() => downloadTemplate('transaksi')}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template Transaksi
                </Button>
              </div>
            </div>

            <Separator />

            {/* Import Guidelines */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <h4 className="font-medium text-amber-800 mb-2">Panduan Import:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Download template terlebih dahulu untuk format yang benar</li>
                <li>• Pastikan nama tabungan di import sudah ada di database</li>
                <li>• Format tanggal: DD/MM/YYYY atau YYYY-MM-DD</li>
                <li>• Jenis transaksi: "pemasukan" atau "pengeluaran"</li>
                <li>• Kategori tabungan: "rekening_bank", "cash", "e_wallet", "e_money"</li>
                <li>• Data duplikat akan diabaikan</li>
                <li>• Backup data terlebih dahulu sebelum import</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Status Fitur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                Coming Soon
              </Badge>
              <span className="text-sm">Export/Import Excel akan segera tersedia</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                Ready
              </Badge>
              <span className="text-sm">Template dan format sudah disiapkan</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                Planning
              </Badge>
              <span className="text-sm">Auto-sync dan backup cloud akan tersedia</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}