import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const totalPemasukan = await db.transaksi.aggregate({
      where: { tipe: 'pemasukan' },
      _sum: { jumlah: true }
    })
    
    const totalPengeluaran = await db.transaksi.aggregate({
      where: { tipe: 'pengeluaran' },
      _sum: { jumlah: true }
    })
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentTransactions = await db.transaksi.findMany({
      where: {
        tanggal: {
          gte: sevenDaysAgo
        }
      },
      include: {
        kategori: true
      },
      orderBy: {
        tanggal: 'desc'
      },
      take: 5
    })
    
    // Get monthly data for chart
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const monthlyTransactions = await db.transaksi.findMany({
      where: {
        tanggal: {
          gte: new Date(currentYear, currentMonth, 1),
          lt: new Date(currentYear, currentMonth + 1, 1)
        }
      },
      orderBy: {
        tanggal: 'asc'
      }
    })
    
    // Group by day for chart
    const dailyData = monthlyTransactions.reduce((acc: any[], trans) => {
      const day = trans.tanggal.getDate()
      const existingDay = acc.find(item => item.day === day)
      
      if (existingDay) {
        if (trans.tipe === 'pemasukan') {
          existingDay.pemasukan += trans.jumlah
        } else {
          existingDay.pengeluaran += trans.jumlah
        }
      } else {
        acc.push({
          day,
          pemasukan: trans.tipe === 'pemasukan' ? trans.jumlah : 0,
          pengeluaran: trans.tipe === 'pengeluaran' ? trans.jumlah : 0
        })
      }
      
      return acc
    }, [])
    
    const statistics = {
      totalPemasukan: totalPemasukan._sum.jumlah || 0,
      totalPengeluaran: totalPengeluaran._sum.jumlah || 0,
      saldo: (totalPemasukan._sum.jumlah || 0) - (totalPengeluaran._sum.jumlah || 0),
      recentTransactions,
      dailyData
    }
    
    return NextResponse.json(statistics)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}