'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Info,
  Download,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { validateImportFile } from '@/lib/excel-importer';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => Promise<void>;
}

interface ImportResult {
  imported: number;
  total: number;
  errors: string[];
  transactions: any[];
}

export function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File) => {
    const validation = validateImportFile(selectedFile);
    
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    setFile(selectedFile);
    setImportResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileChange(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }

    setIsImporting(true);
    
    try {
      await onImport(file);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Terjadi kesalahan saat import. Silakan coba lagi.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data dari Excel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Area */}
          <Card>
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    {file ? file.name : 'Pilih atau drop file Excel di sini'}
                  </h3>
                  
                  {!file && (
                    <p className="text-sm text-gray-600">
                      Support file: .csv, .xlsx, .xls (maks. 10MB)
                    </p>
                  )}
                  
                  {file && (
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {file.name}
                      </Badge>
                      <Badge variant="outline">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    className="hidden"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    disabled={isImporting}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Pilih File
                  </Button>
                  
                  {file && (
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      disabled={isImporting}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Button */}
          {file && !importResult && (
            <div className="flex justify-center">
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-green-600 hover:bg-green-700 px-8"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sedang memproses file...</span>
                    <span className="text-blue-600">Mohon tunggu</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Result */}
          {importResult && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Hasil Import</h3>
                    <Badge 
                      variant={importResult.imported > 0 ? "default" : "destructive"}
                      className={importResult.imported > 0 ? "bg-green-100 text-green-800" : ""}
                    >
                      {importResult.imported > 0 ? 'Berhasil' : 'Gagal'}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {importResult.imported}
                      </div>
                      <p className="text-sm text-gray-600">Berhasil Diimport</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {importResult.total}
                      </div>
                      <p className="text-sm text-gray-600">Total Transaksi</p>
                    </div>
                    
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {importResult.errors.length}
                      </div>
                      <p className="text-sm text-gray-600">Error</p>
                    </div>
                  </div>
                  
                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-800">Error Details:</h4>
                      <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                        <ul className="text-sm text-red-700 space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {importResult.imported > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">
                          {importResult.imported} transaksi berhasil ditambahkan ke aplikasi!
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guidelines */}
          {!importResult && (
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-800">Panduan Import:</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Gunakan file export dari aplikasi sebagai template</li>
                    <li>• Format tanggal: YYYY-MM-DD (contoh: 2024-12-01)</li>
                    <li>• Kolom deskripsi bebas sesuai input user</li>
                    <li>• Support export dengan merge tanggal</li>
                    <li>• Setiap baris akan menjadi transaksi individual</li>
                    <li>• Sistem otomatis mapping kategori berdasarkan deskripsi</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Tutup
            </Button>
            
            {importResult && (
              <Button onClick={handleReset}>
                Import Lagi
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}