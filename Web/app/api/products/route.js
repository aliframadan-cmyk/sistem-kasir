import { PrismaClient } from "@prisma/client";

if (typeof globalThis.__internal === 'undefined') {
  globalThis.__internal = {};
}

const prisma = new PrismaClient();

export async function GET() {
  const products = await prisma.product.findMany();
  return Response.json(products);
}
export async function POST(req) {
  const data = await req.json();
  const newProduct = await prisma.product.create({ data });
  return Response.json(newProduct);
}
