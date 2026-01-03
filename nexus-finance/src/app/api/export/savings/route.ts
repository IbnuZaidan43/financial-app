import { NextRequest, NextResponse } from 'next/server'
import { exportSavings } from '@/lib/excel-exporter'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const savings = await db.tabungan.findMany({
      orderBy: {
        nama: 'asc'
      }
    })
    
    const excelBuffer = await exportSavings(savings as any)
    const response = new NextResponse(excelBuffer as any)
    response.headers.set('Content-Type', 'text/csv')
    response.headers.set('Content-Disposition', `attachment; filename="Laporan_Tabungan_${new Date().toISOString().split('T')[0]}.csv"`)
    return response
    
  } catch (error) {
    console.error('Error exporting savings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: 'Failed to export savings: ' + errorMessage }, { status: 500 })
  }
}