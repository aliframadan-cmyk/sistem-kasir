import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, LayoutDashboard,
  Trash2, CheckCircle2, ReceiptText, PlusCircle, Edit, LogOut, Printer, Eraser, ScanBarcode, TrendingUp, Wallet, ArrowRight, Percent, UserCircle, Lock, KeyRound, Settings, ShieldCheck
} from 'lucide-react';

// --- DATA AWAL PRODUK ---
const DATA_PRODUK_AWAL = [
  { id: 1, nama: "Beras Premium 5kg", kategori: "Sembako", stok: 20, hargaEcer: 65000, barcode: "8991001" },
  { id: 2, nama: "Minyak Goreng 2L", kategori: "Sembako", stok: 15, hargaEcer: 32000, barcode: "8991002" },
  { id: 3, nama: "Gula Pasir 1kg", kategori: "Sembako", stok: 50, hargaEcer: 14500, barcode: "8991003" },
  { id: 4, nama: "Telur Ayam 1kg", kategori: "Sembako", stok: 8, hargaEcer: 28000, barcode: "8991004" },
  { id: 5, nama: "Indomie Goreng", kategori: "Makanan", stok: 100, hargaEcer: 3500, barcode: "8991005" },
  { id: 6, nama: "Kopi Sachet", kategori: "Minuman", stok: 45, hargaEcer: 1500, barcode: "8991006" },
];

// --- DATA USER DEFAULT ---
const DEFAULT_USERS = [
  { username: 'admin', password: '123', role: 'admin', nama: 'Boss Admin' },
  { username: 'kasir', password: '123', role: 'kasir', nama: 'Kasir Jaga' },
];

// --- Interfaces ---
interface Produk { id: number; nama: string; kategori: string; stok: number; hargaEcer: number; barcode: string; }
interface ItemKeranjang extends Produk { qty: number; subtotal: number; }
interface HistoryTransaksi { id: string; kasir: string; tanggal: string; waktu: string; items: ItemKeranjang[]; subtotalAwal: number; diskon: number; total: number; }
interface UserSession { username: string; role: 'admin' | 'kasir'; nama: string; }
interface UserData { username: string; password: string; role: string; nama: string; }

const App = () => {
  // --- STATE USER & LOGIN ---
  const [dbUsers, setDbUsers] = useState<UserData[]>(() => {
    const saved = localStorage.getItem('db_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('kasir_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- STATE GANTI PASSWORD ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassSuccess, setShowPassSuccess] = useState(false); // New State untuk animasi sukses ganti password
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passError, setPassError] = useState('');

  // --- STATE APLIKASI ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'history'>('dashboard');
  
  const [produkList, setProdukList] = useState<Produk[]>(() => {
    const saved = localStorage.getItem('db_produk');
    return saved ? JSON.parse(saved) : DATA_PRODUK_AWAL;
  });

  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>(() => {
    const saved = localStorage.getItem('db_riwayat');
    return saved ? JSON.parse(saved) : [];
  });

  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [diskon, setDiskon] = useState<number>(0); 
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // UI States
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [lastTrx, setLastTrx] = useState<HistoryTransaksi | null>(null);
  const [newItem, setNewItem] = useState({ name: "", category: "Sembako", stockPcs: "", pricePcs: "", barcode: "" });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // --- CALCULATIONS ---
  const subtotalKotor = useMemo(() => keranjang.reduce((a, b) => a + b.subtotal, 0), [keranjang]);
  const totalBayarAkhir = Math.max(0, subtotalKotor - diskon);

  // --- EFFECT ---
  useEffect(() => { localStorage.setItem('db_produk', JSON.stringify(produkList)); }, [produkList]);
  useEffect(() => { localStorage.setItem('db_riwayat', JSON.stringify(riwayat)); }, [riwayat]);
  useEffect(() => { localStorage.setItem('db_users', JSON.stringify(dbUsers)); }, [dbUsers]);

  useEffect(() => { 
    if (activeTab === 'pos' && barcodeInputRef.current) barcodeInputRef.current.focus(); 
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kasir_session', JSON.stringify(currentUser));
      if (currentUser.role === 'kasir') setActiveTab('pos');
    } else {
      localStorage.removeItem('kasir_session');
    }
  }, [currentUser]);

  // --- LOGIKA LOGIN ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = dbUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser({ username: user.username, role: user.role as 'admin'|'kasir', nama: user.nama });
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Username atau Password Salah!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setKeranjang([]); 
    setDiskon(0);
    setShowPassSuccess(false); // Reset modal sukses jika logout dipanggil
  };

  // --- LOGIKA GANTI PASSWORD ---
  const handleChangePassword = () => {
    if (!currentUser) return;
    const { oldPass, newPass, confirmPass } = passForm;
    setPassError('');

    if (!oldPass || !newPass || !confirmPass) return setPassError("Semua kolom harus diisi!");
    if (newPass !== confirmPass) return setPassError("Password Baru dan Konfirmasi tidak cocok!");
    
    const userIndex = dbUsers.findIndex(u => u.username === currentUser.username);
    if (userIndex === -1) return;

    if (dbUsers[userIndex].password !== oldPass) {
        return setPassError("Password Lama Salah!");
    }

    // Update Password
    const updatedUsers = [...dbUsers];
    updatedUsers[userIndex].password = newPass;
    setDbUsers(updatedUsers);
    
    // UI Feedback
    setShowPasswordModal(false);
    setPassForm({ oldPass: '', newPass: '', confirmPass: '' });
    setShowPassSuccess(true); // Tampilkan animasi sukses
  };

  // --- LOGIKA POS ---
  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok Habis!");
    const itemDiKeranjang = keranjang.find(k => k.id === produk.id);
    const currentQty = itemDiKeranjang ? itemDiKeranjang.qty : 0;
    if (currentQty + 1 > produk.stok) return alert("Stok tidak mencukupi!");

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

  const handleBayar = async () => {
    if (keranjang.length === 0) return setShowEmptyWarning(true);
    setIsLoading(true);

    setTimeout(() => {
        const now = new Date();
        const trx: HistoryTransaksi = { 
            id: `INV-${Date.now()}`, 
            kasir: currentUser?.nama || 'Unknown', 
            tanggal: now.toLocaleDateString('id-ID'), 
            waktu: now.toLocaleTimeString('id-ID'),
            items: [...keranjang],
            subtotalAwal: subtotalKotor,
            diskon: diskon,
            total: totalBayarAkhir
        };
        setRiwayat([trx, ...riwayat]);
        setProdukList(produkList.map(p => {
            const itemBeli = keranjang.find(k => k.id === p.id);
            return itemBeli ? { ...p, stok: p.stok - itemBeli.qty } : p;
        }));
        setLastTrx(trx);
        setKeranjang([]);
        setDiskon(0); 
        setIsLoading(false);
        setShowSuccess(true);
    }, 800);
  };

  // --- LOGIKA INVENTORY ---
  const handleSimpanProduk = () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Nama dan Harga Wajib diisi!");
    const productData = { nama: newItem.name, kategori: newItem.category, stok: parseInt(newItem.stockPcs) || 0, hargaEcer: parseInt(newItem.pricePcs) || 0, barcode: newItem.barcode };
    if (editId) { setProdukList(produkList.map(p => p.id === editId ? { ...p, ...productData } : p)); } 
    else { const newId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1; setProdukList([...produkList, { id: newId, ...productData }]); }
    setShowAddModal(false); setShowSaveSuccess(true);
  };
  
  const clickHapusButton = (id: number) => { setDeleteTargetId(id); setShowDeleteConfirm(true); };
  const executeDelete = () => { if (deleteTargetId !== null) { setProdukList(produkList.filter(p => p.id !== deleteTargetId)); setShowDeleteConfirm(false); setDeleteTargetId(null); } };
  const hapusSemuaRiwayat = () => { if(confirm("Hapus SEMUA riwayat transaksi?")) { setRiwayat([]); } };

  // --- LOGIKA DASHBOARD ---
  const stats = useMemo(() => {
    const totalOmset = riwayat.reduce((acc, curr) => acc + curr.total, 0);
    const totalTransaksi = riwayat.length;
    const itemsTerjual = riwayat.reduce((acc, curr) => acc + curr.items.reduce((a, b) => a + b.qty, 0), 0);
    const chartData = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toLocaleDateString('id-ID');
        const total = riwayat.filter(r => r.tanggal === dateStr).reduce((acc, curr) => acc + curr.total, 0);
        return { date: dateStr.split('/')[0], total }; 
    }).reverse();
    const maxOmset = Math.max(...chartData.map(d => d.total), 100000); 
    const salesMap: Record<string, number> = {};
    riwayat.forEach(t => { t.items.forEach(i => { salesMap[i.nama] = (salesMap[i.nama] || 0) + i.qty; }); });
    const topProduk = Object.entries(salesMap).sort(([, a], [, b]) => b - a).slice(0, 5);
    return { totalOmset, totalTransaksi, itemsTerjual, topProduk, chartData, maxOmset };
  }, [riwayat, produkList]);


  // --- HALAMAN LOGIN ---
  if (!currentUser) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200 font-sans p-4">
      <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-500/50"><UserCircle size={40}/></div>
            <h1 className="text-2xl font-black text-slate-800">Login Sistem</h1>
            <p className="text-sm text-slate-400">Silakan masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 focus:ring-2 ring-blue-100 transition-all" placeholder="Contoh: admin" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})}/>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                <input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 focus:ring-2 ring-blue-100 transition-all" placeholder="••••••" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}/>
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-200 transition-all active:scale-95">MASUK <ArrowRight className="inline ml-1" size={18}/></button>
        </form>
        <div className="mt-6 text-center text-[10px] text-slate-400"><p>Default Admin: admin / 123</p><p>Default Kasir: kasir / 123</p></div>
      </div>
    </div>
  );

  // --- HALAMAN UTAMA ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <style>{`
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @media print { body * { visibility: hidden; } #struk-print, #struk-print * { visibility: visible; } #struk-print { display: block !important; position: absolute; left: 0; top: 0; width: 100%; } @page { margin: 0; size: auto; } }
      `}</style>

      {/* STRUK PRINT */}
      <div id="struk-print" className="hidden font-mono text-sm max-w-[80mm] mx-auto bg-white p-4">
        {lastTrx && <div className="text-center">
            <h2 className="font-bold">TOKO MAJU JAYA</h2>
            <p className="text-xs">{lastTrx.tanggal} {lastTrx.waktu}</p>
            <p className="text-xs">No: {lastTrx.id}</p>
            <p className="text-xs">Kasir: {lastTrx.kasir}</p>
            <hr className="border-dashed border-black my-2"/>
            <div className="text-left">{lastTrx.items.map(i => (<div key={i.id} className="flex justify-between"><span>{i.nama} <span className="text-[10px]"><br/>{i.qty} x {i.hargaEcer.toLocaleString()}</span></span><span>{i.subtotal.toLocaleString()}</span></div>))}</div>
            <hr className="border-dashed border-black my-2"/>
            <div className="flex justify-between text-xs"><span>Subtotal</span><span>{lastTrx.subtotalAwal?.toLocaleString() || lastTrx.total.toLocaleString()}</span></div>
            {lastTrx.diskon > 0 && <div className="flex justify-between text-xs mb-1"><span>Diskon</span><span>-{lastTrx.diskon.toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-lg mt-1 pt-1 border-t border-black"><span>TOTAL</span><span>Rp {lastTrx.total.toLocaleString()}</span></div>
            <p className="text-center text-xs mt-4">Terima Kasih</p>
        </div>}
      </div>

      {/* SIDEBAR */}
      <aside className="w-24 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20 no-print shadow-2xl">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-900/50"><Package size={32} /></div>
        <nav className="flex flex-col gap-4 flex-1 w-full px-3">
            {currentUser.role === 'admin' && (<button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={24}/> <span className="text-[10px] font-bold">Dash</span></button>)}
            <button onClick={() => setActiveTab('pos')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ShoppingCart size={24}/> <span className="text-[10px] font-bold">Kasir</span></button>
            {currentUser.role === 'admin' && (<button onClick={() => setActiveTab('inventory')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutGrid size={24}/> <span className="text-[10px] font-bold">Stok</span></button>)}
            <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><History size={24}/> <span className="text-[10px] font-bold">Riwayat</span></button>
        </nav>
        <button onClick={() => setShowPasswordModal(true)} className="p-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl" title="Ganti Password"><KeyRound size={24}/></button>
        <button onClick={handleLogout} className="p-3 text-red-400 hover:bg-red-500/10 rounded-xl mb-4" title="Keluar"><LogOut size={24}/></button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight capitalize">{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'pos' ? 'Kasir' : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat'}</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${currentUser.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>{currentUser.role}</span>
                    <p className="text-slate-400 text-sm font-medium">Halo, {currentUser.nama}</p>
                </div>
            </div>
            <div className="flex gap-4">
              {activeTab === 'pos' && (
                <form onSubmit={handleScanBarcode} className="relative group"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ScanBarcode className="text-blue-500" size={20}/></div><input ref={barcodeInputRef} type="text" className="pl-10 pr-4 py-3 bg-white border-2 border-blue-100 focus:border-blue-500 rounded-xl outline-none font-bold w-64 shadow-sm" placeholder="Scan Barcode..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus/></form>
              )}
              {activeTab !== 'dashboard' && (
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="Cari..." className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 w-64 shadow-sm" onChange={(e) => setSearch(e.target.value)}/></div>
              )}
            </div>
          </div>

          {/* DASHBOARD TAB (ADMIN ONLY) */}
          {activeTab === 'dashboard' && currentUser.role === 'admin' && (
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-200"><div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120}/></div><h3 className="text-4xl font-black tracking-tight mb-1">Rp {stats.totalOmset.toLocaleString('id-ID')}</h3><p className="text-blue-100 text-sm">Total Pendapatan</p></div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm"><h3 className="text-4xl font-black text-slate-800">{stats.totalTransaksi}</h3><p className="text-slate-400 text-sm">Transaksi</p></div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm"><h3 className="text-4xl font-black text-slate-800">{stats.itemsTerjual}</h3><p className="text-slate-400 text-sm">Item Terjual</p></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-slate-100 rounded-lg"><TrendingUp size={20} className="text-slate-600"/></div><h3 className="font-bold text-slate-800">Grafik 7 Hari</h3></div>
                        <div className="flex items-end gap-3 h-64 w-full px-2">{stats.chartData.map((d, i) => { const heightPercent = d.total === 0 ? 2 : (d.total / stats.maxOmset) * 100; return (<div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"><div className="relative w-full bg-slate-50 rounded-xl flex items-end h-full overflow-hidden hover:bg-slate-100 transition-all"><div style={{ height: `${heightPercent}%` }} className={`w-full rounded-t-xl transition-all duration-700 relative ${d.total > 0 ? 'bg-blue-600 group-hover:bg-blue-500' : 'bg-slate-200'}`}></div></div><span className="text-xs font-bold text-slate-400">{d.date}</span></div>) })}</div>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><CheckCircle2 size={20} className="text-green-500"/> Produk Terlaris</h3>
                        <div className="space-y-4">{stats.topProduk.map(([nama, qty], idx) => (<div key={idx} className="flex justify-between items-center pb-3 border-b border-dashed border-slate-100 last:border-0"><div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{idx+1}</div><span className="font-bold text-slate-700 text-sm">{nama}</span></div><span className="font-black text-blue-600 text-sm">{qty}</span></div>))}</div>
                    </div>
                </div>
            </div>
          )}

          {/* POS TAB (SEMUA USER) */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden group transition-all duration-300">
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{p.kategori}</span>
                  <h3 className="text-lg font-bold text-slate-700 mt-3 line-clamp-2 leading-tight h-12">{p.nama}</h3>
                  <div className="flex justify-between items-end mt-2"><p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p><p className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stok < 10 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Stok: {p.stok}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY TAB (ADMIN ONLY) */}
          {activeTab === 'inventory' && currentUser.role === 'admin' && (
            <div>
              <div className="flex justify-end mb-6"><button onClick={() => { setEditId(null); setNewItem({name:"",category:"Sembako",stockPcs:"",pricePcs:"",barcode:""}); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"><PlusCircle size={20}/> Tambah Produk</button></div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest"><tr><th className="px-6 py-5">Barang</th><th className="px-6 py-5 text-center">Stok</th><th className="px-6 py-5 text-right">Harga</th><th className="px-6 py-5 text-center">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">{produkList.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors"><td className="px-6 py-5 font-bold text-slate-700">{p.nama}</td><td className="px-6 py-5 text-center font-bold text-blue-600">{p.stok}</td><td className="px-6 py-5 text-right font-black">Rp {p.hargaEcer.toLocaleString('id-ID')}</td><td className="px-6 py-5 text-center flex justify-center gap-2"><button onClick={() => { setEditId(p.id); setNewItem({name:p.nama,category:p.kategori,stockPcs:p.stok.toString(),pricePcs:p.hargaEcer.toString(),barcode:p.barcode}); setShowAddModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={18}/></button><button onClick={() => clickHapusButton(p.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl pb-10">
              {currentUser.role === 'admin' && riwayat.length > 0 && <button onClick={hapusSemuaRiwayat} className="mb-4 text-red-500 text-sm font-bold flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg w-fit"><Eraser size={16}/> Hapus Semua</button>}
              {riwayat.map(h => (<div key={h.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-5"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ReceiptText/></div><div><p className="font-bold text-slate-800 text-lg">{h.id}</p><p className="text-sm text-slate-400 font-medium">{h.tanggal} - {h.waktu} <span className="ml-2 text-slate-300">|</span> <span className="ml-2 text-blue-500 font-bold">{h.kasir}</span></p><div className="flex gap-2 mt-1"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Item: {h.items.length}</span>{h.diskon > 0 && <span className="text-[10px] bg-red-100 px-2 py-0.5 rounded text-red-500">Disc: Rp{h.diskon.toLocaleString()}</span>}</div></div></div><div className="text-right"><p className="font-black text-blue-600 text-xl">Rp {h.total.toLocaleString('id-ID')}</p><button onClick={() => { setLastTrx(h); setTimeout(() => window.print(), 100); }} className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1 justify-end mt-2"><Printer size={14}/> CETAK NOTA</button></div></div>))}
            </div>
          )}
        </main>

        {/* KERANJANG (HANYA DI POS) */}
        {activeTab === 'pos' && (
          <aside className="w-[400px] bg-white border-l border-slate-100 p-8 flex flex-col shadow-2xl z-30">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><ShoppingCart className="text-blue-600" size={28}/> Pesanan</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin mb-4">
              {keranjang.length === 0 && <div className="text-center text-slate-400 mt-20">Keranjang Kosong.</div>}
              {keranjang.map(item => (<div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl border border-transparent hover:border-blue-200 transition-all"><div><p className="font-bold text-sm text-slate-700 line-clamp-1">{item.nama}</p><div className="flex items-center gap-2 mt-1"><span className="text-xs font-bold bg-white px-2 py-1 rounded border">{item.qty}x</span><span className="text-xs text-slate-400">@ {item.hargaEcer.toLocaleString()}</span></div></div><div className="text-right"><p className="font-bold text-slate-700 text-sm">Rp {item.subtotal.toLocaleString()}</p><button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 text-[10px] mt-1 font-bold">HAPUS</button></div></div>))}
            </div>
            <div className="pt-4 border-t border-dashed border-slate-200 bg-white">
                <div className="flex justify-between items-center mb-3"><span className="text-slate-400 text-sm font-medium">Subtotal</span><span className="font-bold text-slate-700">Rp {subtotalKotor.toLocaleString()}</span></div>
                <div className="bg-slate-50 p-3 rounded-xl mb-6 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 ring-blue-100 transition-all">
                    <div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-white rounded-lg text-slate-400 shadow-sm"><Percent size={14}/></div><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Potongan Harga (Rp)</label></div>
                    <div className="flex items-center gap-2"><button onClick={() => setDiskon(Math.max(0, diskon - 500))} className="w-10 h-10 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 font-bold text-lg active:scale-90 transition-all">-</button><input type="number" className="flex-1 bg-white border border-slate-200 rounded-lg h-10 px-3 font-bold text-slate-700 text-center outline-none focus:border-blue-500" placeholder="0" value={diskon} onFocus={(e) => e.target.select()} onChange={(e) => { const val = parseInt(e.target.value); setDiskon(isNaN(val) ? 0 : val); }} /><button onClick={() => setDiskon(diskon + 500)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 font-bold text-lg active:scale-90 transition-all">+</button></div>
                    <div className="flex gap-2 mt-2 justify-center">{[1000, 2000, 5000].map(val => ( <button key={val} onClick={() => setDiskon(val)} className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1 rounded font-bold transition-colors">{val/1000}k</button> ))} <button onClick={() => setDiskon(0)} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-500 px-2 py-1 rounded font-bold transition-colors">Reset</button></div>
                </div>
                <div className="flex justify-between items-end mb-6"><span className="font-bold text-slate-800 text-lg">TOTAL</span><span className="text-4xl font-black text-blue-600 tracking-tighter">Rp {totalBayarAkhir.toLocaleString('id-ID')}</span></div>
                <button onClick={handleBayar} disabled={isLoading} className={`w-full py-5 rounded-2xl font-black shadow-xl text-lg flex justify-center items-center gap-2 transition-all ${isLoading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]'}`}>{isLoading ? 'MEMPROSES...' : 'BAYAR SEKARANG'}</button>
            </div>
          </aside>
        )}
      </div>

      {/* --- MODAL POPUPS --- */}
      {showSuccess && <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl w-full max-w-sm animate-pop-in"><div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-green-600"/></div><h2 className="text-2xl font-black text-slate-800 mb-2">Transaksi Berhasil!</h2><p className="text-slate-400 text-sm mb-6">Data tersimpan & Stok berkurang.</p><div className="space-y-3"><button onClick={() => window.print()} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center gap-2 justify-center transition-all"><Printer size={20}/> CETAK STRUK</button><button onClick={() => setShowSuccess(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold transition-all">Tutup</button></div></div></div>}
      {showAddModal && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"><div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl animate-pop-in"><h2 className="text-2xl font-black text-slate-800 mb-6">{editId?"Edit":"Tambah"} Produk</h2><div className="space-y-4"><div className="relative"><ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold font-mono focus:border-blue-500 outline-none" value={newItem.barcode} onChange={e=>setNewItem({...newItem,barcode:e.target.value})} placeholder="Scan Barcode Disini..."/></div><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} placeholder="Nama Produk"/><div className="grid grid-cols-2 gap-4"><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={newItem.stockPcs} onChange={e=>setNewItem({...newItem,stockPcs:e.target.value})} placeholder="Stok"/><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none" value={newItem.pricePcs} onChange={e=>setNewItem({...newItem,pricePcs:e.target.value})} placeholder="Harga"/></div></div><div className="grid grid-cols-2 gap-4 mt-8"><button onClick={()=>setShowAddModal(false)} className="py-4 font-bold text-slate-400 hover:bg-slate-50 rounded-xl">Batal</button><button onClick={handleSimpanProduk} className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg transition-all">SIMPAN</button></div></div></div>}
      {showSaveSuccess && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[110] p-4"><div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl w-full max-w-xs animate-pop-in"><div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} className="text-blue-600"/></div><h2 className="text-xl font-black text-slate-800 mb-2">Sukses Disimpan!</h2><p className="text-slate-400 text-xs mb-6">Data produk berhasil diperbarui.</p><button onClick={() => setShowSaveSuccess(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">MANTAP <ArrowRight size={18}/></button></div></div>}
      {showDeleteConfirm && <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md flex items-center justify-center z-[120] p-4"><div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl w-full max-w-sm animate-pop-in border-4 border-white"><div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"><Trash2 size={40} className="text-red-500"/></div><h2 className="text-2xl font-black text-slate-800 mb-2">Hapus Produk Ini?</h2><p className="text-slate-500 text-sm mb-8 leading-relaxed">Tindakan ini tidak bisa dibatalkan.<br/>Data produk akan hilang permanen.</p><div className="grid grid-cols-2 gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-all">Batal</button><button onClick={executeDelete} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2">Ya, Hapus</button></div></div></div>}
      {showEmptyWarning && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100]"><div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl animate-pop-in"><div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6"><ShoppingCart size={40} className="text-amber-500"/></div><h2 className="text-2xl font-black text-slate-800">Keranjang Kosong</h2><p className="text-slate-400 mt-2">Pilih barang dulu sebelum bayar.</p><button onClick={()=>setShowEmptyWarning(false)} className="mt-6 w-full bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold transition-all">OK, Siap</button></div></div>}
      
      {/* MODAL INPUT GANTI PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl animate-pop-in border-4 border-white relative">
                <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2"><Settings className="text-slate-400"/> Ganti Password</h2>
                <p className="text-sm text-slate-400 mb-6">Ubah password untuk akun: <b>{currentUser?.username}</b></p>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Password Lama</label><input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" value={passForm.oldPass} onChange={e => setPassForm({...passForm, oldPass: e.target.value})} placeholder="******"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Password Baru</label><input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" value={passForm.newPass} onChange={e => setPassForm({...passForm, newPass: e.target.value})} placeholder="******"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Konfirmasi Password Baru</label><input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 transition-all" value={passForm.confirmPass} onChange={e => setPassForm({...passForm, confirmPass: e.target.value})} placeholder="******"/></div>
                </div>
                {passError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 mt-4 rounded-lg">{passError}</p>}
                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={() => { setShowPasswordModal(false); setPassError(''); }} className="py-3 font-bold text-slate-400 hover:bg-slate-50 rounded-xl">Batal</button>
                    <button onClick={handleChangePassword} className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black shadow-lg transition-all">Simpan</button>
                </div>
            </div>
        </div>
      )}

      {/* NEW: MODAL SUKSES GANTI PASSWORD */}
      {showPassSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[160] p-4">
            <div className="bg-white p-10 rounded-[3rem] text-center shadow-2xl w-full max-w-sm animate-pop-in border-4 border-white">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                    <ShieldCheck size={48} className="text-green-600"/>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Password Diubah!</h2>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">Password Anda berhasil diperbarui.<br/>Silakan login kembali untuk keamanan.</p>
                <button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center gap-2 justify-center transition-all shadow-xl">
                    LOGIN ULANG <ArrowRight size={18}/>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;