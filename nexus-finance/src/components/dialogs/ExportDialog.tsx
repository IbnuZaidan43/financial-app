'use client';

import { useState } from 'react';
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
import { 
  Download, 
  FileSpreadsheet,
  Calendar,
  Settings,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (type: string) => Promise<void>;
}

export function ExportDialog({ open, onOpenChange, onExport }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string>('');

  const handleExportClick = async (type: string) => {
    setIsExporting(true);
    setExportType(type);
    
    try {
      await onExport(type);
      toast.success(`Export ${type} berhasil!`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export ${type} gagal. Silakan coba lagi.`);
    } finally {
      setIsExporting(false);
      setExportType('');
    }
  };

  const exportOptions = [
    {
      id: 'transactions',
      title: 'Laporan Keuangan',
      description: 'Export semua transaksi dengan merge tanggal',
      icon: FileSpreadsheet,
      color: 'blue',
      features: [
        'Merge tanggal untuk efisiensi',
        'Deskripsi dari input user',
        'Tabungan sesuai aplikasi',
        'Format: .csv (Excel Compatible)'
      ]
    },
    {
      id: 'savings',
      title: 'Laporan Tabungan',
      description: 'Export data tabungan dan progresnya',
      icon: Calendar,
      color: 'green',
      features: [
        'Progres persentase',
        'Target vs terkumpul',
        'Status pencapaian',
        'Format: .csv (Excel Compatible)'
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data ke Excel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              const isLoading = isExporting && exportType === option.id;
              
              return (
                <Card key={option.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${option.color}-100`}>
                          <Icon className={`h-6 w-6 text-${option.color}-600`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{option.title}</h3>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Fitur:</div>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {option.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <Button
                        onClick={() => handleExportClick(option.id)}
                        disabled={isLoading}
                        className={`w-full bg-${option.color}-600 hover:bg-${option.color}-700`}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Export {option.title}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Information Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Informasi Export:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• File akan otomatis di-download ke browser kamu</li>
                  <li>• Format file: .csv (Excel Compatible)</li>
                  <li>• Export dengan merge tanggal untuk tampilan yang rapi</li>
                  <li>• Data terbaru dari aplikasi akan di-export</li>
                  <li>• File export bisa langsung digunakan untuk import kembali</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready to Export
            </Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              <Calendar className="h-3 w-3 mr-1" />
              Auto-merge Dates
            </Badge>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
              <Settings className="h-3 w-3 mr-1" />
              Smart Formatting
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}