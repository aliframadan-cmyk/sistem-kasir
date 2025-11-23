"use client";

import { useEffect, useState } from "react";

export default function Kasir() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetch("/api/products").then(r => r.json()).then(setProducts);
  }, []);

  function addToCart(p) {
    const exist = cart.find(c => c.id === p.id);

    if (exist) {
      setCart(cart.map(c =>
        c.id === p.id ? 
        { ...c, qty: c.qty + 1, subtotal: (c.qty + 1) * c.price } 
        : c
      ));
    } else {
      setCart([...cart, { ...p, qty: 1, subtotal: p.price }]);
    }
  }

  const total = cart.reduce((t, i) => t + i.subtotal, 0);

  async function checkout() {
    const items = cart.map(c => ({
      productId: c.id,
      qty: c.qty,
      subtotal: c.subtotal,
    }));

    await fetch("/api/sales", {
      method: "POST",
      body: JSON.stringify({ items }),
    });

    alert("Transaksi Berhasil!");
    setCart([]);
  }

  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <div>
        <h2 className="font-bold mb-2">Produk</h2>
        {products.map(p => (
          <div key={p.id} className="border p-2 flex justify-between">
            {p.name}
            <button onClick={() => addToCart(p)} className="px-3 bg-blue-500 text-white">
              Tambah
            </button>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-bold mb-2">Keranjang</h2>
        {cart.map((c, i) => (
          <div key={i} className="border p-2 flex justify-between">
            {c.name} x {c.qty} = {c.subtotal}
          </div>
        ))}

        <h1 className="text-xl font-bold mt-4">Total: {total}</h1>

        <button className="bg-green-600 text-white p-2 mt-4 w-full"
          onClick={checkout}>
          Checkout
        </button>
      </div>
    </div>
  );
}
