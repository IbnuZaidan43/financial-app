import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

interface TransactionData {
  judul: string;
  jumlah: number;
  deskripsi: string;
  tanggal: Date;
  tipe: 'pemasukan' | 'pengeluaran';
  kategoriId: number | null;
}

interface SavedTransaction {
  id: number;
  judul: string;
  jumlah: number;
  deskripsi: string;
  tanggal: Date;
  tipe: string;
  kategoriId: number | null;
  kategori: {
    id: number;
    nama: string;
    jenis: string;
    icon: string | null;
    warna: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const savings = await db.tabungan.findMany({
      orderBy: { nama: 'asc' }
    })

    const tabunganNames = savings.map(s => s.nama)
    const transactions: TransactionData[] = []
    let rowNum = 6
    const maxRows = 100

    while (rowNum <= maxRows) {
      const rowData = extractRowData(worksheet, rowNum, tabunganNames)
      
      if (!rowData.hasData) {
        break
      }

      const transaction: TransactionData = {
        judul: extractJudulFromDeskripsi(rowData.deskripsi),
        jumlah: Math.abs(rowData.totalAmount),
        deskripsi: rowData.deskripsi,
        tanggal: new Date(rowData.tanggal),
        tipe: rowData.totalAmount >= 0 ? 'pemasukan' : 'pengeluaran',
        kategoriId: await getCategoryIdFromDeskripsi(rowData.deskripsi)
      }

      transactions.push(transaction)
      rowNum++
    }

    const savedTransactions: SavedTransaction[] = []
    for (const trans of transactions) {
      try {
        const saved = await db.transaksi.create({
          data: trans,
          include: {
            kategori: true
          }
        })
        savedTransactions.push(saved as SavedTransaction)
      } catch (saveError) {
        console.error('Error saving transaction:', saveError)
      }
    }

    return NextResponse.json({
      message: `Berhasil import ${savedTransactions.length} dari ${transactions.length} transaksi`,
      count: savedTransactions.length,
      transactions: savedTransactions
    })

  } catch (error) {
    console.error('Error importing data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: 'Failed to import data: ' + errorMessage }, { status: 500 })
  }
}

function extractRowData(worksheet: any, rowNum: number, tabunganNames: string[]) {
  try {
    const deskripsiCell = worksheet[`X${rowNum}`]
    const deskripsi = deskripsiCell ? String(deskripsiCell.v || '').trim() : ''
    const totalCell = worksheet[`W${rowNum}`]
    const totalAmount = totalCell ? (totalCell.v || 0) : 0
    let tanggal = ''
    const dateCell = worksheet[`B${rowNum}`]
    
    if (dateCell) {
      if (dateCell.t) {
        const masterCell = worksheet[XLSX.utils.encode_cell(dateCell.t)]
        tanggal = masterCell ? String(masterCell.v || '') : ''
      } else {
        tanggal = String(dateCell.v || '')
      }
    }

    const hasData = deskripsi || totalAmount !== 0 || tanggal

    return {
      hasData,
      tanggal,
      deskripsi,
      totalAmount
    }
  } catch (error) {
    console.error(`Error extracting row ${rowNum}:`, error)
    return { hasData: false, tanggal: '', deskripsi: '', totalAmount: 0 }
  }
}

function extractJudulFromDeskripsi(deskripsi: string): string {
  const cleanDeskripsi = deskripsi.replace(/[^\w\s]/g, '').trim()
  const words = cleanDeskripsi.split(' ')
  return words.slice(0, 4).join(' ') || 'Transaksi Import'
}

async function getCategoryIdFromDeskripsi(deskripsi: string): Promise<number | null> {
  try {
    const keywords = {
      'gaji': 'Gaji',
      'bonus': 'Bonus',
      'investasi': 'Investasi',
      'makan': 'Makanan',
      'belanja': 'Belanja',
      'transport': 'Transportasi',
      'bensin': 'Transportasi',
      'tol': 'Transportasi',
      'tagihan': 'Tagihan',
      'listrik': 'Tagihan',
      'pulsa': 'Tagihan',
      'internet': 'Tagihan',
      'hiburan': 'Hiburan',
      'bioskop': 'Hiburan',
      'game': 'Hiburan',
      'kesehatan': 'Kesehatan',
      'dokter': 'Kesehatan',
      'obat': 'Kesehatan',
      'pendidikan': 'Pendidikan',
      'kursus': 'Pendidikan',
      'buku': 'Pendidikan'
    }

    const lowerDeskripsi = deskripsi.toLowerCase()
    
    for (const [keyword, categoryName] of Object.entries(keywords)) {
      if (lowerDeskripsi.includes(keyword)) {
        const category = await db.kategori.findFirst({
          where: { nama: categoryName }
        })
        return category ? category.id : null
      }
    }

    if (lowerDeskripsi.includes('gaji') || lowerDeskripsi.includes('bonus') || lowerDeskripsi.includes('investasi')) {
      const category = await db.kategori.findFirst({
        where: { nama: 'Lainnya', jenis: 'pemasukan' }
      })
      return category ? category.id : null
    } else {
      const category = await db.kategori.findFirst({
        where: { nama: 'Lainnya', jenis: 'pengeluaran' }
      })
      return category ? category.id : null
    }
  } catch (error) {
    console.error('Error getting category ID:', error)
    return null
  }
}