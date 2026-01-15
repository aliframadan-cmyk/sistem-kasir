import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, LayoutDashboard,
  Trash2, X, CheckCircle2, ReceiptText, AlertCircle, PlusCircle, Edit, LogOut, Lock, Printer, Eraser, ScanBarcode, TrendingUp, AlertTriangle, Wallet
} from 'lucide-react';

// --- Interfaces ---
interface Produk {
  id: number;
  nama: string;
  kategori: string;
  stok: number;     
  hargaEcer: number;
  barcode: string;
  originalData?: any; 
}

interface ItemKeranjang extends Produk {
  qty: number;
  subtotal: number;
}

interface HistoryTransaksi {
  id: string;
  tanggal: string; // Format: "16/1/2026, 10:30:00"
  items: ItemKeranjang[];
  total: number;
}

const App = () => {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('kasir_user'));
  // Tambahkan 'dashboard' ke activeTab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'history'>('dashboard');
  
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>([]);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  
  // UI States
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [lastTrx, setLastTrx] = useState<HistoryTransaksi | null>(null);
  const [newItem, setNewItem] = useState({
    name: "", category: "Sembako", stockPcs: "", pricePcs: "", barcode: ""
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // --- FETCH DATA ---
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      const data = await response.json();
      const formattedData = data.map((item: any) => ({
        id: item.id, nama: item.name, kategori: item.category, stok: item.stockPcs, hargaEcer: item.pricePcs, barcode: item.barcode || "", originalData: item
      }));
      setProdukList(formattedData);
    } catch (error) { console.error("Error fetching", error); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
      const savedHistory = localStorage.getItem('riwayat_transaksi');
      if (savedHistory) setRiwayat(JSON.parse(savedHistory));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab === 'pos' && barcodeInputRef.current) barcodeInputRef.current.focus();
  }, [activeTab]);

  // --- LOGIKA DASHBOARD ---
  // Kita menghitung statistik secara real-time dari data 'riwayat' dan 'produkList'
  const stats = useMemo(() => {
    const totalOmset = riwayat.reduce((acc, curr) => acc + curr.total, 0);
    const totalTransaksi = riwayat.length;
    const itemsTerjual = riwayat.reduce((acc, curr) => acc + curr.items.reduce((a, b) => a + b.qty, 0), 0);
    
    // Stok Menipis (Di bawah 10)
    const stokMenipis = produkList.filter(p => p.stok < 10).sort((a, b) => a.stok - b.stok);

    // Produk Terlaris
    const salesMap: Record<string, number> = {};
    riwayat.forEach(t => {
        t.items.forEach(i => {
            salesMap[i.nama] = (salesMap[i.nama] || 0) + i.qty;
        });
    });
    const topProduk = Object.entries(salesMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // Data Grafik 7 Hari Terakhir
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('id-ID'); // Format: "16/1/2026" (sesuaikan dengan format lokal browser)
    }).reverse();

    const chartData = last7Days.map(date => {
        // Cocokkan tanggal di riwayat (ambil bagian tanggalnya saja sebelum koma)
        const omsetHariIni = riwayat
            .filter(r => r.tanggal.split(',')[0] === date)
            .reduce((acc, curr) => acc + curr.total, 0);
        return { date: date.split('/')[0], fullDate: date, total: omsetHariIni }; // Ambil tanggalnya saja untuk label (misal "16")
    });
    
    // Cari nilai max untuk skala grafik
    const maxOmset = Math.max(...chartData.map(d => d.total), 10000); 

    return { totalOmset, totalTransaksi, itemsTerjual, stokMenipis, topProduk, chartData, maxOmset };
  }, [riwayat, produkList]);


  // --- LOGIKA TRANSAKSI ---
  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok Habis!");
    const exist = keranjang.find(k => k.id === produk.id);
    if (exist && exist.qty >= produk.stok) return alert("Stok tidak mencukupi!");
    if (exist) setKeranjang(keranjang.map(k => k.id === produk.id ? { ...k, qty: k.qty + 1, subtotal: (k.qty + 1) * k.hargaEcer } : k));
    else setKeranjang([...keranjang, { ...produk, qty: 1, subtotal: produk.hargaEcer }]);
  };

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const produkDitemukan = produkList.find(p => p.barcode === barcodeInput);
    if (produkDitemukan) { tambahKeKeranjang(produkDitemukan); setBarcodeInput(""); } 
    else { alert(`Barang tidak ditemukan!`); setBarcodeInput(""); }
  };

  const handleBayar = async () => {
    if (keranjang.length === 0) return setShowEmptyWarning(true);
    setIsLoading(true);
    try {
      const totalBelanja = keranjang.reduce((a, b) => a + b.subtotal, 0);
      const payload = { items: keranjang.map(item => ({ id: item.id, qty: item.qty, name: item.nama, price: item.hargaEcer })), total: totalBelanja };
      const response = await fetch('http://localhost:3000/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.success) {
        const trx: HistoryTransaksi = { id: result.data.invoiceNo || `TRX-${Date.now()}`, tanggal: new Date().toLocaleString('id-ID'), items: [...keranjang], total: totalBelanja };
        const newRiwayat = [trx, ...riwayat];
        setRiwayat(newRiwayat); localStorage.setItem('riwayat_transaksi', JSON.stringify(newRiwayat));
        setLastTrx(trx); setTimeout(() => setShowSuccess(true), 100);
        await fetchProducts(); setKeranjang([]); 
      }
    } catch (e) { alert("Error Transaksi"); } finally { setIsLoading(false); }
  };

  const handleSimpanProduk = async () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Wajib diisi!");
    setIsLoading(true);
    try {
      let url = 'http://localhost:3000/api/products'; let method = 'POST';
      if (editId) { url = `${url}/${editId}`; method = 'PUT'; }
      const payload = { name: newItem.name, category: newItem.category, stockPcs: newItem.stockPcs, pricePcs: newItem.pricePcs, barcode: newItem.barcode };
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.success) { alert("Berhasil!"); setShowAddModal(false); fetchProducts(); } 
    } catch (error) { alert("Error koneksi"); } finally { setIsLoading(false); }
  };
  
  const handleHapusProduk = async (id: number) => { if (confirm("Hapus?")) { await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' }); setProdukList(produkList.filter(p => p.id !== id)); }};
  const hapusSemuaRiwayat = () => { if(confirm("Hapus SEMUA riwayat?")) { setRiwayat([]); localStorage.removeItem('riwayat_transaksi'); } };

  if (!isLoggedIn) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white cursor-pointer" onClick={() => {localStorage.setItem('kasir_user','true'); setIsLoggedIn(true);}}>Klik untuk Login</div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <style>{`@media print { body * { visibility: hidden; } #struk-print, #struk-print * { visibility: visible; } #struk-print { display: block !important; position: absolute; left: 0; top: 0; width: 100%; } @page { margin: 0; size: auto; } }`}</style>
      
      {/* STRUK HIDDEN */}
      <div id="struk-print" className="hidden font-mono text-sm max-w-[80mm] mx-auto bg-white p-4">
        {lastTrx && (
          <div className="text-center">
             <h2 className="font-bold">TOKO SEMBAKO</h2><hr className="border-dashed my-2"/>
             {lastTrx.items.map(i => <div key={i.id} className="flex justify-between"><span>{i.nama} x{i.qty}</span><span>{i.subtotal.toLocaleString()}</span></div>)}
             <hr className="border-dashed my-2"/>
             <div className="flex justify-between font-bold"><span>TOTAL</span><span>Rp {lastTrx.total.toLocaleString()}</span></div>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20 no-print">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6"><Package size={28} /></div>
        <nav className="flex flex-col gap-4 flex-1 w-full px-2">
            <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-xl w-full flex justify-center transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={24}/></button>
            <button onClick={() => setActiveTab('pos')} className={`p-3 rounded-xl w-full flex justify-center transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><ShoppingCart size={24}/></button>
            <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-xl w-full flex justify-center transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutGrid size={24}/></button>
            <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl w-full flex justify-center transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><History size={24}/></button>
        </nav>
        <button onClick={() => {localStorage.removeItem('kasir_user'); setIsLoggedIn(false);}} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl mb-4"><LogOut size={24}/></button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 uppercase">
                {activeTab === 'dashboard' ? 'Dashboard Laporan' : activeTab === 'pos' ? 'Kasir' : activeTab === 'inventory' ? 'Stok' : 'Riwayat'}
            </h1>
            
            <div className="flex gap-4">
              {activeTab === 'pos' && (
                <form onSubmit={handleScanBarcode} className="relative w-64 group">
                    <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={20}/>
                    <input ref={barcodeInputRef} type="text" className="w-full pl-10 pr-4 py-2.5 bg-blue-50 border-2 border-blue-200 focus:border-blue-600 rounded-xl outline-none font-bold" placeholder="Scan Barcode..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus/>
                </form>
              )}
              {activeTab !== 'dashboard' && (
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500" onChange={(e) => setSearch(e.target.value)}/>
                </div>
              )}
            </div>
          </div>

          {/* === DASHBOARD TAB === */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* 1. KARTU RINGKASAN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-200">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-white/20 rounded-xl"><Wallet size={24}/></div><span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">Total</span></div>
                        <p className="text-sm opacity-80 mb-1">Total Omset</p>
                        <h3 className="text-3xl font-black">Rp {stats.totalOmset.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ReceiptText size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold mb-1">Transaksi Berhasil</p>
                        <h3 className="text-3xl font-black text-slate-800">{stats.totalTransaksi} <span className="text-sm font-medium text-slate-400">Nota</span></h3>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Package size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold mb-1">Produk Terjual</p>
                        <h3 className="text-3xl font-black text-slate-800">{stats.itemsTerjual} <span className="text-sm font-medium text-slate-400">Pcs</span></h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. GRAFIK BATANG SEDERHANA (OMSET 7 HARI) */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-slate-100 rounded-lg"><TrendingUp size={20} className="text-slate-600"/></div>
                            <h3 className="font-bold text-slate-800">Pendapatan 7 Hari Terakhir</h3>
                        </div>
                        <div className="flex items-end gap-4 h-64 w-full">
                            {stats.chartData.map((d, i) => {
                                const heightPercent = d.total === 0 ? 5 : (d.total / stats.maxOmset) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                                        <div className="relative w-full bg-slate-50 rounded-xl flex items-end h-full overflow-hidden hover:bg-slate-100 transition-all">
                                            <div style={{ height: `${heightPercent}%` }} className="w-full bg-blue-600 rounded-t-xl transition-all duration-500 group-hover:bg-blue-500 relative">
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    Rp {d.total.toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400">{d.date}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* 3. PRODUK TERLARIS */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><CheckCircle2 size={18} className="text-green-500"/> Produk Terlaris</h3>
                        <div className="space-y-4">
                            {stats.topProduk.length === 0 ? <p className="text-slate-400 text-sm">Belum ada data penjualan.</p> : 
                             stats.topProduk.map(([nama, qty], idx) => (
                                <div key={idx} className="flex justify-between items-center pb-3 border-b border-dashed border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">{idx+1}</div>
                                        <span className="font-bold text-slate-700 text-sm">{nama}</span>
                                    </div>
                                    <span className="font-black text-blue-600 text-sm">{qty} Pcs</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. PERINGATAN STOK MENIPIS */}
                <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                    <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Stok Menipis (Kurang dari 10)</h3>
                    {stats.stokMenipis.length === 0 ? <p className="text-amber-700/60 text-sm">Aman! Stok semua barang masih banyak.</p> : (
                         <div className="flex gap-3 overflow-x-auto pb-2">
                            {stats.stokMenipis.map(p => (
                                <div key={p.id} className="min-w-[150px] bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                                    <p className="font-bold text-slate-700 text-sm truncate">{p.nama}</p>
                                    <p className="text-xs text-slate-400">Sisa Stok: <span className="text-red-500 font-black text-lg">{p.stok}</span></p>
                                </div>
                            ))}
                         </div>
                    )}
                </div>
            </div>
          )}

          {/* POS TAB */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden group">
                  {p.barcode && <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 text-[10px] font-mono px-3 py-1 rounded-bl-xl">{p.barcode}</div>}
                  <span className="text-[10px] font-black text-slate-300 uppercase">{p.kategori}</span>
                  <h3 className="text-lg font-bold text-slate-700 mt-1">{p.nama}</h3>
                  <div className="flex justify-between items-end mt-4"><p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p><p className={`text-xs font-bold ${p.stok < 10 ? 'text-red-500' : 'text-slate-400'}`}>Stok: {p.stok}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-end mb-4"><button onClick={() => { setEditId(null); setNewItem({name:"",category:"Sembako",stockPcs:"",pricePcs:"",barcode:""}); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg"><PlusCircle size={20}/> Tambah Produk</button></div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest"><tr><th className="px-6 py-5">Barcode</th><th className="px-6 py-5">Barang</th><th className="px-6 py-5 text-center">Stok</th><th className="px-6 py-5 text-right">Harga</th><th className="px-6 py-5 text-center">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">{produkList.map(p => (<tr key={p.id} className="hover:bg-slate-50"><td className="px-6 py-5 font-mono text-xs text-slate-500">{p.barcode || "-"}</td><td className="px-6 py-5 font-bold text-slate-700">{p.nama}</td><td className="px-6 py-5 text-center font-bold text-blue-600">{p.stok}</td><td className="px-6 py-5 text-right font-black">Rp {p.hargaEcer.toLocaleString('id-ID')}</td><td className="px-6 py-5 text-center flex justify-center gap-2"><button onClick={() => { setEditId(p.id); setNewItem({name:p.originalData.name,category:p.originalData.category,stockPcs:p.originalData.stockPcs,pricePcs:p.originalData.pricePcs,barcode:p.barcode}); setShowAddModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={18}/></button><button onClick={() => handleHapusProduk(p.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={18}/></button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl">
              {riwayat.length > 0 && <button onClick={hapusSemuaRiwayat} className="mb-4 text-red-500 text-sm font-bold flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg w-fit"><Eraser size={16}/> Hapus Semua</button>}
              {riwayat.map(h => (<div key={h.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm"><div className="flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ReceiptText/></div><div><p className="font-bold text-slate-800">{h.id}</p><p className="text-xs text-slate-400 font-medium">{h.tanggal}</p></div></div><div className="text-right"><p className="font-black text-blue-600 text-lg">Rp {h.total.toLocaleString('id-ID')}</p><button onClick={() => { setLastTrx(h); setTimeout(() => window.print(), 100); }} className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 justify-end mt-1"><Printer size={12}/> CETAK</button></div></div>))}
            </div>
          )}
        </main>

        {/* KERANJANG (HANYA DI POS) */}
        {activeTab === 'pos' && (
          <aside className="w-96 bg-white border-l border-slate-100 p-8 flex flex-col shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> Pesanan</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">{keranjang.map(item => (<div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl group"><div><p className="font-bold text-sm text-slate-700">{item.nama}</p><p className="text-xs text-slate-400 font-bold">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p></div><button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600"><X size={16}/></button></div>))}</div>
            <div className="pt-6 border-t border-dashed border-slate-200 mt-6 space-y-4"><div className="flex justify-between items-end"><span className="font-bold text-slate-400 text-sm">TOTAL</span><span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {keranjang.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString('id-ID')}</span></div><button onClick={handleBayar} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl">BAYAR SEKARANG</button></div>
          </aside>
        )}
      </div>

      {/* MODAL SUCCESS */}
      {showSuccess && <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl w-full max-w-sm"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-green-600"/></div><h2 className="text-2xl font-black text-slate-800 mb-2">Transaksi Berhasil!</h2><div className="space-y-3 mt-6"><button onClick={() => window.print()} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold flex items-center gap-2 justify-center"><Printer size={20}/> CETAK STRUK</button><button onClick={() => setShowSuccess(false)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold">Tutup</button></div></div></div>}
      
      {/* MODAL ADD */}
      {showAddModal && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"><div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl"><h2 className="text-2xl font-black text-slate-800 mb-6">{editId?"Edit":"Tambah"} Produk</h2><div className="space-y-4"><div className="relative"><ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold font-mono" value={newItem.barcode} onChange={e=>setNewItem({...newItem,barcode:e.target.value})} placeholder="Scan Barcode Disini..."/></div><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} placeholder="Nama Produk"/><div className="grid grid-cols-2 gap-4"><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold" value={newItem.stockPcs} onChange={e=>setNewItem({...newItem,stockPcs:e.target.value})} placeholder="Stok"/><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold" value={newItem.pricePcs} onChange={e=>setNewItem({...newItem,pricePcs:e.target.value})} placeholder="Harga"/></div></div><div className="grid grid-cols-2 gap-4 mt-8"><button onClick={()=>setShowAddModal(false)} className="py-4 font-bold text-slate-400">Batal</button><button onClick={handleSimpanProduk} className="bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg">SIMPAN</button></div></div></div>}
      {showEmptyWarning && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><ShoppingCart size={48} className="text-amber-500 mx-auto mb-4"/><h2 className="text-2xl font-black text-slate-800">Keranjang Kosong</h2><button onClick={()=>setShowEmptyWarning(false)} className="mt-6 w-full bg-slate-200 py-3 rounded-xl font-bold">OK</button></div></div>}
    </div>
  );
};

export default App;