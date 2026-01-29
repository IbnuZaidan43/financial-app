'use server'
import { prisma } from '@/lib/prisma';

export async function syncTransaksiToCloud(userId: string, data: any) {
  return await prisma.transaksi.upsert({
    where: { id: data.id },
    update: data,
    create: { ...data, userId }
  });
}

export async function syncTabunganToCloud(userId: string, data: any) {
  return await prisma.tabungan.upsert({
    where: { id: data.id },
    update: data,
    create: { ...data, userId }
  });
}

export async function getFinancialData(userId: string) {
  try {
    const [tabungan, transaksi] = await Promise.all([
      prisma.tabungan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaksi.findMany({
        where: { userId },
        orderBy: { tanggal: 'desc' }
      })
    ]);
    return { tabungan, transaksi };
  } catch (error) {
    console.error("Gagal mengambil data dari Cloud:", error);
    return { tabungan: [], transaksi: [] };
  }
}