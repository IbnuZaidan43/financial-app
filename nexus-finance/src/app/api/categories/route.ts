import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const kategori = await db.kategori.findMany({
      orderBy: {
        nama: 'asc'
      }
    })
    
    return NextResponse.json(kategori)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nama, jenis, icon, warna } = body
    
    const kategori = await db.kategori.create({
      data: {
        nama,
        jenis,
        icon,
        warna
      }
    })
    
    return NextResponse.json(kategori, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}