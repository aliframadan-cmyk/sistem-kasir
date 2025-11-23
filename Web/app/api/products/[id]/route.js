export async function PUT(req, { params }) {
  const id = Number(params.id);
  const data = await req.json();

  const updated = await prisma.product.update({
    where: { id },
    data,
  });

  return Response.json(updated);
}

export async function DELETE(req, { params }) {
  const id = Number(params.id);

  await prisma.product.delete({ where: { id } });
  return Response.json({ message: "Product deleted" });
}
