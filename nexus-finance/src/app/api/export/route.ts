import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

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

    // Get savings
    const savings = await db.tabungan.findMany({
      orderBy: {
        nama: 'asc'
      }
    })

    // Group transactions by date for merging
    const transactionsByDate = {}
    for (const trans of transactions) {
      const tanggal = trans.tanggal.toISOString().split('T')[0]
      if (!transactionsByDate[tanggal]) {
        transactionsByDate[tanggal] = []
      }
      transactionsByDate[tanggal].push(trans)
    }

    // Create workbook
    const wb = XLSX.utils.book_new()
    const wsData = []

    // Get current month and year
    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    // Row 1: Empty
    wsData.push([])

    // Row 2: Title
    const titleRow = new Array(24).fill('')
    titleRow[1] = `LAPORAN KEUANGAN - ${currentMonth}`
    wsData.push(titleRow)

    // Row 3: Empty
    wsData.push([])

    // Row 4: Headers
    const headerRow = ['NO', 'TANGGAL']
    const tabunganNames = savings.map(s => s.nama)
    
    // Add tabungan headers (3 columns each)
    for (const tabungan of tabunganNames) {
      headerRow.push(tabungan.toUpperCase(), '', '')
    }
    
    headerRow.push('TOTAL TABUNGAN', 'DESKRIPSI')
    wsData.push(headerRow)

    // Row 5: Sub-headers
    const subheaderRow = ['', '']
    for (const tabungan of tabunganNames) {
      subheaderRow.push('IN', 'OUT', 'SUB TOTAL')
    }
    subheaderRow.push('TOTAL', '')
    wsData.push(subheaderRow)

    // Add transaction data with date merging
    let currentRow = 6
    let nomorCounter = 1

    for (const [tanggal, transList] of Object.entries(transactionsByDate).sort((a, b) => b[0].localeCompare(a[0]))) {
      const sameDateCount = transList.length

      // Process each transaction for this date
      for (let i = 0; i < transList.length; i++) {
        const trans = transList[i]
        const rowNum = currentRow + i
        
        const rowData = new Array(24).fill('')
        
        // Column A: Nomor
        if (i === 0) {
          if (sameDateCount > 1) {
            rowData[0] = `${nomorCounter}-${nomorCounter + sameDateCount - 1}`
          } else {
            rowData[0] = nomorCounter
          }
        }
        
        // Column B: Tanggal (only for first transaction of the group)
        if (i === 0) {
          rowData[1] = tanggal
        }
        
        // Tabungan columns
        let colIndex = 2
        for (let tabunganIdx = 0; tabunganIdx < tabunganNames.length; tabunganIdx++) {
          for (let subheaderIdx = 0; subheaderIdx < 3; subheaderIdx++) {
            if (subheaderIdx === 2) { // SUB TOTAL
              // Formula will be added later
              rowData[colIndex] = 0
            } else { // IN or OUT
              let amount = 0
              
              if (trans.tipe === 'pemasukan' && subheaderIdx === 0 && tabunganIdx === 0) {
                amount = trans.jumlah
              } else if (trans.tipe === 'pengeluaran' && subheaderIdx === 1 && tabunganIdx === 0) {
                amount = trans.jumlah
              }
              
              rowData[colIndex] = amount
            }
            colIndex++
          }
        }
        
        // Total column
        rowData[colIndex] = 0
        colIndex++
        
        // Deskripsi column
        if (trans.deskripsi && trans.deskripsi.trim()) {
          rowData[colIndex] = trans.deskripsi
        } else {
          rowData[colIndex] = trans.kategori ? `${trans.kategori.icon} ${trans.judul}` : trans.judul
        }
        
        wsData.push(rowData)
      }

      nomorCounter += sameDateCount
      currentRow += sameDateCount
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    
    // Add merges for dates
    let mergeStart = 6
    for (const [tanggal, transList] of Object.entries(transactionsByDate).sort((a, b) => b[0].localeCompare(a[0]))) {
      if (transList.length > 1) {
        // Merge date column (B)
        ws['!merges'] = ws['!merges'] || []
        ws['!merges'].push(XLSX.utils.decode_range(`B${mergeStart}:B${mergeStart + transList.length - 1}`))
        
        // Merge NO column (A)
        ws['!merges'].push(XLSX.utils.decode_range(`A${mergeStart}:A${mergeStart + transList.length - 1}`))
      }
      mergeStart += transList.length
    }

    // Add header merges
    ws['!merges'] = ws['!merges'] || []
    
    // Title merge
    ws['!merges'].push(XLSX.utils.decode_range('B2:X2'))
    
    // Tabungan header merges
    let headerCol = 4 // Column D
    for (const tabungan of tabunganNames) {
      const startCol = XLSX.utils.encode_col(headerCol)
      const endCol = XLSX.utils.encode_col(headerCol + 2)
      ws['!merges'].push(XLSX.utils.decode_range(`${startCol}4:${endCol}4`))
      headerCol += 3
    }

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },   // A
      { wch: 12 },  // B
      ...tabunganNames.flatMap(() => [{ wch: 15 }, { wch: 15 }, { wch: 15 }]), // Tabungan columns
      { wch: 18 },  // Total
      { wch: 40 }   // Deskripsi
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan')

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}