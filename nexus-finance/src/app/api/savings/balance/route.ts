import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, jumlah } = body
    
    const tabungan = await db.tabungan.update({
      where: { id: parseInt(id) },
      data: { jumlah: parseFloat(jumlah) }
    })
    
    return NextResponse.json(tabungan)
  } catch (error) {
    console.error('Error updating balance:', error)
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }
}