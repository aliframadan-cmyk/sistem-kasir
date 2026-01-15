import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, LayoutDashboard,
  Trash2, X, CheckCircle2, ReceiptText, AlertCircle, PlusCircle, Edit, LogOut, Printer, Eraser, ScanBarcode, TrendingUp, AlertTriangle, Wallet
} from 'lucide-react';

// --- DATA AWAL (DUMMY) ---
// Data ini akan muncul jika belum ada data di LocalStorage
const DATA_PRODUK_AWAL = [
  { id: 1, nama: "Beras Premium 5kg", kategori: "Sembako", stok: 20, hargaEcer: 65000, barcode: "8991001" },
  { id: 2, nama: "Minyak Goreng 2L", kategori: "Sembako", stok: 15, hargaEcer: 32000, barcode: "8991002" },
  { id: 3, nama: "Gula Pasir 1kg", kategori: "Sembako", stok: 50, hargaEcer: 14500, barcode: "8991003" },
  { id: 4, nama: "Telur Ayam 1kg", kategori: "Sembako", stok: 8, hargaEcer: 28000, barcode: "8991004" },
  { id: 5, nama: "Indomie Goreng", kategori: "Makanan", stok: 100, hargaEcer: 3500, barcode: "8991005" },
  { id: 6, nama: "Kopi Sachet", kategori: "Minuman", stok: 45, hargaEcer: 1500, barcode: "8991006" },
];

// --- Interfaces ---
interface Produk {
  id: number;
  nama: string;
  kategori: string;
  stok: number;     
  hargaEcer: number;
  barcode: string;
}

interface ItemKeranjang extends Produk {
  qty: number;
  subtotal: number;
}

interface HistoryTransaksi {
  id: string;
  tanggal: string; // Format: "16/1/2026"
  waktu: string;   // Format: "10:30:00"
  items: ItemKeranjang[];
  total: number;
}

const App = () => {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('kasir_user'));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'history'>('dashboard');
  
  // Data Utama (Diambil dari LocalStorage atau Data Awal)
  const [produkList, setProdukList] = useState<Produk[]>(() => {
    const saved = localStorage.getItem('db_produk');
    return saved ? JSON.parse(saved) : DATA_PRODUK_AWAL;
  });

  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>(() => {
    const saved = localStorage.getItem('db_riwayat');
    return saved ? JSON.parse(saved) : [];
  });

  // State Transaksi
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // UI States
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [lastTrx, setLastTrx] = useState<HistoryTransaksi | null>(null);
  
  // Form State
  const [newItem, setNewItem] = useState({
    name: "", category: "Sembako", stockPcs: "", pricePcs: "", barcode: ""
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECT: SIMPAN PERUBAHAN KE LOCALSTORAGE ---
  useEffect(() => {
    localStorage.setItem('db_produk', JSON.stringify(produkList));
  }, [produkList]);

  useEffect(() => {
    localStorage.setItem('db_riwayat', JSON.stringify(riwayat));
  }, [riwayat]);

  // Auto Focus Barcode
  useEffect(() => {
    if (activeTab === 'pos' && barcodeInputRef.current) barcodeInputRef.current.focus();
  }, [activeTab]);


  // --- LOGIKA DASHBOARD ---
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
    const topProduk = Object.entries(salesMap).sort(([, a], [, b]) => b - a).slice(0, 5);

    // Grafik 7 Hari Terakhir
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('id-ID'); 
    }).reverse();

    const chartData = last7Days.map(date => {
        const omsetHariIni = riwayat
            .filter(r => r.tanggal === date)
            .reduce((acc, curr) => acc + curr.total, 0);
        return { date: date.split('/')[0], fullDate: date, total: omsetHariIni }; 
    });
    
    const maxOmset = Math.max(...chartData.map(d => d.total), 100000); 

    return { totalOmset, totalTransaksi, itemsTerjual, stokMenipis, topProduk, chartData, maxOmset };
  }, [riwayat, produkList]);


  // --- LOGIKA POS (KASIR) ---
  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok Habis!");
    
    // Cek apakah stok di keranjang + stok baru melebihi stok tersedia
    const itemDiKeranjang = keranjang.find(k => k.id === produk.id);
    const currentQty = itemDiKeranjang ? itemDiKeranjang.qty : 0;
    
    if (currentQty + 1 > produk.stok) {
        return alert("Stok tidak mencukupi!");
    }

    if (itemDiKeranjang) {
      setKeranjang(keranjang.map(k => k.id === produk.id ? { ...k, qty: k.qty + 1, subtotal: (k.qty + 1) * k.hargaEcer } : k));
    } else {
      setKeranjang([...keranjang, { ...produk, qty: 1, subtotal: produk.hargaEcer }]);
    }
  };

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const produkDitemukan = produkList.find(p => p.barcode === barcodeInput);
    if (produkDitemukan) { tambahKeKeranjang(produkDitemukan); setBarcodeInput(""); } 
    else { alert(`Barang tidak ditemukan!`); setBarcodeInput(""); }
  };

  // === FUNGSI BAYAR (OFFLINE MODE) ===
  const handleBayar = async () => {
    if (keranjang.length === 0) return setShowEmptyWarning(true);
    
    setIsLoading(true);

    // Simulasi Delay agar terlihat "memproses"
    setTimeout(() => {
        const totalBelanja = keranjang.reduce((a, b) => a + b.subtotal, 0);
        const now = new Date();
        
        const trx: HistoryTransaksi = { 
            id: `INV-${Date.now()}`, 
            tanggal: now.toLocaleDateString('id-ID'), 
            waktu: now.toLocaleTimeString('id-ID'),
            items: [...keranjang], 
            total: totalBelanja 
        };

        // 1. Simpan ke Riwayat
        setRiwayat([trx, ...riwayat]);

        // 2. Kurangi Stok Produk
        const updateProduk = produkList.map(p => {
            const itemBeli = keranjang.find(k => k.id === p.id);
            if (itemBeli) {
                return { ...p, stok: p.stok - itemBeli.qty };
            }
            return p;
        });
        setProdukList(updateProduk);

        // 3. Reset & Show Success
        setLastTrx(trx);
        setKeranjang([]);
        setIsLoading(false);
        setShowSuccess(true);
    }, 800);
  };


  // --- LOGIKA INVENTORY ---
  const handleSimpanProduk = () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Nama dan Harga Wajib diisi!");
    
    const productData = {
        nama: newItem.name,
        kategori: newItem.category,
        stok: parseInt(newItem.stockPcs) || 0,
        hargaEcer: parseInt(newItem.pricePcs) || 0,
        barcode: newItem.barcode
    };

    if (editId) {
        // Edit Mode
        setProdukList(produkList.map(p => p.id === editId ? { ...p, ...productData } : p));
    } else {
        // Add Mode
        const newId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1;
        setProdukList([...produkList, { id: newId, ...productData }]);
    }
    
    setShowAddModal(false);
    alert("Produk Berhasil Disimpan!");
  };
  
  const handleHapusProduk = (id: number) => { 
      if (confirm("Yakin hapus produk ini?")) { 
          setProdukList(produkList.filter(p => p.id !== id)); 
      }
  };

  const hapusSemuaRiwayat = () => { 
      if(confirm("Hapus SEMUA riwayat transaksi? Data tidak bisa kembali.")) { 
          setRiwayat([]); 
      } 
  };


  if (!isLoggedIn) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white cursor-pointer font-bold text-xl" onClick={() => {localStorage.setItem('kasir_user','true'); setIsLoggedIn(true);}}>Klik Disini untuk Masuk Aplikasi Kasir</div>;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* CSS KHUSUS PRINT */}
      <style>{`@media print { body * { visibility: hidden; } #struk-print, #struk-print * { visibility: visible; } #struk-print { display: block !important; position: absolute; left: 0; top: 0; width: 100%; } @page { margin: 0; size: auto; } }`}</style>
      
      {/* STRUK STRUKTUR (HIDDEN) */}
      <div id="struk-print" className="hidden font-mono text-sm max-w-[80mm] mx-auto bg-white p-4">
        {lastTrx && (
          <div className="text-center">
             <h2 className="font-bold text-lg">TOKO MAJU JAYA</h2>
             <p className="text-xs">{lastTrx.tanggal} {lastTrx.waktu}</p>
             <p className="text-xs mb-2">No: {lastTrx.id}</p>
             <hr className="border-dashed border-black my-2"/>
             <div className="text-left">
                {lastTrx.items.map(i => (
                    <div key={i.id} className="flex justify-between mb-1">
                        <span>{i.nama} <br/><span className="text-[10px]">{i.qty} x {i.hargaEcer.toLocaleString()}</span></span>
                        <span>{i.subtotal.toLocaleString()}</span>
                    </div>
                ))}
             </div>
             <hr className="border-dashed border-black my-2"/>
             <div className="flex justify-between font-bold text-lg"><span>TOTAL</span><span>Rp {lastTrx.total.toLocaleString()}</span></div>
             <hr className="border-dashed border-black my-2"/>
             <p className="text-center text-xs mt-4">Terima Kasih</p>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      <aside className="w-24 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20 no-print shadow-2xl">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-900/50"><Package size={32} /></div>
        <nav className="flex flex-col gap-4 flex-1 w-full px-3">
            <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={24}/><span className="text-[10px] font-bold">Dash</span></button>
            <button onClick={() => setActiveTab('pos')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ShoppingCart size={24}/><span className="text-[10px] font-bold">Kasir</span></button>
            <button onClick={() => setActiveTab('inventory')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutGrid size={24}/><span className="text-[10px] font-bold">Stok</span></button>
            <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><History size={24}/><span className="text-[10px] font-bold">Riwayat</span></button>
        </nav>
        <button onClick={() => {localStorage.removeItem('kasir_user'); setIsLoggedIn(false);}} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl mb-4"><LogOut size={24}/></button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">{activeTab === 'dashboard' ? 'Dashboard Laporan' : activeTab === 'pos' ? 'Kasir' : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat Transaksi'}</h1>
                <p className="text-slate-400 text-sm font-medium mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div className="flex gap-4">
              {activeTab === 'pos' && (
                <form onSubmit={handleScanBarcode} className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ScanBarcode className="text-blue-500" size={20}/>
                    </div>
                    <input ref={barcodeInputRef} type="text" className="pl-10 pr-4 py-3 bg-white border-2 border-blue-100 focus:border-blue-500 rounded-xl outline-none font-bold w-64 shadow-sm transition-all" placeholder="Scan Barcode..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus/>
                </form>
              )}
              {activeTab !== 'dashboard' && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="Cari..." className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 w-64 shadow-sm" onChange={(e) => setSearch(e.target.value)}/>
                </div>
              )}
            </div>
          </div>

          {/* === DASHBOARD TAB === */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
                {/* 1. KARTU RINGKASAN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-200">
                         <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120}/></div>
                        <div className="flex justify-between items-start mb-6"><div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl"><Wallet size={24}/></div><span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">Total Pendapatan</span></div>
                        <h3 className="text-4xl font-black tracking-tight mb-1">Rp {stats.totalOmset.toLocaleString('id-ID')}</h3>
                        <p className="text-blue-100 text-sm">Omset keseluruhan</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-6"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ReceiptText size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold mb-1">Total Transaksi</p>
                        <h3 className="text-4xl font-black text-slate-800">{stats.totalTransaksi} <span className="text-lg font-medium text-slate-400">Nota</span></h3>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-6"><div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Package size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold mb-1">Barang Terjual</p>
                        <h3 className="text-4xl font-black text-slate-800">{stats.itemsTerjual} <span className="text-lg font-medium text-slate-400">Pcs</span></h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. GRAFIK BATANG */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-slate-100 rounded-lg"><TrendingUp size={20} className="text-slate-600"/></div>
                            <div><h3 className="font-bold text-slate-800 text-lg">Grafik Penjualan</h3><p className="text-xs text-slate-400">7 Hari Terakhir</p></div>
                        </div>
                        <div className="flex items-end gap-3 h-64 w-full px-2">
                            {stats.chartData.map((d, i) => {
                                const heightPercent = d.total === 0 ? 2 : (d.total / stats.maxOmset) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                                        <div className="relative w-full bg-slate-50 rounded-xl flex items-end h-full overflow-hidden hover:bg-slate-100 transition-all">
                                            <div style={{ height: `${heightPercent}%` }} className={`w-full rounded-t-xl transition-all duration-700 relative ${d.total > 0 ? 'bg-blue-600 group-hover:bg-blue-500' : 'bg-slate-200'}`}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
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
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg"><CheckCircle2 size={20} className="text-green-500"/> Produk Terlaris</h3>
                        <div className="space-y-4">
                            {stats.topProduk.length === 0 ? <p className="text-slate-400 text-sm text-center py-10">Belum ada data penjualan.</p> : 
                             stats.topProduk.map(([nama, qty], idx) => (
                                <div key={idx} className="flex justify-between items-center pb-3 border-b border-dashed border-slate-100 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{idx+1}</div>
                                        <span className="font-bold text-slate-700 text-sm">{nama}</span>
                                    </div>
                                    <span className="font-black text-blue-600 text-sm">{qty} Pcs</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. PERINGATAN STOK */}
                {stats.stokMenipis.length > 0 && (
                    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                        <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Perhatian: Stok Menipis</h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {stats.stokMenipis.map(p => (
                            <div key={p.id} className="min-w-[160px] bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                                <p className="font-bold text-slate-700 text-sm truncate">{p.nama}</p>
                                <p className="text-xs text-slate-400 mt-1">Sisa: <span className="text-red-500 font-black text-lg ml-1">{p.stok}</span></p>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          {/* POS TAB */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden group transition-all duration-300">
                  {p.barcode && <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-mono px-3 py-1 rounded-bl-xl font-bold">{p.barcode}</div>}
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{p.kategori}</span>
                  <h3 className="text-lg font-bold text-slate-700 mt-3 line-clamp-2 leading-tight h-12">{p.nama}</h3>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p>
                    <p className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stok < 10 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Stok: {p.stok}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div>
              <div className="flex justify-end mb-6"><button onClick={() => { setEditId(null); setNewItem({name:"",category:"Sembako",stockPcs:"",pricePcs:"",barcode:""}); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"><PlusCircle size={20}/> Tambah Produk Baru</button></div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest"><tr><th className="px-6 py-5">Barcode</th><th className="px-6 py-5">Barang</th><th className="px-6 py-5 text-center">Stok</th><th className="px-6 py-5 text-right">Harga</th><th className="px-6 py-5 text-center">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">{produkList.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-mono text-xs text-slate-500">{p.barcode || "-"}</td><td className="px-6 py-5 font-bold text-slate-700">{p.nama}</td><td className="px-6 py-5 text-center font-bold text-blue-600">{p.stok}</td><td className="px-6 py-5 text-right font-black">Rp {p.hargaEcer.toLocaleString('id-ID')}</td><td className="px-6 py-5 text-center flex justify-center gap-2"><button onClick={() => { setEditId(p.id); setNewItem({name:p.nama,category:p.kategori,stockPcs:p.stok.toString(),pricePcs:p.hargaEcer.toString(),barcode:p.barcode}); setShowAddModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={18}/></button><button onClick={() => handleHapusProduk(p.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl pb-10">
              {riwayat.length > 0 && <button onClick={hapusSemuaRiwayat} className="mb-4 text-red-500 text-sm font-bold flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg w-fit"><Eraser size={16}/> Hapus Semua</button>}
              {riwayat.length === 0 && <div className="text-center py-20 text-slate-400">Belum ada transaksi.</div>}
              {riwayat.map(h => (<div key={h.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-5"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ReceiptText/></div><div><p className="font-bold text-slate-800 text-lg">{h.id}</p><p className="text-sm text-slate-400 font-medium">{h.tanggal} - {h.waktu}</p></div></div><div className="text-right"><p className="font-black text-blue-600 text-xl">Rp {h.total.toLocaleString('id-ID')}</p><button onClick={() => { setLastTrx(h); setTimeout(() => window.print(), 100); }} className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 justify-end mt-2"><Printer size={14}/> CETAK NOTA</button></div></div>))}
            </div>
          )}
        </main>

        {/* KERANJANG (HANYA DI POS) */}
        {activeTab === 'pos' && (
          <aside className="w-[400px] bg-white border-l border-slate-100 p-8 flex flex-col shadow-2xl z-30">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><ShoppingCart className="text-blue-600" size={28}/> Pesanan</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
              {keranjang.length === 0 && <div className="text-center text-slate-400 mt-20">Keranjang Kosong.<br/><span className="text-xs">Scan barcode atau klik barang.</span></div>}
              {keranjang.map(item => (
                  <div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl group border border-transparent hover:border-blue-200 transition-all">
                      <div>
                          <p className="font-bold text-sm text-slate-700 line-clamp-1">{item.nama}</p>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold bg-white px-2 py-1 rounded border">{item.qty}x</span>
                              <span className="text-xs text-slate-400">@ {item.hargaEcer.toLocaleString()}</span>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="font-bold text-slate-700 text-sm">Rp {item.subtotal.toLocaleString()}</p>
                          <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 text-[10px] mt-1 font-bold">HAPUS</button>
                      </div>
                  </div>
              ))}
            </div>
            
            {/* Bagian Bawah Keranjang */}
            <div className="pt-6 border-t border-dashed border-slate-200 mt-6 bg-white">
                <div className="flex justify-between items-end mb-6">
                    <span className="font-bold text-slate-400 text-sm">TOTAL BAYAR</span>
                    <span className="text-4xl font-black text-blue-600 tracking-tighter">Rp {keranjang.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString('id-ID')}</span>
                </div>
                <button 
                    onClick={handleBayar} 
                    disabled={isLoading} 
                    className={`w-full py-5 rounded-2xl font-black shadow-xl text-lg flex justify-center items-center gap-2 transition-all ${isLoading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]'}`}
                >
                    {isLoading ? 'MEMPROSES...' : 'BAYAR SEKARANG'}
                </button>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL SUCCESS */}
      {showSuccess && <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl w-full max-w-sm animate-bounce-in"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-green-600"/></div><h2 className="text-2xl font-black text-slate-800 mb-2">Transaksi Berhasil!</h2><p className="text-slate-400 text-sm mb-6">Stok telah dikurangi & data tersimpan.</p><div className="space-y-3"><button onClick={() => window.print()} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center gap-2 justify-center transition-all"><Printer size={20}/> CETAK STRUK</button><button onClick={() => setShowSuccess(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold transition-all">Tutup / Transaksi Baru</button></div></div></div>}
      
      {/* MODAL ADD */}
      {showAddModal && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"><div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl"><h2 className="text-2xl font-black text-slate-800 mb-6">{editId?"Edit":"Tambah"} Produk</h2><div className="space-y-4"><div className="relative"><ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold font-mono focus:border-blue-500 outline-none" value={newItem.barcode} onChange={e=>setNewItem({...newItem,barcode:e.target.value})} placeholder="Scan Barcode Disini..."/></div><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} placeholder="Nama Produk"/><div className="grid grid-cols-2 gap-4"><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={newItem.stockPcs} onChange={e=>setNewItem({...newItem,stockPcs:e.target.value})} placeholder="Stok"/><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={newItem.pricePcs} onChange={e=>setNewItem({...newItem,pricePcs:e.target.value})} placeholder="Harga"/></div></div><div className="grid grid-cols-2 gap-4 mt-8"><button onClick={()=>setShowAddModal(false)} className="py-4 font-bold text-slate-400 hover:bg-slate-50 rounded-xl">Batal</button><button onClick={handleSimpanProduk} className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg transition-all">SIMPAN</button></div></div></div>}
      
      {/* MODAL WARNING EMPTY */}
      {showEmptyWarning && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl"><div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6"><ShoppingCart size={40} className="text-amber-500"/></div><h2 className="text-2xl font-black text-slate-800">Keranjang Kosong</h2><p className="text-slate-400 mt-2">Pilih barang dulu sebelum bayar.</p><button onClick={()=>setShowEmptyWarning(false)} className="mt-6 w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold transition-all">OK, Siap</button></div></div>}
    </div>
  );
};

export default App;