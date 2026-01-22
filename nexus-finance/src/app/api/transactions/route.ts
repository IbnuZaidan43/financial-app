import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

// Helper function untuk mendapatkan userId dari request
const getUserIdFromRequest = (request: NextRequest) => {
  const url = new URL(request.url);
  return url.searchParams.get('userId') || 'default_user';
};

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    console.log('🔍 Fetching transactions for userId:', userId);
    
    const transaksi = await db.transaksi.findMany({
      where: {
        userId: userId  // ← NEW: Filter per user
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        kategori: true
      }
    })
    
    console.log('✅ Found', transaksi.length, 'transactions for user:', userId);
    
    return NextResponse.json(transaksi)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId, userId } = body  // ← NEW: Ambil userId
    
    // Use provided userId or default
    const finalUserId = userId || 'default_user';
    
    console.log('📝 Creating transaction:', { judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId, userId: finalUserId });
    
    // Verify user owns the tabungan if tabunganId is provided
    if (tabunganId) {
      const tabungan = await db.tabungan.findFirst({
        where: {
          id: parseInt(tabunganId),
          userId: finalUserId  // ← NEW: Validate tabungan ownership
        }
      });
      
      if (!tabungan) {
        console.log('❌ Tabungan not found or access denied for user:', finalUserId);
        return NextResponse.json({ error: 'Tabungan not found or access denied' }, { status: 404 })
      }
    }
    
    // Create transaction
    const transaksi = await db.transaksi.create({
      data: {
        judul,
        jumlah: parseFloat(jumlah),
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        tipe,
        kategoriId: kategoriId ? parseInt(kategoriId) : null,
        tabunganId: tabunganId ? parseInt(tabunganId) : null,
        userId: finalUserId  // ← NEW: Tambah userId
      },
      include: {
        kategori: true
      }
    })
    
    console.log('✅ Transaction created:', transaksi);
    
    // Update tabungan balance if tabunganId is provided
    if (tabunganId) {
      const tabungan = await db.tabungan.findUnique({
        where: { id: parseInt(tabunganId) }
      });
      
      if (tabungan) {
        const newBalance = tipe === 'pemasukan' 
          ? tabungan.jumlah + parseFloat(jumlah)
          : tabungan.jumlah - parseFloat(jumlah);
          
        console.log(`💰 Updating balance for tabungan ${tabunganId}: ${tabungan.jumlah} → ${newBalance}`);
        
        await db.tabungan.update({
          where: { id: parseInt(tabunganId) },
          data: { jumlah: newBalance }
        });
        
        console.log('✅ Balance updated successfully');
      }
    }
    
    return NextResponse.json(transaksi, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId, userId } = body  // ← NEW: Ambil userId
    
    // Use provided userId or default
    const finalUserId = userId || 'default_user';
    
    console.log('🔄 Updating transaction for userId:', finalUserId, { id, judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId });
    
    // Get original transaction for balance calculation
    const originalTransaksi = await db.transaksi.findFirst({
      where: {
        id: parseInt(id),
        userId: finalUserId  // ← NEW: Validate ownership
      }
    });
    
    if (!originalTransaksi) {
      console.log('❌ Transaction not found or access denied for user:', finalUserId);
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 })
    }
    
    // Verify user owns the new tabungan if tabunganId is provided and changed
    if (tabunganId && originalTransaksi.tabunganId !== parseInt(tabunganId)) {
      const newTabungan = await db.tabungan.findFirst({
        where: {
          id: parseInt(tabunganId),
          userId: finalUserId  // ← NEW: Validate new tabungan ownership
        }
      });
      
      if (!newTabungan) {
        console.log('❌ New tabungan not found or access denied for user:', finalUserId);
        return NextResponse.json({ error: 'New tabungan not found or access denied' }, { status: 404 })
      }
    }
    
    // Update transaction
    const transaksi = await db.transaksi.update({
      where: { id: parseInt(id) },
      data: {
        judul,
        jumlah: parseFloat(jumlah),
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        tipe,
        kategoriId: kategoriId ? parseInt(kategoriId) : null,
        tabunganId: tabunganId ? parseInt(tabunganId) : null
      },
      include: {
        kategori: true
      }
    })
    
    // Handle balance updates if tabungan changed or amount changed
    if (originalTransaksi) {
      // If tabungan changed, revert old balance and update new balance
      if (originalTransaksi.tabunganId !== tabunganId) {
        // Revert old tabungan balance
        if (originalTransaksi.tabunganId) {
          const oldTabungan = await db.tabungan.findUnique({
            where: { id: originalTransaksi.tabunganId }
          });
          
          if (oldTabungan) {
            const oldRevertBalance = originalTransaksi.tipe === 'pemasukan'
              ? oldTabungan.jumlah - originalTransaksi.jumlah
              : oldTabungan.jumlah + originalTransaksi.jumlah;
              
            await db.tabungan.update({
              where: { id: originalTransaksi.tabunganId },
              data: { jumlah: oldRevertBalance }
            });
          }
        }
        
        // Update new tabungan balance
        if (tabunganId) {
          const newTabungan = await db.tabungan.findUnique({
            where: { id: parseInt(tabunganId) }
          });
          
          if (newTabungan) {
            const newBalance = tipe === 'pemasukan'
              ? newTabungan.jumlah + parseFloat(jumlah)
              : newTabungan.jumlah - parseFloat(jumlah);
              
            await db.tabungan.update({
              where: { id: parseInt(tabunganId) },
              data: { jumlah: newBalance }
            });
          }
        }
      } 
      // If same tabungan but amount or type changed
      else if (originalTransaksi.tabunganId && 
               (originalTransaksi.jumlah !== parseFloat(jumlah) || originalTransaksi.tipe !== tipe)) {
        const currentTabungan = await db.tabungan.findUnique({
          where: { id: originalTransaksi.tabunganId }
        });
        
        if (currentTabungan) {
          // Revert original transaction
          const revertedBalance = originalTransaksi.tipe === 'pemasukan'
            ? currentTabungan.jumlah - originalTransaksi.jumlah
            : currentTabungan.jumlah + originalTransaksi.jumlah;
          
          // Apply new transaction
          const newBalance = tipe === 'pemasukan'
            ? revertedBalance + parseFloat(jumlah)
            : revertedBalance - parseFloat(jumlah);
            
          await db.tabungan.update({
            where: { id: originalTransaksi.tabunganId },
            data: { jumlah: newBalance }
          });
        }
      }
    }
    
    console.log('✅ Transaction updated:', transaksi);
    
    return NextResponse.json(transaksi)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId } = body  // ← NEW: Ambil userId
    
    // Use provided userId or default
    const finalUserId = userId || 'default_user';
    
    console.log('🗑️ Deleting transaction for userId:', finalUserId, { id });
    
    // Get transaction before deletion for balance calculation
    const transaksi = await db.transaksi.findFirst({
      where: {
        id: parseInt(id),
        userId: finalUserId  // ← NEW: Validate ownership
      }
    });
    
    if (!transaksi) {
      console.log('❌ Transaction not found or access denied for user:', finalUserId);
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 })
    }
    
    // Delete transaction
    await db.transaksi.delete({
      where: { id: parseInt(id) }
    })
    
    // Update tabungan balance to revert the transaction
    if (transaksi && transaksi.tabunganId) {
      const tabungan = await db.tabungan.findUnique({
        where: { id: transaksi.tabunganId }
      });
      
      if (tabungan) {
        const revertedBalance = transaksi.tipe === 'pemasukan'
          ? tabungan.jumlah - transaksi.jumlah
          : tabungan.jumlah + transaksi.jumlah;
          
        await db.tabungan.update({
          where: { id: transaksi.tabunganId },
          data: { jumlah: revertedBalance }
        });
        
        console.log('✅ Balance reverted successfully');
      }
    }
    
    console.log('✅ Transaction deleted successfully');
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}