import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, 
  Trash2, X, CheckCircle2, ReceiptText, AlertCircle, PlusCircle, Edit, LogOut, Lock, Printer
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
  bayar?: number;
  kembali?: number;
}

const App = () => {
  // --- STATE LOGIN ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('kasir_user'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- States Aplikasi Utama ---
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'history'>('pos');
  const [search, setSearch] = useState("");
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>([]); // State Riwayat
  const [produkList, setProdukList] = useState<Produk[]>([]);
  
  // Modal & Loading
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit & Transaksi Terakhir (Untuk Struk)
  const [editId, setEditId] = useState<number | null>(null);
  const [lastTrx, setLastTrx] = useState<HistoryTransaksi | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", category: "Sembako", stockPcs: "", pricePcs: "", priceDus: "", barcode: ""
  });

  // --- FUNGSI UTAMA ---
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

  // --- USE EFFECT (Load Data saat Login) ---
  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
      
      // --- PERBAIKAN 1: MEMUAT RIWAYAT DARI LOCAL STORAGE ---
      const savedHistory = localStorage.getItem('riwayat_transaksi');
      if (savedHistory) {
        try {
          setRiwayat(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Gagal memuat riwayat", e);
        }
      }
    }
  }, [isLoggedIn]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm)
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('kasir_user', JSON.stringify(result.user)); setIsLoggedIn(true);
      } else { setLoginError(result.message); }
    } catch (err) { setLoginError("Gagal terhubung ke server"); } finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    if (confirm("Yakin ingin keluar?")) {
      localStorage.removeItem('kasir_user'); setIsLoggedIn(false); setLoginForm({ username: '', password: '' });
    }
  };

  // Produk
  const handleSimpanProduk = async () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Wajib diisi!");
    setIsLoading(true);
    try {
      let url = 'http://localhost:3000/api/products'; let method = 'POST';
      if (editId) { url = `${url}/${editId}`; method = 'PUT'; }
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      const result = await response.json();
      if (result.success) { alert("Berhasil!"); setShowAddModal(false); fetchProducts(); } else { alert("Gagal: " + result.message); }
    } catch (error) { alert("Error koneksi"); } finally { setIsLoading(false); }
  };

  const handleHapusProduk = async (id: number, nama: string) => {
    if (!confirm(`Hapus ${nama}?`)) return;
    await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' });
    setProdukList(produkList.filter(p => p.id !== id));
  };

  // --- BAYAR & STRUK ---
  const handleBayar = async () => {
    if (keranjang.length === 0) return setShowEmptyWarning(true);
    setIsLoading(true);
    try {
      const totalBelanja = keranjang.reduce((a, b) => a + b.subtotal, 0);
      
      const payload = { 
        items: keranjang.map(item => ({ 
            id: item.id, 
            qty: item.qty,
            name: item.nama,
            price: item.hargaEcer,
            unit: 'Pcs'
        })),
        total: totalBelanja,
        customerType: 'General'
      };
      
      const response = await fetch('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      
      if (result.success) {
        const trx: HistoryTransaksi = { 
          id: result.data.invoiceNo || `TRX-${Date.now()}`, 
          tanggal: new Date().toLocaleString('id-ID'), 
          items: [...keranjang], 
          total: totalBelanja 
        };
        
        // --- PERBAIKAN 2: SIMPAN RIWAYAT KE LOCAL STORAGE ---
        const updatedRiwayat = [trx, ...riwayat];
        setRiwayat(updatedRiwayat); 
        localStorage.setItem('riwayat_transaksi', JSON.stringify(updatedRiwayat)); // Simpan Permanen

        setLastTrx(trx); 
        
        // Jeda sedikit untuk render struk
        setTimeout(() => {
            setShowSuccess(true);
        }, 100);

        await fetchProducts(); 
        setKeranjang([]); 
      } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error Transaksi"); } finally { setIsLoading(false); }
  };

  // Fungsi Cetak
  const handlePrint = () => {
    window.print();
  };

  // --- HALAMAN LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"><Lock size={32} /></div>
          <h1 className="text-2xl font-black text-slate-800 mb-6">LOGIN KASIR</h1>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="Username"/>
            <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="Password"/>
            {loginError && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg">{loginError}</div>}
            <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black mt-4">MASUK</button>
          </form>
        </div>
      </div>
    );
  }

  // --- HALAMAN UTAMA ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* CSS PRINT FIXED */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #struk-print, #struk-print * { visibility: visible; }
          #struk-print { 
            display: block !important;
            position: absolute; left: 0; top: 0; width: 100%; 
            margin: 0; padding: 10px; background: white; color: black;
          }
          @page { margin: 0; size: auto; }
        }
      `}</style>

      {/* STRUK */}
      <div id="struk-print" className="hidden font-mono text-sm max-w-[80mm] mx-auto bg-white">
        {lastTrx ? (
          <div className="text-center pb-8 pt-4">
            <h2 className="text-xl font-black uppercase mb-1">TOKO SEMBAKO</h2>
            <p className="text-xs mb-4">Jl. Maju Mundur No. 123<br/>Telp: 0812-3456-7890</p>
            <hr className="border-dashed border-black mb-2"/>
            <div className="flex justify-between text-xs mb-2">
              <span>{lastTrx.id}</span>
              <span>{lastTrx.tanggal.split(' ')[0]}</span>
            </div>
            <hr className="border-dashed border-black mb-2"/>
            <div className="text-left space-y-2 mb-4">
              {lastTrx.items.map((item, idx) => (
                <div key={idx}>
                  <div className="font-bold">{item.nama}</div>
                  <div className="flex justify-between">
                    <span>{item.qty} x {item.hargaEcer.toLocaleString()}</span>
                    <span>{item.subtotal.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <hr className="border-dashed border-black mb-2"/>
            <div className="flex justify-between font-black text-lg mb-8">
              <span>TOTAL</span>
              <span>Rp {lastTrx.total.toLocaleString()}</span>
            </div>
            <p className="text-xs">Terima Kasih & Selamat Belanja Kembali</p>
            <p className="text-[10px] mt-1 text-slate-500">Barang yang dibeli tidak dapat ditukar</p>
          </div>
        ) : (<p className="text-center py-10">Data Struk Belum Siap...</p>)}
      </div>

      {/* SIDEBAR */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20 no-print">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg"><Package size={28} /></div>
        <nav className="flex flex-col gap-4 flex-1">
          <button onClick={() => setActiveTab('pos')} className={`p-3 rounded-xl transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><ShoppingCart size={24}/></button>
          <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><LayoutGrid size={24}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}><History size={24}/></button>
        </nav>
        <button onClick={handleLogout} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl mb-4"><LogOut size={24}/></button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 uppercase">
              {activeTab === 'pos' ? 'Kasir Sembako' : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat Penjualan'}
            </h1>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500" onChange={(e) => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* POS */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => { if(p.stok>0) {
                     const exist = keranjang.find(k=>k.id===p.id);
                     if(exist && exist.qty>=p.stok) return alert("Stok habis");
                     if(exist) setKeranjang(keranjang.map(k=>k.id===p.id?{...k,qty:k.qty+1,subtotal:(k.qty+1)*k.hargaEcer}:k));
                     else setKeranjang([...keranjang, {...p, qty:1, subtotal:p.hargaEcer}]);
                  } else alert("Stok Habis");
                }} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer transition-all shadow-sm hover:shadow-xl">
                  <span className="text-[10px] font-black text-slate-300 uppercase">{p.kategori}</span>
                  <h3 className="text-lg font-bold text-slate-700 mt-1">{p.nama}</h3>
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p>
                    <p className={`text-xs font-bold ${p.stok < 10 ? 'text-red-500' : 'text-slate-400'}`}>Stok: {p.stok}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => { setEditId(null); setNewItem({name:"",category:"Sembako",stockPcs:"",pricePcs:"",priceDus:"",barcode:""}); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg"><PlusCircle size={20}/> Tambah Produk</button>
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest">
                    <tr><th className="px-8 py-5">Barang</th><th className="px-8 py-5 text-center">Stok</th><th className="px-8 py-5 text-right">Harga</th><th className="px-8 py-5 text-center">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {produkList.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-8 py-5 font-bold text-slate-700">{p.nama}</td>
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

          {/* HISTORY */}
          {activeTab === 'history' && (
             <div className="space-y-4 max-w-4xl">
             {riwayat.length === 0 ? <div className="text-center py-20 bg-white rounded-[2rem] border-dashed border-2 border-slate-200"><p className="text-slate-400 font-bold">Belum ada riwayat</p></div> : 
               riwayat.map(h => (
                 <div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                   <div className="flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ReceiptText/></div><div><p className="font-bold text-slate-800">{h.id}</p><p className="text-xs text-slate-400 font-medium">{h.tanggal}</p></div></div>
                   <div className="text-right">
                     <p className="font-black text-blue-600 text-lg">Rp {h.total.toLocaleString('id-ID')}</p>
                     <button onClick={() => { setLastTrx(h); setTimeout(() => window.print(), 100); }} className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 justify-end mt-1"><Printer size={12}/> CETAK ULANG</button>
                   </div>
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
              {keranjang.map(item => (
                <div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl group">
                  <div><p className="font-bold text-sm text-slate-700">{item.nama}</p><p className="text-xs text-slate-400 font-bold">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p></div>
                  <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-dashed border-slate-200 mt-6 space-y-4">
               <div className="flex justify-between items-end"><span className="font-bold text-slate-400 text-sm">TOTAL</span><span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {keranjang.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString('id-ID')}</span></div>
              <button onClick={handleBayar} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl transition-all">BAYAR SEKARANG</button>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL TRANSAKSI BERHASIL */}
      {showSuccess && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100]">
          <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl w-full max-w-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-600"/>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Transaksi Berhasil!</h2>
            <p className="text-slate-400 font-medium mb-8">Data stok sudah terupdate.</p>
            
            <div className="space-y-3">
              <button onClick={handlePrint} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                <Printer size={20}/> CETAK STRUK
              </button>
              <button onClick={() => setShowSuccess(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold">
                Tutup / Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK */}
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
      
      {showEmptyWarning && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><ShoppingCart size={48} className="text-amber-500 mx-auto mb-4"/><h2 className="text-2xl font-black text-slate-800">Keranjang Kosong</h2><button onClick={()=>setShowEmptyWarning(false)} className="mt-6 w-full bg-slate-200 text-slate-600 py-3 rounded-xl font-bold">OK</button></div></div>}
    </div>
  );
};

export default App;