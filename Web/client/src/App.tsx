import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, Trash2, Plus, Minus, Search, Package, RefreshCw, AlertCircle } from 'lucide-react';

// --- DEFINISI TIPE DATA ---
interface Product {
  id: number;
  name: string;
  category: string;
  stockPcs: number;
  qtyPerDus: number;
  pricePcs: number;
  priceDus: number;
}

interface CartItem extends Product {
  cartId: number;
  qty: number;
  unit: string;
  activePrice: number;
}

// --- SETUP API ---
// Pastikan port 3000 sesuai dengan backend Anda
const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// Format Rupiah
const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 1. LOAD PRODUK DARI SERVER
  const loadProducts = () => {
    setLoading(true);
    api.get('/products')
      .then(res => {
        setProducts(res.data);
        setErrorMsg('');
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("Gagal koneksi ke Backend. Pastikan terminal server jalan!");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  // 2. TAMBAH KE KERANJANG
  const addToCart = (p: Product) => {
    if (p.stockPcs <= 0) {
      alert("Stok Habis!");
      return;
    }
    
    setCart(prev => {
      // Cek apakah item sudah ada di keranjang dengan satuan 'Pcs'
      const exist = prev.find(i => i.id === p.id && i.unit === 'Pcs');
      if (exist) {
        return prev.map(i => i.id === p.id && i.unit === 'Pcs' ? { ...i, qty: i.qty + 1 } : i);
      }
      // Tambah item baru
      return [...prev, { 
        ...p, 
        cartId: Date.now(), 
        qty: 1, 
        unit: 'Pcs', 
        activePrice: p.pricePcs 
      }];
    });
  };

  // 3. UPDATE DATA KERANJANG (Ganti Satuan & Harga)
  const updateUnit = (cartId: number, unit: string) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        return { 
          ...item, 
          unit, 
          // Logika Inti Grosir: Harga berubah otomatis
          activePrice: unit === 'Dus' ? item.priceDus : item.pricePcs 
        };
      }
      return item;
    }));
  };

  const updateQty = (cartId: number, delta: number) => {
    setCart(prev => prev.map(item => item.cartId === cartId ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.cartId !== id));
  
  const grandTotal = cart.reduce((sum, item) => sum + (item.activePrice * item.qty), 0);

  // 4. CHECKOUT (BAYAR)
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!window.confirm(`Total Rp ${grandTotal.toLocaleString()}. Proses transaksi?`)) return;

    setLoading(true);
    try {
      await api.post('/checkout', {
        customerType: 'Umum', 
        total: grandTotal,
        items: cart.map(i => ({ 
            id: i.id, 
            name: i.name, 
            qty: i.qty, 
            unit: i.unit, 
            price: i.activePrice 
        }))
      });
      
      alert('✅ Transaksi Berhasil! Stok telah berkurang.');
      setCart([]);    
      loadProducts(); // Refresh stok
    } catch (err: any) {
      const message = err.response?.data?.error || err.message;
      alert('❌ Gagal: ' + message);
    } finally {
      setLoading(false);
    }
  };

  // Filter pencarian
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800">
      
      {/* --- KOLOM KIRI: DAFTAR PRODUK --- */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2 text-emerald-700">
            <Package className="text-emerald-600"/> Kasir Grosir
          </h1>
          
          {errorMsg && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle size={16}/> {errorMsg}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={loadProducts} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200" title="Refresh Stok">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
            </button>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                <input 
                    placeholder="Cari barang..." 
                    className="border rounded-full pl-10 pr-4 py-2 w-64 bg-gray-50 focus:outline-emerald-500 transition-all"
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {products.length === 0 && !loading && !errorMsg && (
            <div className="text-center text-gray-400 mt-20">
              <p className="font-bold">Data Produk Kosong.</p>
              <p className="text-sm">Pastikan backend server sudah di-seed.</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
            {filtered.map(p => (
              <div key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-lg cursor-pointer border border-transparent hover:border-emerald-500 transition-all group relative">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">{p.category}</span>
                  <span className={`text-[10px] font-bold ${p.stockPcs < 20 ? 'text-red-500' : 'text-green-600'}`}>
                    Stok: {p.stockPcs}
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 mb-2 leading-tight h-10 line-clamp-2">{p.name}</h3>
                
                <div className="text-xs space-y-2 bg-gray-50 p-2 rounded">
                  <div className="flex justify-between text-gray-500">
                    <span>Ecer</span> 
                    <span className="text-gray-900 font-bold">{formatRupiah(p.pricePcs)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium border-t border-gray-200 pt-1">
                    <span>Dus (x{p.qtyPerDus})</span> 
                    <span>{formatRupiah(p.priceDus)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- KOLOM KANAN: KERANJANG --- */}
      <div className="w-96 bg-white shadow-2xl flex flex-col z-20">
        <div className="p-5 bg-emerald-50 border-b border-emerald-100 text-emerald-900">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="text-emerald-600"/> Keranjang
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-50">
              <ShoppingCart size={48} className="mb-2"/>
              <p>Keranjang Kosong</p>
            </div>
          )}
          
          {cart.map(item => (
            <div key={item.cartId} className="border border-gray-100 p-3 rounded-lg relative group hover:bg-emerald-50 transition-colors shadow-sm">
              <button onClick={() => removeFromCart(item.cartId)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1">
                <Trash2 size={16}/>
              </button>
              
              <h4 className="font-bold text-sm w-4/5 mb-2 text-gray-800">{item.name}</h4>
              
              <div className="flex items-center justify-between">
                {/* SELECTOR UNIT (Fitur Grosir) */}
                <select 
                  value={item.unit} 
                  onChange={e => updateUnit(item.cartId, e.target.value)}
                  className="bg-white border border-gray-300 text-xs rounded px-2 py-1 font-bold text-emerald-700 outline-none cursor-pointer focus:border-emerald-500"
                >
                  <option value="Pcs">Pcs</option>
                  <option value="Dus">Dus</option>
                </select>

                <div className="flex items-center bg-white border border-gray-200 rounded overflow-hidden">
                  <button onClick={() => updateQty(item.cartId, -1)} className="px-2 py-1 hover:bg-gray-100 text-gray-500"><Minus size={12}/></button>
                  <span className="px-3 text-sm font-bold text-gray-800 w-8 text-center">{item.qty}</span>
                  <button onClick={() => updateQty(item.cartId, 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-500"><Plus size={12}/></button>
                </div>
              </div>
              
              <div className="text-right font-bold text-sm mt-2 text-gray-800">
                {formatRupiah(item.activePrice * item.qty)}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-between text-xl font-bold mb-4 text-gray-800">
            <span>Total</span>
            <span className="text-emerald-600">{formatRupiah(grandTotal)}</span>
          </div>
          <button 
            onClick={handleCheckout} 
            disabled={loading || cart.length === 0}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 flex justify-center items-center gap-2"
          >
            {loading ? 'Memproses...' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}