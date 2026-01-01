import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]

    // Get savings for column mapping
    const savings = await db.tabungan.findMany({
      orderBy: { nama: 'asc' }
    })

    const tabunganNames = savings.map(s => s.nama)
    const transactions = []

    // Read data from row 6 onwards
    let rowNum = 6
    const maxRows = 100 // Prevent infinite loops

    while (rowNum <= maxRows) {
      // Check if row has data
      const rowData = extractRowData(worksheet, rowNum, tabunganNames)
      
      if (!rowData.hasData) {
        break
      }

      // Create transaction object
      const transaction = {
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

    // Save transactions to database
    const savedTransactions = []
    for (const trans of transactions) {
      const saved = await db.transaksi.create({
        data: trans,
        include: {
          kategori: true
        }
      })
      savedTransactions.push(saved)
    }

    return NextResponse.json({
      message: `Berhasil import ${transactions.length} transaksi`,
      count: transactions.length,
      transactions: savedTransactions
    })

  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json({ error: 'Failed to import data: ' + error.message }, { status: 500 })
  }
}

function extractRowData(worksheet: any, rowNum: number, tabunganNames: string[]) {
  try {
    // Get deskripsi (always individual)
    const deskripsiCell = worksheet[`X${rowNum}`]
    const deskripsi = deskripsiCell ? String(deskripsiCell.v || '').trim() : ''

    // Get total amount
    const totalCell = worksheet[`W${rowNum}`]
    const totalAmount = totalCell ? (totalCell.v || 0) : 0

    // Get tanggal (handle merged cells)
    let tanggal = ''
    const dateCell = worksheet[`B${rowNum}`]
    
    if (dateCell) {
      if (dateCell.t) {
        // Merged cell - get the master cell value
        const masterCell = worksheet[XLSX.utils.encode_cell(dateCell.t)]
        tanggal = masterCell ? String(masterCell.v || '') : ''
      } else {
        // Regular cell
        tanggal = String(dateCell.v || '')
      }
    }

    // Check if row has meaningful data
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
  // Extract judul from deskripsi (remove icons and clean up)
  const cleanDeskripsi = deskripsi.replace(/[^\w\s]/g, '').trim()
  const words = cleanDeskripsi.split(' ')
  
  // Take first 3-4 words as judul
  return words.slice(0, 4).join(' ') || 'Transaksi Import'
}

async function getCategoryIdFromDeskripsi(deskripsi: string): Promise<number | null> {
  try {
    // Simple keyword matching for categories
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

    // Default category based on amount or keywords
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