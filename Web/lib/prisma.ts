// lib/prisma.ts

import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

// Kita menggunakan tipe 'any' untuk memuaskan Type Checker di sini
const globalForPrisma = globalThis as any;

// Gunakan instance yang ada atau buat yang baru
// Ini adalah logika Singleton yang mencegah error '__internal'
const prisma = globalForPrisma.prisma || prismaClientSingleton();

export default prisma;

// Simpan instance ke global object HANYA di lingkungan pengembangan
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}