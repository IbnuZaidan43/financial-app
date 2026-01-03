import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

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

    const transactionsByDate: Record<string, any[]> = {}
    for (const trans of transactions) {
      const tanggal = trans.tanggal.toISOString().split('T')[0]
      if (!transactionsByDate[tanggal]) {
        transactionsByDate[tanggal] = []
      }
      transactionsByDate[tanggal].push(trans)
    }

    const wb = XLSX.utils.book_new()
    const wsData: any[][] = []
    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    wsData.push([])
    const titleRow = new Array(24).fill('')
    titleRow[1] = `LAPORAN KEUANGAN - ${currentMonth}`
    wsData.push(titleRow)
    wsData.push([])
    const headerRow: string[] = ['NO', 'TANGGAL']
    const tabunganNames = savings.map(s => s.nama)
    
    for (const tabungan of tabunganNames) {
      headerRow.push(tabungan.toUpperCase(), '', '')
    }
    
    headerRow.push('TOTAL TABUNGAN', 'DESKRIPSI')
    wsData.push(headerRow)

    const subheaderRow: string[] = ['', '']
    for (const tabungan of tabunganNames) {
      subheaderRow.push('IN', 'OUT', 'SUB TOTAL')
    }
    subheaderRow.push('TOTAL', '')
    wsData.push(subheaderRow)

    let currentRow = 6
    let nomorCounter = 1
    const sortedDates = Object.keys(transactionsByDate).sort((a, b) => b.localeCompare(a))

    for (const tanggal of sortedDates) {
      const transList = transactionsByDate[tanggal]
      const sameDateCount = transList.length

      for (let i = 0; i < transList.length; i++) {
        const trans = transList[i]
        const rowNum = currentRow + i
        const rowData = new Array(24).fill('')
        if (i === 0) {
          if (sameDateCount > 1) {
            rowData[0] = `${nomorCounter}-${nomorCounter + sameDateCount - 1}`
          } else {
            rowData[0] = nomorCounter
          }
        }
        
        if (i === 0) {
          rowData[1] = tanggal
        }
        
        let colIndex = 2
        for (let tabunganIdx = 0; tabunganIdx < tabunganNames.length; tabunganIdx++) {
          for (let subheaderIdx = 0; subheaderIdx < 3; subheaderIdx++) {
            if (subheaderIdx === 2) {
              rowData[colIndex] = 0
            } else {
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
        
        rowData[colIndex] = 0
        colIndex++
        if (trans.deskripsi && trans.deskripsi.trim()) {
          rowData[colIndex] = trans.deskripsi
        } else {
          rowData[colIndex] = trans.kategori ? `${trans.kategori.icon || ''} ${trans.judul}` : trans.judul
        }
        
        wsData.push(rowData)
      }

      nomorCounter += sameDateCount
      currentRow += sameDateCount
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!merges'] = []
    let mergeStart = 6
    for (const tanggal of sortedDates) {
      const transList = transactionsByDate[tanggal]
      if (transList.length > 1) {
        ws['!merges'].push({
          s: { r: mergeStart - 1, c: 1 },
          e: { r: mergeStart + transList.length - 2, c: 1 } 
        })
        
        ws['!merges'].push({
          s: { r: mergeStart - 1, c: 0 },
          e: { r: mergeStart + transList.length - 2, c: 0 }
        })
      }
      mergeStart += transList.length
    }

    ws['!merges'].push({
      s: { r: 1, c: 1 },
      e: { r: 1, c: 23 }
    })
    
    let headerCol = 3
    for (const tabungan of tabunganNames) {
      ws['!merges'].push({
        s: { r: 3, c: headerCol },
        e: { r: 3, c: headerCol + 2 }
      })
      headerCol += 3
    }

    ws['!cols'] = [
      { wch: 8 },
      { wch: 12 },
      ...tabunganNames.flatMap(() => [{ wch: 15 }, { wch: 15 }, { wch: 15 }]), // Tabungan columns
      { wch: 18 },
      { wch: 40 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error exporting data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: 'Failed to export data: ' + errorMessage }, { status: 500 })
  }
}