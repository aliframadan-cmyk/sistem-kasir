const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- ROUTES API ---
app.get('/', (req, res) => {
  res.send('Halo! Server Kasir Sembako sudah berjalan siap digunakan.');
});

// 1. GET SEMUA PRODUK
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. CHECKOUT (LOGIKA KASIR GROSIR)
app.post('/api/checkout', async (req, res) => {
  const { customerType, items, total } = req.body; 

  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Buat Data Transaksi (Invoice)
      const transaction = await tx.transaction.create({
        data: {
          invoiceNo: `INV-${Date.now()}`,
          total: total,
          customerType: customerType,
          items: {
            create: items.map(item => ({
              // Handle id dari frontend (bisa id atau productId)
              productId: item.id || item.productId,
              productName: item.name,
              unit: item.unit,
              qty: item.qty,
              price: item.price,
              subtotal: item.price * item.qty
            }))
          }
        }
      });

      // B. Kurangi Stok Barang
      for (const item of items) {
        const prodId = item.id || item.productId;
        const product = await tx.product.findUnique({ where: { id: prodId } });
        
        if (!product) throw new Error(`Produk ID ${prodId} tidak ditemukan`);

        let deductAmount = item.qty;
        
        // JIKA BELI DUS, KURANGI STOK FISIK SEJUMLAH ISI DUS
        if (item.unit === 'Dus') {
            deductAmount = item.qty * product.qtyPerDus; 
        }

        // Cek apakah stok cukup
        if (product.stockPcs < deductAmount) {
            throw new Error(`Stok ${product.name} kurang! Sisa: ${product.stockPcs}, Butuh: ${deductAmount}`);
        }

        // Update stok di database
        await tx.product.update({
          where: { id: prodId },
          data: { stockPcs: { decrement: deductAmount } }
        });
      }

      return transaction;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. API Tambah Produk Baru
app.post('/api/products', async (req, res) => {
  const { name, category, stockPcs, pricePcs, priceDus, barcode } = req.body;

  try {
    const newProduct = await prisma.product.create({
      data: {
        name,
        category,
        stockPcs: parseInt(stockPcs), // Pastikan jadi angka
        pricePcs: parseInt(pricePcs),
        priceDus: parseInt(priceDus) || 0, // Opsional
        barcode: barcode || null,          // Opsional
      }
    });
    res.json({ success: true, data: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Gagal menyimpan barang." });
  }
});

// 4. API Hapus Produk
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({
      where: {
        id: parseInt(id), // Ubah ID dari string ke angka
      },
    });
    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("Gagal menghapus:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus produk (Mungkin produk ini ada di riwayat transaksi)" });
  }
});

// JALANKAN SERVER
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});