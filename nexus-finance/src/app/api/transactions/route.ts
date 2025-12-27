import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const tabungan = await db.tabungan.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(tabungan)
  } catch (error) {
    console.error('Error fetching savings:', error)
    return NextResponse.json({ error: 'Failed to fetch savings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nama, target, targetDate } = body
    
    const tabungan = await db.tabungan.create({
      data: {
        nama,
        target: parseFloat(target),
        targetDate: targetDate ? new Date(targetDate) : null,
        jumlah: 0
      }
    })
    
    return NextResponse.json(tabungan, { status: 201 })
  } catch (error) {
    console.error('Error creating savings:', error)
    return NextResponse.json({ error: 'Failed to create savings' }, { status: 500 })
  }
}

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
    console.error('Error updating savings:', error)
    return NextResponse.json({ error: 'Failed to update savings' }, { status: 500 })
  }
}