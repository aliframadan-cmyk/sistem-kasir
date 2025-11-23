import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { name: 'Produk A', price: 10000, stock: 50 },
      { name: 'Produk B', price: 15000, stock: 30 },
      { name: 'Produk C', price: 20000, stock: 20 },
    ],
  });
  console.log('Seeded products');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
