import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

const getUserIdFromRequest = (request: NextRequest) => {
  const url = new URL(request.url);
  return url.searchParams.get('userId') || 'default_user';
};

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const transaksi = await db.transaksi.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      include: { kategori: true }
    })    
    return NextResponse.json(transaksi)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId, userId } = body
    const finalUserId = userId || 'default_user';
    
    if (tabunganId) {
      const tabungan = await db.tabungan.findFirst({
        where: {
          id: tabunganId,
          userId: finalUserId
        }
      });
      
      if (!tabungan) {
        console.log('❌ Tabungan not found or access denied for user:', finalUserId);
        return NextResponse.json({ error: 'Tabungan not found or access denied' }, { status: 404 })
      }
    }
    
    const transaksi = await db.transaksi.create({
      data: {
        judul,
        jumlah: parseFloat(jumlah),
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        tipe,
        kategoriId: kategoriId || null,
        tabunganId: tabunganId || null,
        userId: finalUserId
      },
      include: { kategori: true }
    })
    
    console.log('✅ Transaction created:', transaksi);
    
    if (tabunganId) {
      const tabungan = await db.tabungan.findUnique({
        where: { id: tabunganId }
      });
      
      if (tabungan) {
        const newBalance = tipe === 'pemasukan' 
          ? tabungan.jumlah + parseFloat(jumlah)
          : tabungan.jumlah - parseFloat(jumlah);
          
        console.log(`💰 Updating balance for tabungan ${tabunganId}: ${tabungan.jumlah} → ${newBalance}`);
        
        await db.tabungan.update({
          where: { id: tabunganId },
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
    const { id, judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId, userId } = body
    const finalUserId = userId || 'default_user';
    
    console.log('🔄 Updating transaction for userId:', finalUserId, { id, judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId });
    
    const originalTransaksi = await db.transaksi.findFirst({
      where: { id: id, userId: finalUserId }
    });
    
    if (!originalTransaksi) {
      console.log('❌ Transaction not found or access denied for user:', finalUserId);
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 })
    }

    const transaksi = await db.transaksi.update({
      where: { id: id },
      data: {
        judul,
        jumlah: parseFloat(jumlah),
        deskripsi: deskripsi || null,
        tanggal: new Date(tanggal),
        tipe,
        kategoriId: kategoriId || null,
        tabunganId: tabunganId || null
      },
      include: {
        kategori: true
      }
    })
    
    if (originalTransaksi.tabunganId !== tabunganId) {
      if (originalTransaksi.tabunganId) {
        const oldTab = await db.tabungan.findUnique({ where: { id: originalTransaksi.tabunganId } });
        if (oldTab) {
          const revert = originalTransaksi.tipe === 'pemasukan' ? -originalTransaksi.jumlah : originalTransaksi.jumlah;
          await db.tabungan.update({
            where: { id: originalTransaksi.tabunganId },
            data: { jumlah: oldTab.jumlah + revert }
          });
        }
      }
      
      if (tabunganId) {
        const newTab = await db.tabungan.findUnique({ where: { id: tabunganId } });
        if (newTab) {
          const apply = tipe === 'pemasukan' ? parseFloat(jumlah) : -parseFloat(jumlah);
          await db.tabungan.update({
            where: { id: tabunganId },
            data: { jumlah: newTab.jumlah + apply }
          });
        }
      }
    } 

    else if (tabunganId && (originalTransaksi.jumlah !== parseFloat(jumlah) || originalTransaksi.tipe !== tipe)) {
      const tab = await db.tabungan.findUnique({ where: { id: tabunganId } });
      if (tab) {
        const revert = originalTransaksi.tipe === 'pemasukan' ? -originalTransaksi.jumlah : originalTransaksi.jumlah;
        const apply = tipe === 'pemasukan' ? parseFloat(jumlah) : -parseFloat(jumlah);
        await db.tabungan.update({
          where: { id: tabunganId },
          data: { jumlah: tab.jumlah + revert + apply }
        });
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
    const { id, userId } = body
    const finalUserId = userId || 'default_user';
    const transaksi = await db.transaksi.findFirst({
      where: { id: id, userId: finalUserId }
    });
    
    if (!transaksi) {
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 })
    }
    
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
      }
    }
    
    await db.transaksi.delete({
      where: { id: id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}