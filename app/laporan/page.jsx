"use client";
import { useEffect, useState } from "react";

export default function Laporan() {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    fetch("/api/sales").then(r => r.json()).then(setSales);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Laporan Penjualan</h1>

      {sales.map(s => (
        <div key={s.id} className="border p-4 mt-4">
          <p>ID Transaksi: {s.id}</p>
          <p>Total: {s.total}</p>
          <p>Tanggal: {new Date(s.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
