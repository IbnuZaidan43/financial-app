import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, jumlah } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    
    const tabungan = await db.tabungan.update({
      where: { id: id },
      data: { jumlah: parseFloat(jumlah) }
    })
    
    return NextResponse.json(tabungan)
  } catch (error) {
    console.error('Error updating balance:', error)
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }
}