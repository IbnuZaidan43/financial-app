import { format } from 'date-fns'

interface Transaction {
  id: number
  judul: string
  jumlah: number
  deskripsi?: string | null
  tanggal: Date
  tipe: 'pemasukan' | 'pengeluaran'
  kategori?: {
    id: number
    nama: string
    jenis: string
    icon?: string | null
  } | null
}

interface Saving {
  id: number
  nama: string
  target: number
  jumlah: number
  targetDate?: Date | null
}

export async function exportTransactionsWithMerge(transactions: Transaction[], savings: Saving[]): Promise<Buffer> {
  // For now, return a simple CSV buffer as placeholder
  // In production, this would use a proper Excel library
  const currentMonth = format(new Date(), 'MMMM yyyy')
  
  let csvContent = `LAPORAN KEUANGAN - ${currentMonth}\n\n`
  csvContent += 'NO,TANGGAL,JUDUL,JUMLAH,TIPE,KATEGORI,DESKRIPSI\n'
  
  transactions.forEach((trans, index) => {
    const tanggal = format(trans.tanggal, 'yyyy-MM-dd')
    const judul = `"${trans.judul}"`
    const jumlah = trans.jumlah
    const tipe = trans.tipe
    const kategori = trans.kategori?.nama || 'Lainnya'
    const deskripsi = `"${trans.deskripsi || ''}"`
    
    csvContent += `${index + 1},${tanggal},${judul},${jumlah},${tipe},${kategori},${deskripsi}\n`
  })
  
  return Buffer.from(csvContent, 'utf-8')
}

export async function exportSavings(savings: Saving[]): Promise<Buffer> {
  let csvContent = 'LAPORAN TABUNGAN\n\n'
  csvContent += 'NO,NAMA,TARGET,JUMLAH,PROGRES\n'
  
  savings.forEach((saving, index) => {
    const nama = `"${saving.nama}"`
    const target = saving.target
    const jumlah = saving.jumlah
    const progres = target > 0 ? ((jumlah / target) * 100).toFixed(1) : '0'
    
    csvContent += `${index + 1},${nama},${target},${jumlah},${progres}%\n`
  })
  
  return Buffer.from(csvContent, 'utf-8')
}