import { NextRequest, NextResponse } from 'next/server'
import { importTransactionsFromExcel } from '@/lib/excel-importer'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

interface SavedTransaction {
  id: number;
  judul: string;
  jumlah: number;
  deskripsi: string | null;
  tanggal: Date;
  tipe: string;
  kategoriId: number | null;
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
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' }, { status: 400 })
    }
    
    const buffer = await file.arrayBuffer()
    const result = await importTransactionsFromExcel(buffer)
    const savedTransactions: SavedTransaction[] = []
    for (const transData of result.transactions) {
      try {
        let kategori = await db.kategori.findFirst({
          where: {
            nama: transData.kategori,
            jenis: transData.tipe
          }
        })
        
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
        
        savedTransactions.push(transaction as SavedTransaction)
      } catch (error) {
        console.error('Error saving transaction:', error)
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ error: 'Failed to import transactions: ' + errorMessage }, { status: 500 })
  }
}