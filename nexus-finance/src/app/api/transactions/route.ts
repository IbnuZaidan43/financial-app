import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const transaksi = await db.transaksi.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        kategori: true
      }
    })
    
    return NextResponse.json(transaksi)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { judul, jumlah, deskripsi, tanggal, tipe, kategoriId } = body
    
    const transaksi = await db.transaksi.create({
      data: {
        judul,
        jumlah: parseFloat(jumlah),
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        tipe,
        kategoriId: kategoriId ? parseInt(kategoriId) : null
      }
    })
    
    return NextResponse.json(transaksi, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, judul, jumlah, deskripsi, tanggal, tipe, kategoriId } = body
    
    const transaksi = await db.transaksi.update({
      where: { id: parseInt(id) },
      data: {
        judul,
        jumlah: parseFloat(jumlah),
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        tipe,
        kategoriId: kategoriId ? parseInt(kategoriId) : null
      }
    })
    
    return NextResponse.json(transaksi)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    
    await db.transaksi.delete({
      where: { id: parseInt(id) }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}