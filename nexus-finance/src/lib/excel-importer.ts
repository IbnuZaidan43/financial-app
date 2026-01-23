import * as XLSX from 'xlsx'

interface ImportedTransaction {
  tanggal: string
  judul: string
  jumlah: number
  tipe: 'pemasukan' | 'pengeluaran'
  kategori: string
  deskripsi: string
}

interface ImportResult {
  transactions: ImportedTransaction[]
  errors: string[]
}

export async function importTransactionsFromExcel(buffer: ArrayBuffer): Promise<ImportResult> {
  const result: ImportResult = {
    transactions: [],
    errors: []
  }

  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: false,
      defval: null
    })

    let dataStartRow = 6
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[]
      if (row.length > 0 && row[1] && typeof row[1] === 'string' && row[1].match(/\d{4}-\d{2}-\d{2}/)) {
        dataStartRow = i + 1
        break
      }
    }

    let dataEndRow = jsonData.length
    for (let i = dataStartRow; i < jsonData.length; i++) {
      const row = jsonData[i] as any[]
      if (row.length > 0 && row[0] && String(row[0]).toLowerCase() === 'total') {
        dataEndRow = i
        break
      }
    }

    for (let i = dataStartRow; i < dataEndRow; i++) {
      const row = jsonData[i] as any[]
      
      try {
        const transaction = parseTransactionRow(row, i + 1)
        if (transaction) {
          result.transactions.push(transaction)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown row error'
        result.errors.push(`Row ${i + 1}: ${errorMessage}`)
      }
    }

    if (result.transactions.length === 0) {
      result.errors.push('No valid transactions found in the file')
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse Excel file'
    result.errors.push(errorMessage)
  }

  return result
}

function parseTransactionRow(row: any[], rowNumber: number): ImportedTransaction | null {
  // Skip empty rows
  if (!row || row.length === 0 || !row[1]) {
    return null
  }

  // Extract data from row
  // Column mapping:
  // A: NO (0)
  // B: TANGGAL (1)
  // C-V: Tabungan data (2-22) - we'll sum these up
  // W: TOTAL (23)
  // X: DESKRIPSI (24)

  const tanggal = row[1]
  const deskripsi = row[24] || ''
  
  // Calculate total from tabungan columns (columns 2-22, step 3 for SUB TOTAL)
  let totalAmount = 0
  
  // Tabungan columns: C(2), D(3), E(4), F(5), G(6), H(7), I(8), J(9), K(10), L(11), M(12), N(13), O(14), P(15), Q(16), R(17), S(18), T(19), U(20), V(21), W(22)
  // SUB TOTAL columns are at indices 4, 7, 10, 13, 16, 19, 22 (every 3rd column starting from 4)
  const subtotalColumns = [4, 7, 10, 13, 16, 19, 22]
  
  for (const colIndex of subtotalColumns) {
    if (row[colIndex] && typeof row[colIndex] === 'number') {
      totalAmount += row[colIndex]
    }
  }

  // If no amount found, try to get from TOTAL column (index 23)
  if (totalAmount === 0 && row[23] && typeof row[23] === 'number') {
    totalAmount = row[23]
  }

  // Skip if no amount
  if (totalAmount === 0) {
    return null
  }

  // Validate date
  if (!tanggal || typeof tanggal !== 'string' || !tanggal.match(/\d{4}-\d{2}-\d{2}/)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }

  // Determine transaction type
  const tipe: 'pemasukan' | 'pengeluaran' = totalAmount >= 0 ? 'pemasukan' : 'pengeluaran'

  // Extract judul from deskripsi
  let judul = deskripsi
  if (deskripsi && deskripsi.length > 50) {
    judul = deskripsi.substring(0, 47) + '...'
  }

  if (!judul || judul.trim() === '') {
    judul = `Imported Transaction ${rowNumber}`
  }

  // Determine category based on description
  let kategori = 'Lainnya'
  const descLower = deskripsi.toLowerCase()
  
  // Category mapping
  const categoryMap: { [key: string]: string } = {
    'gaji': 'Gaji',
    'bonus': 'Bonus',
    'investasi': 'Investasi',
    'makan': 'Makanan',
    'makanan': 'Makanan',
    'belanja': 'Belanja',
    'transport': 'Transportasi',
    'bensin': 'Transportasi',
    'tagihan': 'Tagihan',
    'listrik': 'Tagihan',
    'pulsa': 'Tagihan',
    'hiburan': 'Hiburan',
    'nonton': 'Hiburan',
    'bioskop': 'Hiburan',
    'kesehatan': 'Kesehatan',
    'dokter': 'Kesehatan',
    'obat': 'Kesehatan',
    'pendidikan': 'Pendidikan',
    'kursus': 'Pendidikan',
    'buku': 'Pendidikan'
  }

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (descLower.includes(keyword)) {
      kategori = category
      break
    }
  }

  return {
    tanggal,
    judul,
    jumlah: Math.abs(totalAmount),
    tipe,
    kategori,
    deskripsi
  }
}

export function validateImportFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  // Check file type
  const allowedTypes = [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ]

  const allowedExtensions = ['.csv', '.xlsx', '.xls']
  const hasValidType = allowedTypes.includes(file.type)
  const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

  if (!hasValidType && !hasValidExtension) {
    return { valid: false, error: 'Invalid file type. Please upload an Excel or CSV file (.csv, .xlsx, or .xls)' }
  }

  return { valid: true }
}