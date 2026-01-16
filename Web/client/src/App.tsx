import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutGrid, ShoppingCart, History, Search, LayoutDashboard,
  Trash2, CheckCircle2, ReceiptText, PlusCircle, Edit, LogOut, Printer, Eraser, ScanBarcode, TrendingUp, Wallet, ArrowRight, UserCircle, KeyRound, Settings, Users, UserPlus, XCircle, UserCheck, AlertTriangle, Minus, Plus, Download, AlertOctagon, MessageCircle, FileText
} from 'lucide-react';

// --- KONFIGURASI TOKO ---
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_beJfa1EtbhzGt4z7dcWZM2EDGfwtCMZ3Pg&s"; 
const NAMA_TOKO = "TOKO SUDAR";

// --- DATA AWAL PRODUK ---
const DATA_PRODUK_AWAL = [
  { id: 1, nama: "Beras Premium 5kg", kategori: "Sembako", stok: 3, hargaEcer: 65000, barcode: "8991001" },
  { id: 2, nama: "Minyak Goreng 2L", kategori: "Sembako", stok: 15, hargaEcer: 32000, barcode: "8991002" },
  { id: 3, nama: "Gula Pasir 1kg", kategori: "Sembako", stok: 50, hargaEcer: 14500, barcode: "8991003" },
  { id: 4, nama: "Telur Ayam 1kg", kategori: "Sembako", stok: 8, hargaEcer: 28000, barcode: "8991004" },
  { id: 5, nama: "Indomie Goreng", kategori: "Makanan", stok: 100, hargaEcer: 3500, barcode: "8991005" },
  { id: 6, nama: "Teh Pucuk Harum", kategori: "Minuman", stok: 24, hargaEcer: 4000, barcode: "8991006" },
  { id: 7, nama: "Kopi Kapal Api", kategori: "Minuman", stok: 2, hargaEcer: 1500, barcode: "8991007" },
];

// --- DATA USER DEFAULT ---
const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: '123', role: 'admin', nama: 'Boss Admin' },
  { id: 2, username: 'kasir', password: '123', role: 'kasir', nama: 'Kasir Utama' },
];

// --- Interfaces (UPDATED: Added subtotal & ppn to History) ---
interface Produk { id: number; nama: string; kategori: string; stok: number; hargaEcer: number; barcode: string; }
interface ItemKeranjang extends Produk { qty: number; subtotal: number; }
interface HistoryTransaksi { 
    id: string; 
    kasir: string; 
    tanggal: string; 
    waktu: string; 
    items: ItemKeranjang[]; 
    subtotal: number; // BARU: Simpan subtotal murni
    ppn: number;      // BARU: Simpan nilai pajak
    total: number;    // Total akhir (Subtotal + PPN)
}
interface UserSession { id: number; username: string; role: 'admin' | 'kasir'; nama: string; }
interface UserData { id: number; username: string; password: string; role: string; nama: string; }

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

  // --- STATE MANAJEMEN USER ---
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddUserSuccess, setShowAddUserSuccess] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: number, nama: string} | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', nama: '', role: 'kasir' });

  // --- STATE GANTI PASSWORD ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassSuccess, setShowPassSuccess] = useState(false);
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passError, setPassError] = useState('');

  // --- STATE APLIKASI ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'history' | 'users'>('dashboard');
  
  const [produkList, setProdukList] = useState<Produk[]>(() => {
    const saved = localStorage.getItem('db_produk');
    return saved ? JSON.parse(saved) : DATA_PRODUK_AWAL;
  });

  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>(() => {
    const saved = localStorage.getItem('db_riwayat');
    return saved ? JSON.parse(saved) : [];
  });

  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  // --- STATE BARU: PPN ---
  const [ppnAktif, setPpnAktif] = useState(false);

  // UI States
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [lastTrx, setLastTrx] = useState<HistoryTransaksi | null>(null);
  const [newItem, setNewItem] = useState({ name: "", category: "Sembako", stockPcs: "", pricePcs: "", barcode: "" });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // --- CALCULATIONS (UPDATED FOR PPN) ---
  const subtotalMurni = useMemo(() => keranjang.reduce((a, b) => a + b.subtotal, 0), [keranjang]);
  
  const nilaiPPN = useMemo(() => {
    return ppnAktif ? Math.round(subtotalMurni * 0.11) : 0;
  }, [ppnAktif, subtotalMurni]);

  const totalAkhir = subtotalMurni + nilaiPPN;

  const uniqueCategories = useMemo(() => {
    return ['Semua', ...new Set(produkList.map(item => item.kategori))];
  }, [produkList]);

  const filteredProduk = useMemo(() => {
    return produkList.filter(p => {
        const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase());
        const matchCategory = selectedCategory === 'Semua' || p.kategori === selectedCategory;
        return matchSearch && matchCategory;
    });
  }, [produkList, search, selectedCategory]);

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
      setCurrentUser({ id: user.id, username: user.username, role: user.role as 'admin'|'kasir', nama: user.nama });
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Username atau Password Salah!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setKeranjang([]); 
    setPpnAktif(false); // Reset PPN saat logout
    setShowPassSuccess(false);
  };

  // --- LOGIKA KIRIM WHATSAPP (UPDATED WITH PPN) ---
  const handleKirimWA = (trx: HistoryTransaksi) => {
    let pesan = `*STRUK BELANJA - ${NAMA_TOKO}*\n`;
    pesan += `No: ${trx.id}\n`;
    pesan += `Tanggal: ${trx.tanggal} ${trx.waktu}\n`;
    pesan += `Kasir: ${trx.kasir}\n`;
    pesan += `--------------------------------\n`;
    trx.items.forEach(item => {
        pesan += `${item.nama}\n`;
        pesan += `${item.qty} x ${item.hargaEcer.toLocaleString()} = ${item.subtotal.toLocaleString()}\n`;
    });
    pesan += `--------------------------------\n`;
    pesan += `Subtotal: Rp ${trx.subtotal.toLocaleString()}\n`;
    if (trx.ppn > 0) {
        pesan += `PPN (11%): Rp ${trx.ppn.toLocaleString()}\n`;
    }
    pesan += `*TOTAL BAYAR: Rp ${trx.total.toLocaleString()}*\n`;
    pesan += `--------------------------------\n`;
    pesan += `Terima Kasih sudah berbelanja! 🙏`;

    const encodedPesan = encodeURIComponent(pesan);
    window.open(`https://wa.me/?text=${encodedPesan}`, '_blank');
  };

  // --- LOGIKA USER ---
  const handleAddUser = () => {
    if (!newUser.username || !newUser.password || !newUser.nama) return alert("Semua kolom wajib diisi!");
    if (dbUsers.some(u => u.username === newUser.username)) return alert("Username sudah dipakai!");
    const newId = dbUsers.length > 0 ? Math.max(...dbUsers.map(u => u.id)) + 1 : 1;
    setDbUsers(prev => [...prev, { id: newId, ...newUser }]);
    setShowAddUserModal(false);
    setNewUser({ username: '', password: '', nama: '', role: 'kasir' });
    setShowAddUserSuccess(true);
  };

  const clickDeleteUser = (id: number, nama: string) => {
    if (currentUser && currentUser.id === id) { alert("Anda tidak bisa menghapus akun sendiri saat sedang login!"); return; }
    setUserToDelete({ id, nama });
    setShowDeleteUserConfirm(true);
  };

  const executeDeleteUser = () => {
    if (userToDelete) {
        setDbUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
        setShowDeleteUserConfirm(false);
        setUserToDelete(null);
    }
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
    if (dbUsers[userIndex].password !== oldPass) return setPassError("Password Lama Salah!");

    const updatedUsers = [...dbUsers];
    updatedUsers[userIndex].password = newPass;
    setDbUsers(updatedUsers);
    setShowPasswordModal(false);
    setPassForm({ oldPass: '', newPass: '', confirmPass: '' });
    setShowPassSuccess(true);
  };

  // --- LOGIKA EXPORT EXCEL (UPDATED WITH PPN) ---
  const handleExportExcel = () => {
    if (riwayat.length === 0) return alert("Belum ada data transaksi untuk diexport.");
    const dataUntukExcel = riwayat.map(trx => ({
        "ID Transaksi": trx.id,
        "Tanggal": trx.tanggal,
        "Waktu": trx.waktu,
        "Kasir": trx.kasir,
        "Detail Barang": trx.items.map(item => `${item.nama} (${item.qty})`).join(", "),
        "Subtotal": trx.subtotal,
        "PPN (11%)": trx.ppn,
        "Total Bayar": trx.total
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel);
    const wscols = [{wch: 20}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 50}, {wch: 15}, {wch: 15}, {wch: 15}];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");
    const tanggalHariIni = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Laporan_Transaksi_${tanggalHariIni}.xlsx`);
  };

  // --- LOGIKA POS (KERANJANG) ---
  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok Habis!");
    setKeranjang(prev => {
        const itemAda = prev.find(k => k.id === produk.id);
        const currentQty = itemAda ? itemAda.qty : 0;
        if (currentQty + 1 > produk.stok) { alert("Stok tidak mencukupi!"); return prev; }
        if (itemAda) { return prev.map(k => k.id === produk.id ? { ...k, qty: k.qty + 1, subtotal: (k.qty + 1) * k.hargaEcer } : k); } 
        else { return [...prev, { ...produk, qty: 1, subtotal: produk.hargaEcer }]; }
    });
  };

  const kurangiQty = (id: number) => {
    setKeranjang(prev => {
        const item = prev.find(k => k.id === id);
        if (!item) return prev;
        if (item.qty > 1) { return prev.map(k => k.id === id ? { ...k, qty: k.qty - 1, subtotal: (k.qty - 1) * k.hargaEcer } : k); } 
        else { return prev.filter(k => k.id !== id); }
    });
  };

  const hapusItemKeranjang = (id: number) => { setKeranjang(prev => prev.filter(k => k.id !== id)); };

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
            waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            items: [...keranjang],
            subtotal: subtotalMurni,
            ppn: nilaiPPN,
            total: totalAkhir // Total sudah termasuk PPN
        };
        setRiwayat(prev => [trx, ...prev]); 
        setProdukList(prevList => prevList.map(p => { 
            const itemBeli = keranjang.find(k => k.id === p.id);
            return itemBeli ? { ...p, stok: p.stok - itemBeli.qty } : p;
        }));
        setLastTrx(trx);
        setKeranjang([]);
        setPpnAktif(false); // Reset PPN setelah bayar
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
  
  const clickHapusProduk = (id: number) => { setDeleteTargetId(id); setShowDeleteConfirm(true); };
  const executeDeleteProduk = () => { if (deleteTargetId !== null) { setProdukList(produkList.filter(p => p.id !== deleteTargetId)); setShowDeleteConfirm(false); setDeleteTargetId(null); } };
  
  // --- LOGIKA RIWAYAT ---
  const hapusSemuaRiwayat = () => { if(confirm("Hapus SEMUA riwayat transaksi?")) { setRiwayat([]); } };
  const clickHapusSatuRiwayat = (id: string) => { setHistoryToDelete(id); setShowDeleteHistoryConfirm(true); };
  const executeDeleteHistory = () => { if (historyToDelete) { setRiwayat(prev => prev.filter(r => r.id !== historyToDelete)); setShowDeleteHistoryConfirm(false); setHistoryToDelete(null); } };

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
    const lowStockItems = produkList.filter(p => p.stok <= 5);

    return { totalOmset, totalTransaksi, itemsTerjual, topProduk, chartData, maxOmset, lowStockItems };
  }, [riwayat, produkList]);


  // --- HALAMAN LOGIN ---
  if (!currentUser) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200 font-sans p-4">
      <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in">
        <div className="text-center mb-6">
            {/* LOGO DI HALAMAN LOGIN */}
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-3">
              <img src={LOGO_URL} alt="Logo Toko" className="w-full h-full object-contain"/>
            </div>
            <h2 className="text-lg font-bold text-slate-500">{NAMA_TOKO}</h2>
            <h1 className="text-2xl font-black text-slate-800">Login Sistem</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label><input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 focus:ring-2 ring-blue-100 transition-all" placeholder="Contoh: admin" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})}/></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label><input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 focus:ring-2 ring-blue-100 transition-all" placeholder="••••••" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}/></div>
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

      {/* STRUK PRINT (DENGAN LOGO & PPN) */}
      <div id="struk-print" className="hidden font-mono text-sm max-w-[80mm] mx-auto bg-white p-4">
        {lastTrx && <div className="text-center">
            {/* LOGO DI STRUK */}
            <img src={LOGO_URL} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain grayscale" />
            <h2 className="font-bold text-lg">{NAMA_TOKO}</h2>
            <p className="text-xs">{lastTrx.tanggal} {lastTrx.waktu}</p>
            <p className="text-xs">No: {lastTrx.id}</p>
            <p className="text-xs">Kasir: {lastTrx.kasir}</p>
            <hr className="border-dashed border-black my-2"/>
            <div className="text-left">{lastTrx.items.map(i => (<div key={i.id} className="flex justify-between"><span>{i.nama} <span className="text-[10px]"><br/>{i.qty} x {i.hargaEcer.toLocaleString()}</span></span><span>{i.subtotal.toLocaleString()}</span></div>))}</div>
            <hr className="border-dashed border-black my-2"/>
            {/* Rincian PPN di Struk */}
            <div className="flex justify-between text-xs"><span>Subtotal</span><span>{lastTrx.subtotal.toLocaleString()}</span></div>
            {lastTrx.ppn > 0 && <div className="flex justify-between text-xs"><span>PPN (11%)</span><span>+{lastTrx.ppn.toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-lg border-t border-black mt-1 pt-1"><span>TOTAL</span><span>Rp {lastTrx.total.toLocaleString()}</span></div>
            <p className="text-center text-xs mt-4">Terima Kasih</p>
        </div>}
      </div>

      {/* SIDEBAR (DENGAN LOGO) */}
      <aside className="w-24 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20 no-print shadow-2xl">
        {/* LOGO DI SIDEBAR */}
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20 p-2">
          <img src={LOGO_URL} alt="Logo Toko" className="w-full h-full object-contain"/>
        </div>
        <nav className="flex flex-col gap-4 flex-1 w-full px-3">
            {currentUser.role === 'admin' && (<button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard size={24}/> <span className="text-[10px] font-bold">Dash</span></button>)}
            <button onClick={() => setActiveTab('pos')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ShoppingCart size={24}/> <span className="text-[10px] font-bold">Kasir</span></button>
            {currentUser.role === 'admin' && (<button onClick={() => setActiveTab('inventory')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><LayoutGrid size={24}/> <span className="text-[10px] font-bold">Stok</span></button>)}
            <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><History size={24}/> <span className="text-[10px] font-bold">Riwayat</span></button>
            {currentUser.role === 'admin' && (<button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Users size={24}/> <span className="text-[10px] font-bold">Tim</span></button>)}
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
                <h1 className="text-3xl font-black text-slate-800 tracking-tight capitalize">
                    {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'pos' ? 'Kasir' : activeTab === 'inventory' ? 'Stok Barang' : activeTab === 'history' ? 'Riwayat' : 'Manajemen Tim'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${currentUser.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>{currentUser.role}</span>
                    <p className="text-slate-400 text-sm font-medium">Halo, {currentUser.nama}</p>
                </div>
            </div>
            <div className="flex gap-4">
              {activeTab === 'pos' && (
                <form onSubmit={handleScanBarcode} className="relative group"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ScanBarcode className="text-blue-500" size={20}/></div><input ref={barcodeInputRef} type="text" className="pl-10 pr-4 py-3 bg-white border-2 border-blue-100 focus:border-blue-500 rounded-xl outline-none font-bold w-64 shadow-sm" placeholder="Scan Barcode..." value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} autoFocus/></form>
              )}
              {activeTab !== 'dashboard' && activeTab !== 'users' && (
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

                {stats.lowStockItems.length > 0 && (
                    <div className="bg-orange-50 border border-orange-100 p-6 rounded-[2rem]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg"><AlertOctagon size={24} className="text-orange-600"/></div>
                            <h3 className="text-lg font-bold text-orange-800">Perhatian: Stok Menipis</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {stats.lowStockItems.map(item => (
                                <div key={item.id} className="bg-white p-3 rounded-xl border border-orange-100 flex justify-between items-center shadow-sm">
                                    <span className="font-bold text-slate-700 text-sm">{item.nama}</span>
                                    <span className="bg-red-100 text-red-600 text-xs font-black px-2 py-1 rounded">Sisa: {item.stok}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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

          {/* POS TAB */}
          {activeTab === 'pos' && (
            <div className="pb-20">
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
                    {uniqueCategories.map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProduk.map(p => (
                    <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden group transition-all duration-300">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">{p.kategori}</span>
                      <h3 className="text-lg font-bold text-slate-700 mt-3 line-clamp-2 leading-tight h-12">{p.nama}</h3>
                      <div className="flex justify-between items-end mt-2"><p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p><p className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stok < 10 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>Stok: {p.stok}</p></div>
                    </div>
                  ))}
                  {filteredProduk.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">Tidak ada produk ditemukan.</div>}
                </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && currentUser.role === 'admin' && (
            <div>
              <div className="flex justify-end mb-6"><button onClick={() => { setEditId(null); setNewItem({name:"",category:"Sembako",stockPcs:"",pricePcs:"",barcode:""}); setShowAddModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"><PlusCircle size={20}/> Tambah Produk</button></div>
              <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest"><tr><th className="px-6 py-5">Barang</th><th className="px-6 py-5 text-center">Stok</th><th className="px-6 py-5 text-right">Harga</th><th className="px-6 py-5 text-center">Aksi</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {produkList.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4"><div className="font-bold text-slate-700">{p.nama}</div><div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{p.kategori} • {p.barcode}</div></td>
                        <td className={`px-6 text-center font-bold ${p.stok < 5 ? 'text-red-500' : 'text-green-600'}`}>{p.stok}</td>
                        <td className="px-6 text-right font-black text-slate-700">Rp {p.hargaEcer.toLocaleString()}</td>
                        <td className="px-6 text-center"><button onClick={() => { setEditId(p.id); setNewItem({name:p.nama, category:p.kategori, stockPcs:p.stok.toString(), pricePcs:p.hargaEcer.toString(), barcode:p.barcode}); setShowAddModal(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => clickHapusProduk(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors ml-2"><Trash2 size={18}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex justify-between items-center">
                  <button onClick={handleExportExcel} className="bg-green-600 text-white font-bold py-2 px-4 rounded-xl flex gap-2 shadow-lg shadow-green-200 hover:bg-green-700 transition-all"><Download size={20}/> Download Excel</button>
                  {currentUser.role === 'admin' && <button onClick={hapusSemuaRiwayat} className="text-red-500 font-bold flex gap-2 items-center hover:bg-red-50 px-4 py-2 rounded-xl transition-all"><Eraser size={16}/> Bersihkan Riwayat</button>}
              </div>
              {riwayat.map(h => (
                <div key={h.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ReceiptText/></div>
                    <div>
                        <p className="font-bold text-lg text-slate-800">{h.id}</p>
                        <p className="text-sm text-slate-400">{h.tanggal} • {h.waktu}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-slate-100 px-2 rounded text-slate-500 font-bold">Item: {h.items.length}</span>
                            <span className="text-[10px] bg-slate-100 px-2 rounded text-slate-500 font-bold">Kasir: {h.kasir}</span>
                            {/* INDIKATOR PPN DI LIST */}
                            {h.ppn > 0 && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 rounded font-bold">PPN 11%</span>}
                        </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-blue-600 text-xl">Rp {h.total.toLocaleString()}</p>
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => { setLastTrx(h); setTimeout(() => window.print(), 100); }} className="bg-slate-100 p-2 rounded-lg text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"><Printer size={16}/></button>
                        <button onClick={() => handleKirimWA(h)} className="bg-green-50 p-2 rounded-lg text-green-600 hover:bg-green-100 transition-colors"><MessageCircle size={16}/></button>
                        {currentUser.role === 'admin' && <button onClick={() => clickHapusSatuRiwayat(h.id)} className="bg-red-50 p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>}
                    </div>
                  </div>
                </div>
              ))}
              {riwayat.length === 0 && <div className="text-center text-slate-400 py-10">Belum ada riwayat transaksi.</div>}
            </div>
          )}

          {/* USERS TAB (ADMIN ONLY) */}
          {activeTab === 'users' && currentUser.role === 'admin' && (
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div><h2 className="text-xl font-bold text-slate-700">Daftar Pengguna</h2><p className="text-slate-400 text-sm">Kelola akses staff toko.</p></div>
                    <button onClick={() => setShowAddUserModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"><UserPlus size={20}/> Tambah User</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dbUsers.map(u => (
                        <div key={u.id} className="bg-white p-6 rounded-2xl border border-slate-100 relative hover:shadow-lg transition-all">
                            <div className="flex gap-4 items-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>{u.nama[0]}</div>
                                <div><h3 className="font-bold text-slate-800">{u.nama}</h3><p className="text-sm text-slate-400">@{u.username}</p></div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>{u.role}</span>
                                {u.id !== currentUser.id && <button onClick={() => clickDeleteUser(u.id, u.nama)} className="text-red-500 bg-red-50 p-2 rounded hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </main>

        {/* CART SIDEBAR (POS ONLY) */}
        {activeTab === 'pos' && (
            <aside className="w-[400px] bg-white border-l border-slate-200 p-8 flex flex-col shadow-2xl z-30">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-800"><ShoppingCart className="text-blue-600"/> Pesanan</h2>
              
              <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide pr-2">
                  {keranjang.length === 0 && <div className="text-center text-slate-400 mt-20 flex flex-col items-center gap-4"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><ShoppingCart className="text-slate-300"/></div><p>Keranjang Kosong.</p></div>}
                  {keranjang.map(i => (
                      <div key={i.id} className="flex justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                          <div>
                              <p className="font-bold text-sm text-slate-700 line-clamp-1">{i.nama}</p>
                              <p className="text-[10px] text-slate-400 mb-2">@ {i.hargaEcer.toLocaleString()}</p>
                              <div className="flex gap-3 items-center">
                                  <button onClick={() => kurangiQty(i.id)} className="w-6 h-6 bg-white border rounded-md flex items-center justify-center text-slate-600 hover:text-red-500 hover:border-red-200 transition-all"><Minus size={12}/></button>
                                  <span className="font-bold text-sm w-4 text-center">{i.qty}</span>
                                  <button onClick={() => tambahKeKeranjang(i)} className="w-6 h-6 bg-white border rounded-md flex items-center justify-center text-slate-600 hover:text-blue-500 hover:border-blue-200 transition-all"><Plus size={12}/></button>
                              </div>
                          </div>
                          <div className="text-right flex flex-col justify-between">
                              <p className="font-bold text-sm text-slate-800">Rp {i.subtotal.toLocaleString()}</p>
                              <button onClick={() => hapusItemKeranjang(i.id)} className="text-red-300 hover:text-red-500 self-end transition-colors"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
              </div>
              
              <div className="pt-6 mt-4 border-t border-dashed border-slate-300 bg-white space-y-3">
                  <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span className="font-bold text-slate-700">Rp {subtotalMurni.toLocaleString()}</span></div>
                  
                  {/* --- TOMBOL TOGGLE PPN (BARU) --- */}
                  <button 
                    onClick={() => setPpnAktif(!ppnAktif)} 
                    className={`w-full py-3 rounded-xl border-2 font-bold flex justify-between px-4 transition-all items-center ${ppnAktif ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center gap-2"><FileText size={18}/> PPN 11%</div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${ppnAktif ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${ppnAktif ? 'translate-x-4' : ''}`}></div>
                    </div>
                  </button>

                  {/* INFO PPN JIKA AKTIF */}
                  {ppnAktif && (
                     <div className="flex justify-between text-xs text-orange-600 font-bold animate-pop-in">
                        <span>Pajak (11%)</span>
                        <span>+ Rp {nilaiPPN.toLocaleString()}</span>
                     </div>
                  )}

                  <div className="flex justify-between items-end border-t pt-2 mt-2">
                      <span className="font-bold text-lg text-slate-800">TOTAL</span>
                      <span className="text-3xl font-black text-blue-600">Rp {totalAkhir.toLocaleString()}</span>
                  </div>
                  
                  <button onClick={handleBayar} disabled={isLoading} className={`w-full py-4 rounded-xl font-black text-lg shadow-xl shadow-blue-200 text-white transition-all flex justify-center items-center gap-2 ${isLoading ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]'}`}>
                    {isLoading ? 'MEMPROSES...' : <><Wallet/> BAYAR</>}
                  </button>
              </div>
            </aside>
        )}

      </div>

      {/* --- MODAL KOMPONEN --- */}
      
      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl max-w-sm w-full animate-pop-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600"><CheckCircle2 size={40}/></div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Pembayaran Berhasil!</h2>
                <p className="text-slate-500 mb-8">Transaksi telah disimpan ke riwayat.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => { setTimeout(() => window.print(), 100); }} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"><Printer size={20}/> Cetak Struk</button>
                    <button onClick={() => lastTrx && handleKirimWA(lastTrx)} className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"><MessageCircle size={20}/> Kirim WhatsApp</button>
                    <button onClick={() => setShowSuccess(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-4 rounded-xl font-bold transition-all">Tutup</button>
                </div>
            </div>
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-pop-in">
                <h2 className="text-2xl font-black text-slate-800 mb-6">{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Barcode</label><input className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})} placeholder="Scan/Ketik Barcode"/></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Nama Produk</label><input className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Nama Barang"/></div>
                    <div className="flex gap-4">
                        <div className="w-1/2"><label className="text-xs font-bold text-slate-400 uppercase">Stok</label><input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.stockPcs} onChange={e => setNewItem({...newItem, stockPcs: e.target.value})} placeholder="0"/></div>
                        <div className="w-1/2"><label className="text-xs font-bold text-slate-400 uppercase">Harga</label><input type="number" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.pricePcs} onChange={e => setNewItem({...newItem, pricePcs: e.target.value})} placeholder="0"/></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Kategori</label><select className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500 bg-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}><option>Sembako</option><option>Makanan</option><option>Minuman</option><option>Rokok</option><option>Obat</option><option>Lainnya</option></select></div>
                </div>
                <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={handleSimpanProduk} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Simpan</button>
                </div>
            </div>
        </div>
      )}

      {/* SAVE SUCCESS NOTIFICATION */}
      {showSaveSuccess && <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-pop-in"><CheckCircle2 className="text-green-400"/> <div><h4 className="font-bold">Berhasil Disimpan!</h4><p className="text-xs text-slate-400">Data produk telah diperbarui.</p></div><button onClick={() => setShowSaveSuccess(false)} className="ml-4 p-1 hover:bg-white/20 rounded"><XCircle size={18}/></button></div>}

      {/* EMPTY CART WARNING */}
      {showEmptyWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-[2rem] text-center shadow-2xl max-w-xs animate-pop-in">
                <ShoppingCart size={50} className="mx-auto text-orange-400 mb-4"/>
                <h3 className="font-bold text-lg text-slate-800">Keranjang Kosong</h3>
                <p className="text-sm text-slate-400 mb-6">Scan barang atau pilih dari daftar.</p>
                <button onClick={() => setShowEmptyWarning(false)} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200">OK</button>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-[2rem] text-center shadow-2xl max-w-xs animate-pop-in">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                <h3 className="font-bold text-lg text-slate-800">Hapus Produk?</h3>
                <p className="text-sm text-slate-400 mb-6">Data yang dihapus tidak bisa kembali.</p>
                <div className="flex gap-2">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl">Batal</button>
                    <button onClick={executeDeleteProduk} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {/* DELETE HISTORY CONFIRMATION */}
      {showDeleteHistoryConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-[2rem] text-center shadow-2xl max-w-xs animate-pop-in">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                <h3 className="font-bold text-lg text-slate-800">Hapus Transaksi?</h3>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setShowDeleteHistoryConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl">Batal</button>
                    <button onClick={executeDeleteHistory} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-200">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop-in">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><UserPlus size={24} className="text-blue-600"/> Tambah User</h2>
                <div className="space-y-3">
                    <input className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Nama Lengkap" value={newUser.nama} onChange={e => setNewUser({...newUser, nama: e.target.value})}/>
                    <input className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Username Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
                    <input className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
                    <select className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500 bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="kasir">Kasir</option><option value="admin">Admin</option></select>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setShowAddUserModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-500">Batal</button>
                    <button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Simpan</button>
                </div>
            </div>
         </div>
      )}
      
      {/* SUCCESS ADD USER NOTIF */}
      {showAddUserSuccess && <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-pop-in"><UserCheck/> <div><h4 className="font-bold">User Ditambahkan!</h4></div><button onClick={() => setShowAddUserSuccess(false)} className="ml-4 hover:bg-white/20 rounded p-1"><XCircle size={18}/></button></div>}

      {/* DELETE USER CONFIRM */}
      {showDeleteUserConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-[2rem] text-center shadow-2xl max-w-xs animate-pop-in">
                <h3 className="font-bold text-lg text-slate-800 mb-2">Hapus User?</h3>
                <p className="text-slate-500 mb-6">User <b>{userToDelete?.nama}</b> akan dihapus permanen.</p>
                <div className="flex gap-2">
                    <button onClick={() => setShowDeleteUserConfirm(false)} className="flex-1 bg-slate-100 font-bold py-3 rounded-xl">Batal</button>
                    <button onClick={executeDeleteUser} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-2xl animate-pop-in">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><KeyRound size={24} className="text-blue-600"/> Ganti Password</h2>
                <div className="space-y-3">
                    <input type="password" className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Password Lama" value={passForm.oldPass} onChange={e => setPassForm({...passForm, oldPass: e.target.value})}/>
                    <input type="password" className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Password Baru" value={passForm.newPass} onChange={e => setPassForm({...passForm, newPass: e.target.value})}/>
                    <input type="password" className="w-full border p-3 rounded-xl font-bold outline-none focus:border-blue-500" placeholder="Konfirmasi Password Baru" value={passForm.confirmPass} onChange={e => setPassForm({...passForm, confirmPass: e.target.value})}/>
                </div>
                {passError && <p className="text-red-500 text-xs font-bold mt-2 text-center">{passError}</p>}
                <div className="flex gap-2 mt-6">
                    <button onClick={() => { setShowPasswordModal(false); setPassError(''); setPassForm({oldPass:'',newPass:'',confirmPass:''}); }} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-500">Batal</button>
                    <button onClick={handleChangePassword} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">Simpan</button>
                </div>
            </div>
         </div>
      )}

      {/* SUCCESS PASSWORD NOTIF */}
      {showPassSuccess && <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-pop-in"><CheckCircle2/> <div><h4 className="font-bold">Password Berhasil Diganti!</h4></div><button onClick={() => setShowPassSuccess(false)} className="ml-4 hover:bg-white/20 rounded p-1"><XCircle size={18}/></button></div>}

    </div>
  );
};

export default App;