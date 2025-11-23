"use client";

import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);

  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Gagal mengambil data produk");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Load products error:", err);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">📦 Daftar Produk</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-md shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left border-b">Nama</th>
              <th className="px-4 py-2 text-left border-b">Harga</th>
              <th className="px-4 py-2 text-left border-b">Stok</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{p.name}</td>
                  <td className="px-4 py-2 border-b">
                    Rp {p.price?.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-2 border-b">{p.stock}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500 border-b">
                  Tidak ada produk tersedia
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    );
}