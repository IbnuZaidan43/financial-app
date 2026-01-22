import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Tabungan } from '@prisma/client'

export const dynamic = 'force-dynamic';

// Helper function untuk mendapatkan userId dari request
const getUserIdFromRequest = (request: NextRequest) => {
  const url = new URL(request.url);
  return url.searchParams.get('userId') || 'default_user';
};

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    console.log('🔍 Fetching savings for userId:', userId);
    
    const tabungan = await db.tabungan.findMany({
      where: {
        userId: userId  // ← NEW: Filter per user
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('✅ Found', tabungan.length, 'savings for user:', userId);
    
    return NextResponse.json(tabungan)
  } catch (error) {
    console.error('Error fetching savings:', error)
    return NextResponse.json({ error: 'Failed to fetch savings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nama, saldoAwal, userId } = body  // ← NEW: Ambil userId dari body
    
    // Use provided userId or default
    const finalUserId = userId || 'default_user';
    
    console.log('💾 Creating savings for userId:', finalUserId, { nama, saldoAwal });
    
    const tabungan = await db.tabungan.create({
      data: {
        nama,
        saldoAwal: parseFloat(saldoAwal) || 0,
        jumlah: parseFloat(saldoAwal) || 0,
        userId: finalUserId  // ← NEW: Tambah userId
      }
    })
    
    console.log('✅ Savings created:', tabungan);
    
    return NextResponse.json(tabungan, { status: 201 })
  } catch (error) {
    console.error('Error creating savings:', error)
    return NextResponse.json({ error: 'Failed to create savings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nama, saldoAwal, userId } = body  // ← NEW: Ambil userId dari body
    
    // Use provided userId or default
    const finalUserId = userId || 'default_user';
    
    console.log('🔄 Updating savings for userId:', finalUserId, { id, nama, saldoAwal });
    
    // Verify user owns this savings
    const existingTabungan = await db.tabungan.findFirst({
      where: {
        id: parseInt(id),
        userId: finalUserId  // ← NEW: Validate ownership
      }
    });
    
    if (!existingTabungan) {
      console.log('❌ Savings not found or access denied for user:', finalUserId);
      return NextResponse.json({ error: 'Savings not found or access denied' }, { status: 404 })
    }
    
    const tabungan = await db.tabungan.update({
      where: { id: parseInt(id) },
      data: { 
        nama,
        saldoAwal: parseFloat(saldoAwal) || 0
      }
    })
    
    console.log('✅ Savings updated:', tabungan);
    
    return NextResponse.json(tabungan)
  } catch (error) {
    console.error('Error updating savings:', error)
    return NextResponse.json({ error: 'Failed to update savings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId } = body  // ← NEW: Ambil userId dari body
    
    // Use provided userId or default
    const finalUserId = userId || 'default_user';
    
    console.log('🗑️ Deleting savings for userId:', finalUserId, { id });
    
    // Verify user owns this savings
    const existingTabungan = await db.tabungan.findFirst({
      where: {
        id: parseInt(id),
        userId: finalUserId  // ← NEW: Validate ownership
      }
    });
    
    if (!existingTabungan) {
      console.log('❌ Savings not found or access denied for user:', finalUserId);
      return NextResponse.json({ error: 'Savings not found or access denied' }, { status: 404 })
    }
    
    await db.tabungan.delete({
      where: { id: parseInt(id) }
    })
    
    console.log('✅ Savings deleted successfully');
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting savings:', error)
    return NextResponse.json({ error: 'Failed to delete savings' }, { status: 500 })
  }
}