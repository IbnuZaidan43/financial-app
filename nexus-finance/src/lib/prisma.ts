import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// 1. Konfigurasi Pool koneksi dari driver 'pg'
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Buat Adapter untuk Prisma 7
const adapter = new PrismaPg(pool);

// 3. Inisialisasi Prisma Client (Singleton Pattern untuk Next.js)
const connectionString = process.env.DATABASE_URL;

const prismaClientSingleton = () => {
  // Jika URL tidak ada, kita buat client tanpa adapter agar tidak crash saat build
  // Tapi saat runtime (di Vercel), URL pasti ada.
  if (!connectionString) {
    return new PrismaClient();
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;