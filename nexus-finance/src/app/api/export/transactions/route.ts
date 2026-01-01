import { NextRequest, NextResponse } from 'next/server'
import { exportTransactionsWithMerge } from '@/lib/excel-exporter'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get transactions with categories
    const transactions = await db.transaksi.findMany({
      include: {
        kategori: true
      },
      orderBy: {
        tanggal: 'desc'
      }
    })
    
    // Get savings for headers
    const savings = await db.tabungan.findMany({
      orderBy: {
        nama: 'asc'
      }
    })
    
    // Generate Excel file
    const excelBuffer = await exportTransactionsWithMerge(transactions, savings)
    
    // Return file response
    const response = new NextResponse(excelBuffer)
    response.headers.set('Content-Type', 'text/csv')
    response.headers.set('Content-Disposition', `attachment; filename="Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.csv"`)
    
    return response
    
  } catch (error) {
    console.error('Error exporting transactions:', error)
    return NextResponse.json({ error: 'Failed to export transactions' }, { status: 500 })
  }
}