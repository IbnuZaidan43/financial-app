import { Transaction, Tabungan, Kategori, ExcelRowData, ImportTransaction } from './import-export-types';
import * as XLSX from 'xlsx';

export class ExcelUtils {
  /**
   * Parse tanggal dari Excel cell (handle merged cells)
   */
  static parseTanggal(worksheet: XLSX.WorkSheet, row: number): string | null {
    try {
      const cell = worksheet[`B${row}`];
      if (!cell || cell.v === undefined || cell.v === null) return null;
      
      // Handle merged cells
      if (cell && typeof cell === 'object' && 'v' in cell) {
        return cell.v.toString();
      }
      
      return cell.toString();
    } catch (error) {
      console.error(`Error parsing tanggal for row ${row}:`, error);
      return null;
    }
  }

  /**
   * Parse deskripsi dari Excel cell
   */
  static parseDeskripsi(worksheet: XLSX.WorkSheet, row: number): string {
    try {
      const cell = worksheet[`X${row}`]; // Kolom X untuk deskripsi
      if (!cell || cell.v === undefined || cell.v === null) return '';
      
      return cell.toString().trim();
    } catch (error) {
      console.error(`Error parsing deskripsi for row ${row}:`, error);
      return '';
    }
  }

  /**
   * Parse jumlah dari Excel cell
   */
  static parseJumlah(worksheet: XLSX.WorkSheet, col: string, row: number): number {
    try {
      const cell = worksheet[`${col}${row}`];
      if (!cell || cell.v === undefined || cell.v === null) return 0;
      
      const value = parseFloat(cell.v.toString());
      return isNaN(value) ? 0 : value;
    } catch (error) {
      console.error(`Error parsing jumlah for ${col}${row}:`, error);
      return 0;
    }
  }

  /**
   * Check if row has any data
   */
  static hasRowData(worksheet: XLSX.WorkSheet, row: number): boolean {
    const tanggal = this.parseTanggal(worksheet, row);
    const deskripsi = this.parseDeskripsi(worksheet, row);
    
    // Check if any tabungan column has data
    const tabunganCols = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    const hasTabunganData = tabunganCols.some(col => 
      this.parseJumlah(worksheet, col, row) !== 0
    );
    
    return !!(tanggal || deskripsi || hasTabunganData);
  }

  /**
   * Extract data from a single row
   */
  static extractRowData(worksheet: XLSX.WorkSheet, row: number, tabunganNames: string[]): ExcelRowData {
    const tanggal = this.parseTanggal(worksheet, row) || '';
    const deskripsi = this.parseDeskripsi(worksheet, row);
    
    // Parse tabungan data (IN, OUT, SUB TOTAL for each tabungan)
    const tabunganData: { [key: string]: { in: number; out: number; subTotal: number } } = {};
    let total = 0;
    
    tabunganNames.forEach((tabungan, index) => {
      const baseCol = 4 + (index * 3); // Start from column D
      const inCol = XLSX.utils.encode_col(baseCol);
      const outCol = XLSX.utils.encode_col(baseCol + 1);
      const subTotalCol = XLSX.utils.encode_col(baseCol + 2);
      
      const inAmount = this.parseJumlah(worksheet, inCol, row);
      const outAmount = this.parseJumlah(worksheet, outCol, row);
      const subTotalAmount = this.parseJumlah(worksheet, subTotalCol, row);
      
      tabunganData[tabungan] = {
        in: inAmount,
        out: outAmount,
        subTotal: subTotalAmount
      };
      
      total += subTotalAmount;
    });
    
    return {
      no: row - 5, // Row number starting from 1
      tanggal,
      deskripsi,
      tabunganData,
      total,
      hasData: this.hasRowData(worksheet, row)
    };
  }

  /**
   * Parse entire worksheet for import
   */
  static parseImportData(worksheet: XLSX.WorkSheet): ImportTransaction[] {
    const transactions: ImportTransaction[] = [];
    
    // Get tabungan names from row 4 (headers)
    const tabunganNames = this.extractTabunganNames(worksheet);
    
    // Parse data rows (start from row 6)
    let row = 6;
    while (row <= 100) { // Reasonable limit
      if (!this.hasRowData(worksheet, row)) {
        row++;
        continue;
      }
      
      const rowData = this.extractRowData(worksheet, row, tabunganNames);
      
      if (rowData.hasData && rowData.tanggal) {
        transactions.push({
          tanggal: rowData.tanggal,
          deskripsi: rowData.deskripsi,
          tabunganData: rowData.tabunganData,
          total: rowData.total
        });
      }
      
      row++;
    }
    
    return transactions;
  }

  /**
   * Extract tabungan names from headers
   */
  static extractTabunganNames(worksheet: XLSX.WorkSheet): string[] {
    const tabunganNames: string[] = [];
    
    // Headers are in row 4, starting from column D
    let col = 4; // Column D
    while (col <= 20) { // Reasonable limit
      const cell = worksheet[`${XLSX.utils.encode_col(col)}4`];
      if (!cell || !cell.v) break;
      
      const headerName = cell.v.toString().toLowerCase();
      if (headerName === 'total tabungan') break;
      
      tabunganNames.push(headerName);
      col += 3; // Skip 3 columns (IN, OUT, SUB TOTAL)
    }
    
    return tabunganNames;
  }

  /**
   * Convert Excel transactions to database format
   */
  static convertToDatabaseTransactions(
    importTransactions: ImportTransaction[],
    categories: Kategori[]
  ): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] {
    const dbTransactions: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    importTransactions.forEach(impTrans => {
      // For each tabungan that has data, create a transaction
      Object.entries(impTrans.tabunganData).forEach(([tabunganName, data]) => {
        if (data.in > 0) {
          // Create pemasukan transaction
          dbTransactions.push({
            judul: this.extractJudulFromDeskripsi(impTrans.deskripsi, 'pemasukan'),
            jumlah: data.in,
            deskripsi: impTrans.deskripsi,
            tanggal: new Date(impTrans.tanggal),
            tipe: 'pemasukan',
            kategoriId: this.getCategoryIdFromDeskripsi(impTrans.deskripsi, 'pemasukan', categories)
          });
        }
        
        if (data.out > 0) {
          // Create pengeluaran transaction
          dbTransactions.push({
            judul: this.extractJudulFromDeskripsi(impTrans.deskripsi, 'pengeluaran'),
            jumlah: data.out,
            deskripsi: impTrans.deskripsi,
            tanggal: new Date(impTrans.tanggal),
            tipe: 'pengeluaran',
            kategoriId: this.getCategoryIdFromDeskripsi(impTrans.deskripsi, 'pengeluaran', categories)
          });
        }
      });
    });
    
    return dbTransactions;
  }

  /**
   * Extract judul from deskripsi
   */
  static extractJudulFromDeskripsi(deskripsi: string, tipe: 'pemasukan' | 'pengeluaran'): string {
    if (!deskripsi) return tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
    
    // Take first 50 characters as judul
    return deskripsi.length > 50 ? deskripsi.substring(0, 47) + '...' : deskripsi;
  }

  /**
   * Get category ID from deskripsi (simple keyword matching)
   */
  static getCategoryIdFromDeskripsi(
    deskripsi: string, 
    tipe: 'pemasukan' | 'pengeluaran', 
    categories: Kategori[]
  ): number | null {
    if (!deskripsi) return null;
    
    const deskripsiLower = deskripsi.toLowerCase();
    
    // Find matching category based on keywords
    const matchingCategory = categories.find(cat => {
      if (cat.jenis !== tipe) return false;
      
      const keywords = this.getCategoryKeywords(cat.nama);
      return keywords.some(keyword => deskripsiLower.includes(keyword));
    });
    
    return matchingCategory ? matchingCategory.id : null;
  }

  /**
   * Get keywords for category matching
   */
  static getCategoryKeywords(categoryName: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'Gaji': ['gaji', 'salary', 'upah'],
      'Bonus': ['bonus', 'tunjangan'],
      'Investasi': ['investasi', 'dividen', 'saham'],
      'Makanan': ['makan', 'makanan', 'food', 'resto', 'cafe'],
      'Transportasi': ['transportasi', 'bensin', 'tol', 'parkir', 'ojek'],
      'Belanja': ['belanja', 'shopping', 'toko', 'mall'],
      'Tagihan': ['tagihan', 'listrik', 'air', 'internet', 'pulsa'],
      'Hiburan': ['hiburan', 'bioskop', 'movie', 'game'],
      'Kesehatan': ['kesehatan', 'dokter', 'obat', 'rumah sakit'],
      'Pendidikan': ['pendidikan', 'kursus', 'sekolah', 'buku']
    };
    
    return keywordMap[categoryName] || [categoryName.toLowerCase()];
  }

  /**
   * Validate imported data
   */
  static validateImportData(transactions: ImportTransaction[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    transactions.forEach((trans, index) => {
      // Validate tanggal
      if (!trans.tanggal) {
        errors.push(`Baris ${index + 1}: Tanggal tidak boleh kosong`);
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(trans.tanggal)) {
          errors.push(`Baris ${index + 1}: Format tanggal harus YYYY-MM-DD`);
        }
      }
      
      // Validate total
      if (trans.total === 0) {
        errors.push(`Baris ${index + 1}: Total tidak boleh nol`);
      }
      
      // Validate deskripsi
      if (!trans.deskripsi.trim()) {
        errors.push(`Baris ${index + 1}: Deskripsi tidak boleh kosong`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}