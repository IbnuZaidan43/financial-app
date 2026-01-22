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