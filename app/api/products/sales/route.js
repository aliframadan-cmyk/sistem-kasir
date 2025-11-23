import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req) {
  const { items } = await req.json();

  const total = items.reduce((t, i) => t + i.subtotal, 0);

  const sale = await prisma.sale.create({
    data: {
      total,
      items: {
        create: items,
      },
    },
  });

  return Response.json(sale);
}
export async function GET() {
  const sales = await prisma.sale.findMany({
    include: { items: true },
  });

  return Response.json(sales);
}
