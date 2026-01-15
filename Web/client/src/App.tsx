import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, 
  Trash2, X, CheckCircle2, ReceiptText, AlertCircle, PlusCircle, Save, Edit, LogOut, Lock
} from 'lucide-react';

// --- Interfaces ---
interface Produk {
  id: number;
  nama: string;
  kategori: string;
  stok: number;     
  hargaEcer: number;
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
  // --- STATE LOGIN ---
  // Cek apakah di localStorage sudah ada tanda login?
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('kasir_user'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- States Aplikasi Utama ---
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'history'>('pos');
  const [search, setSearch] = useState("");
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryTransaksi | null>(null);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", category: "Sembako", stockPcs: "", pricePcs: "", priceDus: "", barcode: ""
  });

  // --- FUNGSI LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem('kasir_user', JSON.stringify(result.user)); // Simpan sesi
        setIsLoggedIn(true);
      } else {
        setLoginError(result.message);
      }
    } catch (err) {
      setLoginError("Gagal terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Yakin ingin keluar?")) {
      localStorage.removeItem('kasir_user');
      setIsLoggedIn(false);
      setLoginForm({ username: '', password: '' });
    }
  };

  // --- FUNGSI UTAMA (Sama seperti sebelumnya) ---
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      const data = await response.json();
      const formattedData = data.map((item: any) => ({
        id: item.id, nama: item.name, kategori: item.category, stok: item.stockPcs, hargaEcer: item.pricePcs, originalData: item
      }));
      setProdukList(formattedData);
    } catch (error) { console.error("Error fetching", error); }
  };

  // Ambil data hanya jika sudah login
  useEffect(() => {
    if (isLoggedIn) fetchProducts();
  }, [isLoggedIn]);

  const handleSimpanProduk = async () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Wajib diisi!");
    setIsLoading(true);
    try {
      let url = 'http://localhost:3000/api/products';
      let method = 'POST';
      if (editId) { url = `${url}/${editId}`; method = 'PUT'; }

      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      const result = await response.json();

      if (result.success) {
        alert("Berhasil!"); setShowAddModal(false); fetchProducts();
      } else { alert("Gagal: " + result.message); }
    } catch (error) { alert("Error koneksi"); } finally { setIsLoading(false); }
  };

  const handleHapusProduk = async (id: number, nama: string) => {
    if (!confirm(`Hapus ${nama}?`)) return;
    await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' });
    setProdukList(produkList.filter(p => p.id !== id));
  };

  const handleBayar = async () => {
    if (keranjang.length === 0) return setShowEmptyWarning(true);
    setIsLoading(true);
    try {
      const payload = { items: keranjang.map(item => ({ id: item.id, qty: item.qty })) };
      const response = await fetch('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.success) {
        const trx = { id: `TRX-${Math.floor(Date.now()/1000)}`, tanggal: new Date().toLocaleString('id-ID'), items: [...keranjang], total: keranjang.reduce((a, b) => a + b.subtotal, 0) };
        setRiwayat([trx, ...riwayat]); await fetchProducts(); setKeranjang([]); setShowSuccess(true);
      } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error"); } finally { setIsLoading(false); }
  };

  // --- HALAMAN LOGIN (JIKA BELUM LOGIN) ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">LOGIN KASIR</h1>
            <p className="text-slate-400">Silakan masuk untuk memulai</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Username</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none transition-colors"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 outline-none transition-colors"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="Masukkan password"
              />
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={16}/> {loginError}
              </div>
            )}

            <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-4">
              {isLoading ? 'MEMERIKSA...' : 'MASUK SEKARANG'}
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-6">Default: admin / 123</p>
        </div>
      </div>
    );
  }

  // --- HALAMAN UTAMA (JIKA SUDAH LOGIN) ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-900/20"><Package size={28} /></div>
        <nav className="flex flex-col gap-4 flex-1">
          <button onClick={() => setActiveTab('pos')} className={`p-3 rounded-xl transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><ShoppingCart size={24}/></button>
          <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={24}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><History size={24}/></button>
        </nav>
        {/* Tombol Logout */}
        <button onClick={handleLogout} className="p-3 text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all mb-4" title="Keluar">
          <LogOut size={24}/>
        </button>
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
                <div key={p.id} onClick={() => { if(p.stok>0) {
                     const exist = keranjang.find(k=>k.id===p.id);
                     if(exist && exist.qty>=p.stok) return alert("Stok habis");
                     if(exist) setKeranjang(keranjang.map(k=>k.id===p.id?{...k,qty:k.qty+1,subtotal:(k.qty+1)*k.hargaEcer}:k));
                     else setKeranjang([...keranjang, {...p, qty:1, subtotal:p.hargaEcer}]);
                  } else alert("Stok Habis");
                }} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer transition-all group shadow-sm hover:shadow-xl relative overflow-hidden">
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

          {/* INVENTORY VIEW */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => { setEditId(null); setNewItem({name:"",category:"Sembako",stockPcs:"",pricePcs:"",priceDus:"",barcode:""}); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                  <PlusCircle size={20}/> Tambah Produk
                </button>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest">
                    <tr><th className="px-8 py-5">Barang</th><th className="px-8 py-5 text-center">Stok</th><th className="px-8 py-5 text-right">Harga</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {produkList.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-8 py-5 font-bold text-slate-700">{p.nama} <span className="text-xs text-slate-400 font-normal ml-2">{p.kategori}</span></td>
                        <td className="px-8 py-5 text-center font-bold text-blue-600">{p.stok}</td>
                        <td className="px-8 py-5 text-right font-black">Rp {p.hargaEcer.toLocaleString('id-ID')}</td>
                        <td className="px-8 py-5 text-center flex justify-center gap-2">
                          <button onClick={() => { setEditId(p.id); setNewItem({name:p.originalData.name,category:p.originalData.category,stockPcs:p.originalData.stockPcs.toString(),pricePcs:p.originalData.pricePcs.toString(),priceDus:p.originalData.priceDus?.toString(),barcode:p.originalData.barcode||""}); setShowAddModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={18}/></button>
                          <button onClick={() => handleHapusProduk(p.id, p.nama)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={18}/></button>
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
             {riwayat.length === 0 ? <div className="text-center py-20 bg-white rounded-[2rem] border-dashed border-2 border-slate-200"><p className="text-slate-400 font-bold">Belum ada riwayat</p></div> : 
               riwayat.map(h => (
                 <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                   <div className="flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ReceiptText/></div><div><p className="font-bold text-slate-800">{h.id}</p><p className="text-xs text-slate-400 font-medium">{h.tanggal}</p></div></div>
                   <p className="font-black text-blue-600 text-lg">Rp {h.total.toLocaleString('id-ID')}</p>
                 </div>
               ))
             }
           </div>
          )}
        </main>

        {/* CART SIDEBAR */}
        {activeTab === 'pos' && (
          <aside className="w-96 bg-white border-l border-slate-100 p-8 flex flex-col shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> Pesanan</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {keranjang.length === 0 ? <p className="text-center text-slate-300 font-bold italic mt-20">Keranjang Kosong</p> : 
                keranjang.map(item => (
                  <div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl group">
                    <div><p className="font-bold text-sm text-slate-700">{item.nama}</p><p className="text-xs text-slate-400 font-bold">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p></div>
                    <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                  </div>
                ))
              }
            </div>
            <div className="pt-6 border-t border-dashed border-slate-200 mt-6 space-y-4">
               <div className="flex justify-between items-end"><span className="font-bold text-slate-400 text-sm">TOTAL</span><span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {keranjang.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString('id-ID')}</span></div>
              <button onClick={handleBayar} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl transition-all">BAYAR</button>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL & POPUPS (Sama seperti sebelumnya, disederhanakan untuk ringkas) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl overflow-hidden">
            <h2 className="text-2xl font-black text-slate-800 mb-6">{editId?"Edit":"Tambah"} Produk</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} placeholder="Nama Produk"/>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none" value={newItem.stockPcs} onChange={e=>setNewItem({...newItem,stockPcs:e.target.value})} placeholder="Stok"/>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none" value={newItem.pricePcs} onChange={e=>setNewItem({...newItem,pricePcs:e.target.value})} placeholder="Harga"/>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
                <button onClick={()=>setShowAddModal(false)} className="py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50">Batal</button>
                <button onClick={handleSimpanProduk} className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg">SIMPAN</button>
            </div>
          </div>
        </div>
      )}
      
      {showSuccess && <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><CheckCircle2 size={48} className="text-green-500 mx-auto mb-4"/><h2 className="text-2xl font-black text-slate-800">Berhasil!</h2><button onClick={()=>setShowSuccess(false)} className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold">OK</button></div></div>}
      {showEmptyWarning && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><ShoppingCart size={48} className="text-amber-500 mx-auto mb-4"/><h2 className="text-2xl font-black text-slate-800">Keranjang Kosong</h2><button onClick={()=>setShowEmptyWarning(false)} className="mt-6 w-full bg-slate-200 text-slate-600 py-3 rounded-xl font-bold">OK</button></div></div>}
    </div>
  );
};

export default App;