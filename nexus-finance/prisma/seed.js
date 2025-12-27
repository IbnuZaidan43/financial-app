const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')
  
  // Clear existing data
  await prisma.transaksi.deleteMany({})
  await prisma.tabungan.deleteMany({})
  await prisma.kategori.deleteMany({})
  
  // Create default categories
  const categories = [
    // Pemasukan
    { nama: 'Gaji', jenis: 'pemasukan', icon: '💰', warna: '#10b981' },
    { nama: 'Bonus', jenis: 'pemasukan', icon: '🎁', warna: '#10b981' },
    { nama: 'Investasi', jenis: 'pemasukan', icon: '📈', warna: '#10b981' },
    { nama: 'Lainnya', jenis: 'pemasukan', icon: '💵', warna: '#10b981' },
    
    // Pengeluaran
    { nama: 'Makanan', jenis: 'pengeluaran', icon: '🍔', warna: '#ef4444' },
    { nama: 'Transportasi', jenis: 'pengeluaran', icon: '🚗', warna: '#ef4444' },
    { nama: 'Belanja', jenis: 'pengeluaran', icon: '🛍️', warna: '#ef4444' },
    { nama: 'Tagihan', jenis: 'pengeluaran', icon: '📄', warna: '#ef4444' },
    { nama: 'Hiburan', jenis: 'pengeluaran', icon: '🎮', warna: '#ef4444' },
    { nama: 'Kesehatan', jenis: 'pengeluaran', icon: '🏥', warna: '#ef4444' },
    { nama: 'Pendidikan', jenis: 'pengeluaran', icon: '📚', warna: '#ef4444' },
    { nama: 'Lainnya', jenis: 'pengeluaran', icon: '📌', warna: '#ef4444' },
  ]
  
  console.log('Creating categories...')
  await prisma.kategori.createMany({
    data: categories
  })
  
  // Create sample savings
  const savings = [
    { nama: 'Dana Darurat', target: 10000000, targetDate: new Date('2024-12-31') },
    { nama: 'Liburan', target: 5000000, targetDate: new Date('2024-08-31') },
    { nama: 'Gadget Baru', target: 8000000, targetDate: new Date('2024-10-31') },
    { nama: 'Investasi', target: 15000000, targetDate: new Date('2024-12-31') }
  ]
  
  console.log('Creating savings...')
  await prisma.tabungan.createMany({
    data: savings
  })
  
  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })