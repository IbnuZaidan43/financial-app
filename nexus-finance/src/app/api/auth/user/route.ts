import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'default_user';
    
    console.log('👤 Getting user info for userId:', userId);
    
    // Untuk Phase 1, kita tidak simpan user di database
    // Cukup return user info dari userId
    const userInfo = {
      id: userId,
      name: userId === 'default_user' ? 'Default User' : `User ${userId.substr(-6)}`,
      createdAt: new Date().toISOString(),
      isDefault: userId === 'default_user'
    };
    
    console.log('✅ User info retrieved:', userInfo);
    
    return NextResponse.json(userInfo)
  } catch (error) {
    console.error('Error getting user info:', error)
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 })
  }
}

// POST: Create or update user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, email } = body
    
    console.log('👤 Creating/updating user:', { userId, name, email });
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    // Untuk Phase 1, kita tidak simpan user di database
    // Cukup return success response
    const userInfo = {
      id: userId,
      name: name || `User ${userId.substr(-6)}`,
      email: email || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ User created/updated:', userInfo);
    
    return NextResponse.json(userInfo, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating user:', error)
    return NextResponse.json({ error: 'Failed to create/update user' }, { status: 500 })
  }
}

// PUT: Update user profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, email } = body
    
    console.log('👤 Updating user profile:', { userId, name, email });
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    // Untuk Phase 1, kita tidak simpan user di database
    // Cukup return success response
    const userInfo = {
      id: userId,
      name: name || `User ${userId.substr(-6)}`,
      email: email || undefined,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ User profile updated:', userInfo);
    
    return NextResponse.json(userInfo)
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
  }
}

// DELETE: Delete user (untuk testing)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body
    
    console.log('🗑️ Deleting user:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }
    
    // Untuk Phase 1, kita tidak hapus user dari database
    // Cukup return success response
    console.log('✅ User deleted:', userId);
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}