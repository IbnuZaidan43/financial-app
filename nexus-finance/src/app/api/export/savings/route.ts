import { NextRequest, NextResponse } from 'next/server'
import { exportSavings } from '@/lib/excel-exporter'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get savings data
    const savings = await db.tabungan.findMany({
      orderBy: {
        nama: 'asc'
      }
    })
    
    // Generate Excel file
    const excelBuffer = await exportSavings(savings)
    
    // Return file response
    const response = new NextResponse(excelBuffer)
    response.headers.set('Content-Type', 'text/csv')
    response.headers.set('Content-Disposition', `attachment; filename="Laporan_Tabungan_${new Date().toISOString().split('T')[0]}.csv"`)
    
    return response
    
  } catch (error) {
    console.error('Error exporting savings:', error)
    return NextResponse.json({ error: 'Failed to export savings' }, { status: 500 })
  }
}