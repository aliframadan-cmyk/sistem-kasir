const express = require('express');
const cors = require('cors'); // <--- 1. IMPORT CORS DISINI
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// --- AUTO-CREATE ADMIN USER ---
async function initAdmin() {
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
    await prisma.user.create({
      data: { username: 'admin', password: '123' }
    });
    console.log("User 'admin' berhasil dibuat (Password: 123)");
  }
}
initAdmin();

const PORT = 3000;

// --- MIDDLEWARE ---
app.use(cors()); // <--- 2. PASANG CORS DISINI (Sebelum Route Apapun)
app.use(express.json());

// --- ROUTES API ---
app.get('/', (req, res) => {
  res.send('Halo! Server Kasir Sembako sudah berjalan siap digunakan.');
});

// 1. API LOGIN (YANG TADI HILANG)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user && user.password === password) {
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ success: false, message: "Username atau Password salah!" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error server" });
  }
});

// 2. GET SEMUA PRODUK
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

// 3. CHECKOUT
app.post('/api/checkout', async (req, res) => {
  const { customerType, items, total } = req.body; 
  try {
    const result = await prisma.$transaction(async (tx) => {
      // A. Buat Invoice
      const transaction = await tx.transaction.create({
        data: {
          invoiceNo: `INV-${Date.now()}`,
          total: total,
          customerType: customerType,
          items: {
            create: items.map(item => ({
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

      // B. Kurangi Stok
      for (const item of items) {
        const prodId = item.id || item.productId;
        const product = await tx.product.findUnique({ where: { id: prodId } });
        
        if (!product) throw new Error(`Produk ID ${prodId} tidak ditemukan`);

        let deductAmount = item.qty;
        if (item.unit === 'Dus') {
            deductAmount = item.qty * product.qtyPerDus; 
        }

        if (product.stockPcs < deductAmount) {
            throw new Error(`Stok ${product.name} kurang!`);
        }

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

// 4. API Tambah Produk
app.post('/api/products', async (req, res) => {
  const { name, category, stockPcs, pricePcs, priceDus, barcode } = req.body;
  try {
    const newProduct = await prisma.product.create({
      data: {
        name,
        category,
        stockPcs: parseInt(stockPcs),
        pricePcs: parseInt(pricePcs),
        priceDus: parseInt(priceDus) || 0,
        barcode: barcode || null,
      }
    });
    res.json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menyimpan barang." });
  }
});

// 5. API Hapus Produk
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.product.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghapus produk" });
  }
});

// 6. API Update Produk
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, stockPcs, pricePcs, priceDus, barcode } = req.body;
  try {
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        category,
        stockPcs: parseInt(stockPcs),
        pricePcs: parseInt(pricePcs),
        priceDus: parseInt(priceDus) || 0,
        barcode: barcode || null,
      },
    });
    res.json({ success: true, data: updatedProduct });
  } catch (error) {
      res.status(400).json({ success: false, message: error.message });  
    }
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});