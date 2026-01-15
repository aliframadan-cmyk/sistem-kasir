import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, 
  Trash2, X, CheckCircle2, ReceiptText, AlertCircle, PlusCircle, Save, Edit
} from 'lucide-react';

// --- Interfaces ---
interface Produk {
  id: number;
  nama: string;
  kategori: string;
  stok: number;     
  hargaEcer: number;
  // Kita butuh data lengkap untuk mode edit, jadi kita simpan field asli DB juga secara tersembunyi
  originalData?: any; 
}

interface ItemKeranjang extends Produk {
  qty: number;
  subtotal: number;
}

interface HistoryTransaksi {
  id: string;
  tanggal: string;
  items: ItemKeranjang[];
  total: number;
}

const App = () => {
  // --- States ---
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'history'>('pos');
  const [search, setSearch] = useState("");
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryTransaksi | null>(null);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  
  // Popups State
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form Input Produk (Untuk Tambah & Edit)
  const [editId, setEditId] = useState<number | null>(null); // Jika null = Mode Tambah, Jika ada angka = Mode Edit
  const [newItem, setNewItem] = useState({
    name: "",
    category: "Sembako",
    stockPcs: "",
    pricePcs: "",
    priceDus: "",
    barcode: ""
  });

  // --- FUNGSI 1: AMBIL DATA ---
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      const data = await response.json();
      
      const formattedData = data.map((item: any) => ({
        id: item.id,
        nama: item.name,
        kategori: item.category,
        stok: item.stockPcs,
        hargaEcer: item.pricePcs,
        originalData: item // Simpan data mentah untuk keperluan edit
      }));
      
      setProdukList(formattedData);
    } catch (error) {
      console.error("Gagal koneksi ke server:", error);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- FUNGSI 2: PERSIAPAN EDIT & TAMBAH ---
  
  // Klik Tombol "+ Tambah"
  const handleOpenAdd = () => {
    setEditId(null); // Mode Tambah
    setNewItem({ name: "", category: "Sembako", stockPcs: "", pricePcs: "", priceDus: "", barcode: "" });
    setShowAddModal(true);
  };

  // Klik Tombol "Pensil (Edit)"
  const handleOpenEdit = (produk: Produk) => {
    setEditId(produk.id); // Mode Edit
    const data = produk.originalData;
    
    // Isi form dengan data yang sudah ada
    setNewItem({
      name: data.name,
      category: data.category,
      stockPcs: data.stockPcs.toString(),
      pricePcs: data.pricePcs.toString(),
      priceDus: data.priceDus ? data.priceDus.toString() : "",
      barcode: data.barcode || ""
    });
    
    setShowAddModal(true);
  };

  // --- FUNGSI 3: SIMPAN DATA (Bisa Create atau Update) ---
  const handleSimpanProduk = async () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Nama dan Harga Ecer wajib diisi!");
    
    setIsLoading(true);
    try {
      let url = 'http://localhost:3000/api/products';
      let method = 'POST';

      // Jika Mode Edit, ubah URL dan Method
      if (editId) {
        url = `http://localhost:3000/api/products/${editId}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      const result = await response.json();

      if (result.success) {
        alert(editId ? "Produk Berhasil Diupdate!" : "Produk Berhasil Ditambahkan!");
        setShowAddModal(false);
        fetchProducts(); // Refresh data
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (error) {
      alert("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI 4: HAPUS BARANG ---
  const handleHapusProduk = async (id: number, nama: string) => {
    if (!confirm(`Hapus produk "${nama}"?`)) return;
    try {
      await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' });
      setProdukList(produkList.filter(p => p.id !== id));
    } catch (error) {
      alert("Gagal menghubungi server.");
    }
  };

  // --- Logika POS ---
  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok habis di Database!");
    const itemInCart = keranjang.find(item => item.id === produk.id);
    if (itemInCart && itemInCart.qty >= produk.stok) return alert("Stok tidak cukup!");

    if (itemInCart) {
      setKeranjang(keranjang.map(item => 
        item.id === produk.id ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.hargaEcer } : item
      ));
    } else {
      setKeranjang([...keranjang, { ...produk, qty: 1, subtotal: produk.hargaEcer }]);
    }
  };

  const handleBayar = async () => {
    if (keranjang.length === 0) return setShowEmptyWarning(true);
    setIsLoading(true);
    try {
      const payload = { items: keranjang.map(item => ({ id: item.id, qty: item.qty })) };
      const response = await fetch('http://localhost:3000/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        const transaksiBaru = {
            id: `TRX-${Math.floor(Date.now() / 1000)}`,
            tanggal: new Date().toLocaleString('id-ID'),
            items: [...keranjang],
            total: keranjang.reduce((acc, i) => acc + i.subtotal, 0)
        };
        setRiwayat([transaksiBaru, ...riwayat]);
        await fetchProducts();
        setKeranjang([]);
        setShowSuccess(true);
      } else {
        alert("Gagal: " + result.message);
      }
    } catch (error) {
      alert("Error Transaksi");
    } finally {
      setIsLoading(false);
    }
  };

  const hapusSatuRiwayat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Hapus catatan ini?")) setRiwayat(riwayat.filter(item => item.id !== id));
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-900/20"><Package size={28} /></div>
        <nav className="flex flex-col gap-4">
          <button onClick={() => setActiveTab('pos')} className={`p-3 rounded-xl transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><ShoppingCart size={24}/></button>
          <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={24}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><History size={24}/></button>
        </nav>
      </aside>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
              {activeTab === 'pos' ? 'Kasir Sembako' : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat Penjualan'}
            </h1>
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500" onChange={(e) => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* POS VIEW */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer transition-all group shadow-sm hover:shadow-xl">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{p.kategori}</span>
                  <h3 className="text-lg font-bold text-slate-700 mt-1">{p.nama}</h3>
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p>
                    <p className={`text-xs font-bold ${p.stok < 10 ? 'text-red-500' : 'text-slate-400'}`}>Stok: {p.stok}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY VIEW (UPDATE & DELETE) */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                  <PlusCircle size={20}/> Tambah Produk Baru
                </button>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-8 py-5">Barang</th>
                      <th className="px-8 py-5 text-center">Tersedia</th>
                      <th className="px-8 py-5 text-right">Harga</th>
                      <th className="px-8 py-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {produkList.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 font-bold text-slate-700">{p.nama} <span className="text-xs text-slate-400 font-normal ml-2">{p.kategori}</span></td>
                        <td className="px-8 py-5 text-center font-bold text-blue-600">{p.stok}</td>
                        <td className="px-8 py-5 text-right font-black">Rp {p.hargaEcer.toLocaleString('id-ID')}</td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* TOMBOL EDIT */}
                            <button 
                                onClick={() => handleOpenEdit(p)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="Edit Produk"
                            >
                                <Edit size={18}/>
                            </button>
                            {/* TOMBOL HAPUS */}
                            <button 
                              onClick={() => handleHapusProduk(p.id, p.nama)} 
                              className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              title="Hapus Produk"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORY VIEW */}
          {activeTab === 'history' && (
             <div className="space-y-4 max-w-4xl">
             {riwayat.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                 <AlertCircle className="mx-auto text-slate-200 mb-4" size={48}/>
                 <p className="text-slate-400 font-bold">Belum ada riwayat transaksi</p>
               </div>
             ) : (
               riwayat.map(h => (
                 <div key={h.id} onClick={() => setSelectedHistory(h)} className="group bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-500 cursor-pointer shadow-sm">
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ReceiptText/></div>
                     <div><p className="font-bold text-slate-800">{h.id}</p><p className="text-xs text-slate-400 font-medium">{h.tanggal}</p></div>
                   </div>
                   <div className="flex items-center gap-6">
                     <p className="font-black text-blue-600 text-lg">Rp {h.total.toLocaleString('id-ID')}</p>
                     <button onClick={(e) => hapusSatuRiwayat(e, h.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                   </div>
                 </div>
               ))
             )}
           </div>
          )}
        </main>

        {/* CART SIDEBAR (Hanya di POS) */}
        {activeTab === 'pos' && (
          <aside className="w-96 bg-white border-l border-slate-100 p-8 flex flex-col shadow-2xl shadow-slate-200/50">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> Pesanan</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {keranjang.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200">
                  <ShoppingCart size={64} className="mb-4 opacity-20"/>
                  <p className="font-bold italic">Belum ada barang</p>
                </div>
              ) : (
                keranjang.map(item => (
                  <div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl group border border-transparent hover:border-blue-100">
                    <div>
                      <p className="font-bold text-sm text-slate-700">{item.nama}</p>
                      <p className="text-xs text-slate-400 font-bold">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p>
                    </div>
                    <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-all"><X size={16}/></button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-6 border-t border-dashed border-slate-200 mt-6 space-y-4">
               <div className="flex justify-between items-end"><span className="font-bold text-slate-400 text-sm">TOTAL</span><span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {keranjang.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString('id-ID')}</span></div>
              <button onClick={handleBayar} disabled={isLoading} className={`w-full text-white py-5 rounded-2xl font-black shadow-xl transition-all ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/20'}`}>
                {isLoading ? 'MEMPROSES...' : 'BAYAR SEKARANG'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* --- MODAL INPUT (CREATE & EDIT) --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              {/* Judul Berubah Tergantung Mode */}
              <h2 className="text-2xl font-black text-slate-800">
                {editId ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Produk</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none" 
                  value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Contoh: Beras Raja Lele" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none"
                    value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    <option value="Sembako">Sembako</option>
                    <option value="Bumbu">Bumbu</option>
                    <option value="Kebersihan">Kebersihan</option>
                    <option value="Minuman">Minuman</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stok (Pcs)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none"
                    value={newItem.stockPcs} onChange={e => setNewItem({...newItem, stockPcs: e.target.value})} placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Harga Ecer</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none"
                    value={newItem.pricePcs} onChange={e => setNewItem({...newItem, pricePcs: e.target.value})} placeholder="Rp 0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Harga Dus</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none"
                    value={newItem.priceDus} onChange={e => setNewItem({...newItem, priceDus: e.target.value})} placeholder="Rp 0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Barcode (Opsional)</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none" 
                  value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})} placeholder="Scan barcode disini..." />
              </div>
            </div>

            <button onClick={handleSimpanProduk} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black mt-8 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
              <Save size={20}/> {isLoading ? 'Menyimpan...' : (editId ? 'UPDATE PRODUK' : 'SIMPAN PRODUK')}
            </button>
          </div>
        </div>
      )}

      {/* --- POPUPS LAINNYA --- */}
      {showEmptyWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
             <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-100"><ShoppingCart size={40} /></div>
             <h2 className="text-2xl font-black text-slate-800 mb-2">Keranjang Kosong</h2>
             <button onClick={() => setShowEmptyWarning(false)} className="w-full bg-teal-500 text-white py-4 rounded-2xl font-bold mt-8">OKE</button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100"><CheckCircle2 size={40} /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Transaksi Berhasil!</h2>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">MANTAP!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;