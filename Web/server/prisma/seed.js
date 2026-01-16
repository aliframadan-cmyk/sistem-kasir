const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding...');

  // 1. Bersihkan data lama (Urutan penghapusan penting karena relasi)
  try {
    await prisma.transactionItem.deleteMany(); // Hapus item transaksi dulu
    await prisma.transaction.deleteMany();     // Baru hapus transaksi
    await prisma.product.deleteMany();         // Terakhir hapus produk
    console.log('🧹 Database lama berhasil dibersihkan.');
  } catch (error) {
    console.log('⚠️ Database mungkin masih kosong, melanjutkan...');
  }

  // 2. Data Produk Baru
  const products = [
    {
      name: 'Indomie Goreng Original',
      category: 'Makanan',
      stockPcs: 480,     // Total: 12 Dus
      qtyPerDus: 40,     // 1 Dus isi 40
      pricePcs: 3500,    // Ecer: 3.500
      priceDus: 135000,  // Dus: 135.000 (Lebih murah 5.000 dari ecer)
    },
    {
      name: 'Minyak Goreng Sania 2L',
      category: 'Sembako',
      stockPcs: 60,      // Total: 10 Karton
      qtyPerDus: 6,      // 1 Karton isi 6 Pouch
      pricePcs: 38000,
      priceDus: 225000,
    },
    {
      name: 'Kopi Kapal Api Mix',
      category: 'Minuman',
      stockPcs: 240,     // Total: 20 Renceng
      qtyPerDus: 12,     // 1 Renceng isi 12 Sachet
      pricePcs: 1500,
      priceDus: 17000,
    },
    {
      name: 'Teh Pucuk Harum 350ml',
      category: 'Minuman',
      stockPcs: 48,      // Total: 2 Dus
      qtyPerDus: 24,     // 1 Dus isi 24 Botol
      pricePcs: 4000,
      priceDus: 90000,
    },
    {
      name: 'Sabun Lifeboy Cair 450ml',
      category: 'Kebersihan',
      stockPcs: 36,
      qtyPerDus: 12,
      pricePcs: 22000,
      priceDus: 250000,
    },
    {
      name: 'Gula Pasir Gulaku 1kg',
      category: 'Sembako',
      stockPcs: 100,
      qtyPerDus: 24,
      pricePcs: 16000,
      priceDus: 375000,
    }
  ];

  // 3. Masukkan ke Database
  console.log('📦 Sedang memasukkan produk...');
  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  console.log(`✅ Selesai! Berhasil menambahkan ${products.length} produk.`);
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });