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
    const { judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId } = body
    
    console.log('📝 Creating transaction:', { judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId });
    
    // Create transaction
    const transaksi = await db.transaksi.create({
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
    const { id, judul, jumlah, deskripsi, tanggal, tipe, kategoriId, tabunganId } = body
    
    // Get original transaction for balance calculation
    const originalTransaksi = await db.transaksi.findUnique({
      where: { id: parseInt(id) }
    });
    
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
    
    // Get transaction before deletion for balance calculation
    const transaksi = await db.transaksi.findUnique({
      where: { id: parseInt(id) }
    });
    
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
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}