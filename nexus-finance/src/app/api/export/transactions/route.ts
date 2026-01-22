import { NextRequest, NextResponse } from 'next/server'
import { exportTransactionsWithMerge } from '@/lib/excel-exporter'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const transactions = await db.transaksi.findMany({
      include: {
        kategori: true
      },
      orderBy: {
        tanggal: 'desc'
      }
    })

    const savings = await db.tabungan.findMany({
      orderBy: {
        nama: 'asc'
      }
    })
    
    const excelBuffer = await exportTransactionsWithMerge(transactions as any, savings as any)
    const response = new NextResponse(excelBuffer as any)
    response.headers.set('Content-Type', 'text/csv')
    response.headers.set('Content-Disposition', `attachment; filename="Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.csv"`)
    return response
    
  } catch (error) {
    console.error('Error exporting transactions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: 'Failed to export transactions: ' + errorMessage }, { status: 500 })
  }
}