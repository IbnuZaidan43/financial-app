import { NextRequest, NextResponse } from 'next/server'
import { importTransactionsFromExcel } from '@/lib/excel-importer'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    
    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' }, { status: 400 })
    }
    
    // Convert file to buffer
    const buffer = await file.arrayBuffer()
    
    // Import transactions from Excel
    const result = await importTransactionsFromExcel(buffer)
    
    // Save transactions to database
    const savedTransactions = []
    for (const transData of result.transactions) {
      try {
        // Find category by name
        let kategori = await db.kategori.findFirst({
          where: {
            nama: transData.kategori,
            jenis: transData.tipe
          }
        })
        
        // If category not found, use "Lainnya"
        if (!kategori) {
          kategori = await db.kategori.findFirst({
            where: {
              nama: 'Lainnya',
              jenis: transData.tipe
            }
          })
        }
        
        const transaction = await db.transaksi.create({
          data: {
            judul: transData.judul,
            jumlah: Math.abs(transData.jumlah),
            deskripsi: transData.deskripsi,
            tanggal: new Date(transData.tanggal),
            tipe: transData.tipe,
            kategoriId: kategori?.id
          }
        })
        
        savedTransactions.push(transaction)
      } catch (error) {
        console.error('Error saving transaction:', error)
        // Continue with other transactions
      }
    }
    
    return NextResponse.json({
      message: `Successfully imported ${savedTransactions.length} out of ${result.transactions.length} transactions`,
      imported: savedTransactions.length,
      total: result.transactions.length,
      errors: result.errors,
      transactions: savedTransactions
    })
    
  } catch (error) {
    console.error('Error importing transactions:', error)
    return NextResponse.json({ error: 'Failed to import transactions: ' + error.message }, { status: 500 })
  }
}