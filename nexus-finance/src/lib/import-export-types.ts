export interface Transaction {
  id: number;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: Date;
  tipe: 'pemasukan' | 'pengeluaran';
  kategoriId: number | null;
  kategori?: {
    id: number;
    nama: string;
    jenis: string;
    icon?: string;
    warna?: string;
  };
}

export interface Tabungan {
  id: number;
  nama: string;
  target: number;
  targetDate: Date | null;
  jumlah: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Kategori {
  id: number;
  nama: string;
  jenis: string;
  icon?: string;
  warna?: string;
}

export interface ExportData {
  transactions: Transaction[];
  savings: Tabungan[];
  categories: Kategori[];
}

export interface ImportTransaction {
  tanggal: string;
  deskripsi: string;
  tabunganData: {
    [tabunganName: string]: {
      in: number;
      out: number;
    };
  };
  total: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

export interface ExcelCell {
  value: any;
  isMerged?: boolean;
  masterCell?: ExcelCell;
}

export interface ExcelRowData {
  no: string | number;
  tanggal: string;
  deskripsi: string;
  tabunganData: { [key: string]: { in: number; out: number; subTotal: number } };
  total: number;
  hasData: boolean;
}