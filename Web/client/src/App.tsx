import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutGrid, ShoppingCart, History, Search, LayoutDashboard,
  Trash2, CheckCircle2, ReceiptText, PlusCircle, Edit, LogOut, Printer, Eraser, ScanBarcode, TrendingUp, Wallet, ArrowRight, UserCircle, KeyRound, Settings, Users, UserPlus, XCircle, UserCheck, AlertTriangle, Minus, Plus, Download, AlertOctagon, MessageCircle, FileText, Tag, CreditCard, Banknote, QrCode, Coins, ChevronDown, BookUser
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
];

const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: '123', role: 'admin', nama: 'Boss Admin' },
  { id: 2, username: 'kasir', password: '123', role: 'kasir', nama: 'Kasir Utama' },
];

// --- Interfaces ---
interface Produk { id: number; nama: string; kategori: string; stok: number; hargaEcer: number; barcode: string; }
interface ItemKeranjang extends Produk { qty: number; subtotal: number; }
interface HistoryTransaksi { 
    id: string; 
    kasir: string; 
    tanggal: string; 
    waktu: string; 
    items: ItemKeranjang[]; 
    subtotal: number; 
    diskon: number;
    ppn: number;      
    total: number;
    bayar: number;
    kembali: number;
    metodePembayaran: string;
    catatan?: string; // Menyimpan nama pelanggan jika kasbon
}
interface UserSession { id: number; username: string; role: 'admin' | 'kasir'; nama: string; }
interface UserData { id: number; username: string; password: string; role: string; nama: string; }

// Interface Khusus Kasbon
interface KasbonData {
    id: string; // ID Transaksi terkait
    tanggal: string;
    namaPelanggan: string;
    total: number;
    status: 'Belum Lunas' | 'Lunas';
    items: ItemKeranjang[];
}

const App = () => {
  // --- STATE USER ---
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

  // --- STATE USER MANAJEMEN ---
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddUserSuccess, setShowAddUserSuccess] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: number, nama: string} | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', nama: '', role: 'kasir' });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassSuccess, setShowPassSuccess] = useState(false);
  const [passForm, setPassForm] = useState({ oldPass: '', newPass: '', confirmPass: '' });
  const [passError, setPassError] = useState('');

  // --- STATE APLIKASI UTAMA ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'history' | 'users' | 'kasbon'>('dashboard');
  
  const [produkList, setProdukList] = useState<Produk[]>(() => {
    const saved = localStorage.getItem('db_produk');
    return saved ? JSON.parse(saved) : DATA_PRODUK_AWAL;
  });

  // --- STATE KASBON ---
  const [kasbonList, setKasbonList] = useState<KasbonData[]>(() => {
      const saved = localStorage.getItem('db_kasbon');
      return saved ? JSON.parse(saved) : [];
  });
  const [namaPelangganKasbon, setNamaPelangganKasbon] = useState("");
  const [showLunasConfirm, setShowLunasConfirm] = useState<{id: string, nama: string} | null>(null);

  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>(() => {
    try {
        const saved = localStorage.getItem('db_riwayat');
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
            id: t.id || `ERR-${Math.random()}`,
            kasir: t.kasir || 'Unknown',
            tanggal: t.tanggal || '-',
            waktu: t.waktu || '-',
            items: Array.isArray(t.items) ? t.items : [], 
            subtotal: typeof t.subtotal === 'number' ? t.subtotal : (t.total || 0),
            diskon: t.diskon || 0,
            ppn: t.ppn || 0,
            total: t.total || 0,
            bayar: t.bayar || 0,
            kembali: t.kembali || 0,
            metodePembayaran: t.metodePembayaran || 'Cash',
            catatan: t.catatan || ''
        }));
    } catch (error) {
        console.error("Data riwayat rusak, reset...", error);
        return []; 
    }
  });

  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  const [ppnAktif, setPpnAktif] = useState(false);
  const [inputDiskon, setInputDiskon] = useState(""); 
  const [metodePembayaran, setMetodePembayaran] = useState<string>('Cash'); 
  const [inputBayar, setInputBayar] = useState(""); 

  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);
  const [showQrisModal, setShowQrisModal] = useState(false); 

  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [lastTrx, setLastTrx] = useState<HistoryTransaksi | null>(null);
  const [newItem, setNewItem] = useState({ name: "", category: "Sembako", stockPcs: "", pricePcs: "", barcode: "" });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // --- CALCULATIONS ---
  const subtotalMurni = useMemo(() => keranjang.reduce((a, b) => a + b.subtotal, 0), [keranjang]);
  
  const nilaiDiskon = useMemo(() => {
    const val = parseInt(inputDiskon.replace(/\D/g, '')) || 0;
    return val > subtotalMurni ? subtotalMurni : val; 
  }, [inputDiskon, subtotalMurni]);

  const subtotalSetelahDiskon = subtotalMurni - nilaiDiskon;
  const nilaiPPN = useMemo(() => (ppnAktif ? Math.round(subtotalSetelahDiskon * 0.11) : 0), [ppnAktif, subtotalSetelahDiskon]);
  const totalAkhir = subtotalSetelahDiskon + nilaiPPN;

  const nilaiBayar = useMemo(() => {
    if (metodePembayaran === 'QRIS' || metodePembayaran === 'Kasbon') return totalAkhir; 
    return parseInt(inputBayar.replace(/\D/g, '')) || 0;
  }, [inputBayar, metodePembayaran, totalAkhir]);

  const nilaiKembalian = useMemo(() => nilaiBayar - totalAkhir, [nilaiBayar, totalAkhir]);
  const isKurangBayar = metodePembayaran === 'Cash' && nilaiBayar < totalAkhir;

  const uniqueCategories = useMemo(() => ['Semua', ...new Set(produkList.map(item => item.kategori))], [produkList]);
  const filteredProduk = useMemo(() => produkList.filter(p => (selectedCategory === 'Semua' || p.kategori === selectedCategory) && p.nama.toLowerCase().includes(search.toLowerCase())), [produkList, search, selectedCategory]);

  // --- EFFECT ---
  useEffect(() => { localStorage.setItem('db_produk', JSON.stringify(produkList)); }, [produkList]);
  useEffect(() => { localStorage.setItem('db_riwayat', JSON.stringify(riwayat)); }, [riwayat]);
  useEffect(() => { localStorage.setItem('db_users', JSON.stringify(dbUsers)); }, [dbUsers]);
  useEffect(() => { localStorage.setItem('db_kasbon', JSON.stringify(kasbonList)); }, [kasbonList]);

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

  // --- LOGIC FUNCTIONS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = dbUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser({ id: user.id, username: user.username, role: user.role as 'admin'|'kasir', nama: user.nama });
      setLoginError(''); setLoginForm({ username: '', password: '' });
    } else { setLoginError('Username atau Password Salah!'); }
  };

  const handleLogout = () => {
    setCurrentUser(null); setKeranjang([]); setPpnAktif(false); setInputDiskon(""); setInputBayar(""); setMetodePembayaran('Cash'); setShowPassSuccess(false);
  };

  const handleKirimWA = (trx: HistoryTransaksi) => {
    let pesan = `*STRUK BELANJA - ${NAMA_TOKO}*\nNo: ${trx.id}\nTanggal: ${trx.tanggal} ${trx.waktu}\nKasir: ${trx.kasir}\n`;
    if(trx.catatan) pesan += `Pelanggan: ${trx.catatan}\n`;
    pesan += `--------------------------------\n`;
    trx.items.forEach(item => { pesan += `${item.nama}\n${item.qty} x ${item.hargaEcer.toLocaleString()} = ${item.subtotal.toLocaleString()}\n`; });
    pesan += `--------------------------------\nSubtotal: Rp ${trx.subtotal.toLocaleString()}\n`;
    if(trx.diskon > 0) pesan += `Diskon: -Rp ${trx.diskon.toLocaleString()}\n`;
    if(trx.ppn > 0) pesan += `PPN 11%: +Rp ${trx.ppn.toLocaleString()}\n`;
    pesan += `--------------------------------\n*Total: Rp ${trx.total.toLocaleString()}*\n`;
    if(trx.metodePembayaran === 'Kasbon') pesan += `Status: *HUTANG / KASBON*\n`;
    else { pesan += `Bayar: Rp ${trx.bayar.toLocaleString()}\nKembali: Rp ${trx.kembali.toLocaleString()}\n`; }
    pesan += `--------------------------------\nTerima Kasih! 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password || !newUser.nama) return alert("Semua kolom wajib diisi!");
    if (dbUsers.some(u => u.username === newUser.username)) return alert("Username sudah dipakai!");
    const newId = dbUsers.length > 0 ? Math.max(...dbUsers.map(u => u.id)) + 1 : 1;
    setDbUsers(prev => [...prev, { id: newId, ...newUser }]);
    setShowAddUserModal(false); setNewUser({ username: '', password: '', nama: '', role: 'kasir' }); setShowAddUserSuccess(true);
  };

  const clickDeleteUser = (id: number, nama: string) => {
    if (currentUser && currentUser.id === id) { alert("Tidak bisa hapus akun sendiri!"); return; }
    setUserToDelete({ id, nama }); setShowDeleteUserConfirm(true);
  };

  const executeDeleteUser = () => {
    if (userToDelete) { setDbUsers(prev => prev.filter(u => u.id !== userToDelete.id)); setShowDeleteUserConfirm(false); setUserToDelete(null); }
  };

  const handleChangePassword = () => {
    if (!currentUser) return;
    const { oldPass, newPass, confirmPass } = passForm;
    if (!oldPass || !newPass || !confirmPass) return setPassError("Semua kolom harus diisi!");
    if (newPass !== confirmPass) return setPassError("Password Baru dan Konfirmasi tidak cocok!");
    const userIndex = dbUsers.findIndex(u => u.username === currentUser.username);
    if (dbUsers[userIndex].password !== oldPass) return setPassError("Password Lama Salah!");
    const updatedUsers = [...dbUsers]; updatedUsers[userIndex].password = newPass;
    setDbUsers(updatedUsers); setShowPasswordModal(false); setPassForm({ oldPass: '', newPass: '', confirmPass: '' }); setShowPassSuccess(true);
  };

  const handleExportExcel = () => {
    if (riwayat.length === 0) return alert("Belum ada data.");
    const data = riwayat.map(t => ({
        "ID": t.id, "Tanggal": t.tanggal, "Kasir": t.kasir, "Metode": t.metodePembayaran, "Pelanggan": t.catatan || "-",
        "Total": t.total, "Bayar": t.bayar
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.xlsx`);
  };

  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok Habis!");
    setKeranjang(prev => {
        const item = prev.find(k => k.id === produk.id);
        if (item && item.qty + 1 > produk.stok) { alert("Stok kurang!"); return prev; }
        return item ? prev.map(k => k.id === produk.id ? { ...k, qty: k.qty + 1, subtotal: (k.qty + 1) * k.hargaEcer } : k) 
                    : [...prev, { ...produk, qty: 1, subtotal: produk.hargaEcer }];
    });
  };

  const kurangiQty = (id: number) => {
    setKeranjang(prev => {
        const item = prev.find(k => k.id === id);
        if (!item) return prev;
        return item.qty > 1 ? prev.map(k => k.id === id ? { ...k, qty: k.qty - 1, subtotal: (k.qty - 1) * k.hargaEcer } : k) : prev.filter(k => k.id !== id);
    });
  };

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    const item = produkList.find(p => p.barcode === barcodeInput);
    if (item) { tambahKeKeranjang(item); setBarcodeInput(""); } else { alert("Barang tidak ditemukan!"); setBarcodeInput(""); }
  };

  const handleBayarClick = () => {
      if (keranjang.length === 0) return setShowEmptyWarning(true);
      if (metodePembayaran === 'Cash' && isKurangBayar) return alert("Uang kurang!");
      if (metodePembayaran === 'Kasbon' && !namaPelangganKasbon.trim()) return alert("Nama Pelanggan wajib diisi untuk Kasbon!");
      if (metodePembayaran === 'QRIS') setShowQrisModal(true);
      else executeTransaction();
  };

  const executeTransaction = async () => {
    setIsLoading(true); setShowQrisModal(false);
    setTimeout(() => {
        const now = new Date();
        const trxId = `INV-${Date.now()}`;
        const trx: HistoryTransaksi = { 
            id: trxId, kasir: currentUser?.nama || 'Unknown', 
            tanggal: now.toLocaleDateString('id-ID'), waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            items: [...keranjang], subtotal: subtotalMurni, diskon: nilaiDiskon, ppn: nilaiPPN, total: totalAkhir,
            bayar: nilaiBayar, kembali: nilaiKembalian, metodePembayaran,
            catatan: metodePembayaran === 'Kasbon' ? namaPelangganKasbon : ''
        };

        if (metodePembayaran === 'Kasbon') {
            const newKasbon: KasbonData = {
                id: trxId, tanggal: trx.tanggal, namaPelanggan: namaPelangganKasbon,
                total: totalAkhir, status: 'Belum Lunas', items: [...keranjang]
            };
            setKasbonList(prev => [newKasbon, ...prev]);
        }

        setRiwayat(prev => [trx, ...prev]); 
        setProdukList(prev => prev.map(p => { 
            const item = keranjang.find(k => k.id === p.id);
            return item ? { ...p, stok: p.stok - item.qty } : p;
        }));
        setLastTrx(trx); setKeranjang([]); setPpnAktif(false); setInputDiskon(""); setInputBayar(""); setNamaPelangganKasbon(""); setMetodePembayaran('Cash'); setIsLoading(false); setShowSuccess(true);
    }, 800);
  };

  const handleLunasiKasbon = (id: string) => {
      setKasbonList(prev => prev.map(k => k.id === id ? { ...k, status: 'Lunas' } : k));
      setShowLunasConfirm(null);
  };

  const handleSimpanProduk = () => {
    if (!newItem.name || !newItem.pricePcs) return alert("Nama dan Harga Wajib diisi!");
    const productData = { nama: newItem.name, kategori: newItem.category, stok: parseInt(newItem.stockPcs) || 0, hargaEcer: parseInt(newItem.pricePcs) || 0, barcode: newItem.barcode };
    if (editId) { setProdukList(produkList.map(p => p.id === editId ? { ...p, ...productData } : p)); } 
    else { const newId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1; setProdukList([...produkList, { id: newId, ...productData }]); }
    setShowAddModal(false); setShowSaveSuccess(true);
  };

  const clickHapusProduk = (id: number) => { setDeleteTargetId(id); setShowDeleteConfirm(true); };
  const executeDeleteProduk = () => { if (deleteTargetId !== null) { setProdukList(produkList.filter(p => p.id !== deleteTargetId)); setShowDeleteConfirm(false); setDeleteTargetId(null); } };
  
  const stats = useMemo(() => {
    const totalOmset = riwayat.reduce((acc, curr) => acc + curr.total, 0);
    const chartData = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toLocaleDateString('id-ID');
        return { date: dateStr.split('/')[0], total: riwayat.filter(r => r.tanggal === dateStr).reduce((acc, curr) => acc + curr.total, 0) }; 
    }).reverse();
    const maxOmset = Math.max(...chartData.map(d => d.total), 100000); 
    const salesMap: Record<string, number> = {};
    riwayat.forEach(t => { t.items.forEach(i => { salesMap[i.nama] = (salesMap[i.nama] || 0) + i.qty; }); });
    const topProduk = Object.entries(salesMap).sort(([, a], [, b]) => b - a).slice(0, 5);
    return { totalOmset, totalTransaksi: riwayat.length, itemsTerjual: riwayat.reduce((acc, curr) => acc + curr.items.reduce((a, b) => a + b.qty, 0), 0), topProduk, chartData, maxOmset, lowStockItems: produkList.filter(p => p.stok <= 5) };
  }, [riwayat, produkList]);

  // --- RENDER LOGIN ---
  if (!currentUser) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200 font-sans p-4">
      <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-pop-in">
        <div className="text-center mb-6">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-3">
              <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain"/>
            </div>
            <h1 className="text-2xl font-black text-slate-800">Login Sistem</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label><input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold" placeholder="Contoh: admin" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})}/></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label><input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold" placeholder="••••••" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}/></div>
            {loginError && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95">MASUK</button>
        </form>
      </div>
    </div>
  );

  // --- RENDER MAIN APP ---
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-24 bg-slate-900 text-white flex flex-col items-center py-6 gap-2 shadow-2xl z-20">
        <div className="mb-6 p-2 bg-white/10 rounded-2xl"><img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain"/></div>
        <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={24}/> <span className="text-[10px] font-bold">Dash</span></button>
        <button onClick={() => setActiveTab('pos')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><ShoppingCart size={24}/> <span className="text-[10px] font-bold">Kasir</span></button>
        <button onClick={() => setActiveTab('kasbon')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'kasbon' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><BookUser size={24}/> <span className="text-[10px] font-bold">Kasbon</span></button>
        <button onClick={() => setActiveTab('inventory')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutGrid size={24}/> <span className="text-[10px] font-bold">Produk</span></button>
        <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><History size={24}/> <span className="text-[10px] font-bold">Riwayat</span></button>
        <button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'}`}><Users size={24}/> <span className="text-[10px] font-bold">Users</span></button>
        <div className="mt-auto flex flex-col gap-2 w-full px-2">
            <button onClick={() => setShowPasswordModal(true)} className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all"><KeyRound size={20} className="mx-auto"/></button>
            <button onClick={handleLogout} className="p-3 rounded-xl bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white transition-all"><LogOut size={20} className="mx-auto"/></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
             {activeTab === 'dashboard' && <><LayoutDashboard className="text-blue-600"/> Dashboard</>}
             {activeTab === 'pos' && <><ShoppingCart className="text-blue-600"/> Kasir</>}
             {activeTab === 'kasbon' && <><BookUser className="text-blue-600"/> Data Kasbon</>}
             {activeTab === 'inventory' && <><LayoutGrid className="text-blue-600"/> Stok Produk</>}
             {activeTab === 'history' && <><History className="text-blue-600"/> Riwayat Transaksi</>}
             {activeTab === 'users' && <><Users className="text-blue-600"/> Manajemen User</>}
          </h2>
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
                <p className="text-xs text-slate-400 font-bold uppercase">Login sebagai</p>
                <p className="font-bold text-slate-800">{currentUser?.nama}</p>
             </div>
             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black border-2 border-blue-200">
                {currentUser?.username.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-white/20 rounded-2xl"><Wallet size={24}/></div><span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg">Hari Ini</span></div>
                        <p className="text-sm opacity-80 font-medium">Total Omset</p>
                        <h3 className="text-3xl font-black mt-1">Rp {stats.totalOmset.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><ReceiptText size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold">Total Transaksi</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.totalTransaksi}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Tag size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold">Item Terjual</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.itemsTerjual}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-red-100 text-red-600 rounded-2xl"><AlertOctagon size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold">Stok Menipis</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.lowStockItems.length} <span className="text-sm text-slate-400 font-normal">Item</span></h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500"/> Grafik Penjualan (7 Hari)</h3>
                        <div className="h-64 flex items-end justify-between gap-2">
                            {stats.chartData.map((d, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className="w-full bg-blue-100 rounded-t-xl relative group-hover:bg-blue-200 transition-all" style={{ height: `${(d.total / stats.maxOmset) * 100}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Rp {d.total.toLocaleString()}</div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{d.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Tag size={20} className="text-orange-500"/> Terlaris</h3>
                        <div className="space-y-4">
                            {stats.topProduk.map(([nama, qty], i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-slate-400 border border-slate-200">#{i+1}</div>
                                        <span className="font-bold text-slate-700 text-sm">{nama}</span>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">{qty} sold</span>
                                </div>
                            ))}
                            {stats.topProduk.length === 0 && <p className="text-slate-400 text-center text-sm py-4">Belum ada data penjualan.</p>}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* POS TAB */}
          {activeTab === 'pos' && (
            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
                {/* KIRI: PRODUK */}
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-3 bg-white">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Cari barang..." className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-200 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <form onSubmit={handleScanBarcode} className="relative w-1/3">
                            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input ref={barcodeInputRef} type="text" placeholder="Scan Barcode" className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-blue-100 rounded-xl font-bold text-blue-800 focus:ring-2 focus:ring-blue-400 outline-none transition-all" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} />
                        </form>
                    </div>
                    <div className="flex gap-2 p-2 overflow-x-auto border-b border-slate-50 scrollbar-hide">
                        {uniqueCategories.map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredProduk.map((produk) => (
                                <button key={produk.id} onClick={() => tambahKeKeranjang(produk)} disabled={produk.stok === 0}
                                    className={`bg-white p-4 rounded-2xl border text-left transition-all hover:scale-105 active:scale-95 flex flex-col justify-between h-32 shadow-sm ${produk.stok === 0 ? 'opacity-50 grayscale border-slate-100 cursor-not-allowed' : 'border-slate-100 hover:border-blue-300 hover:shadow-md'}`}>
                                    <div>
                                        <h4 className="font-bold text-slate-800 leading-tight line-clamp-2">{produk.nama}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{produk.kategori}</p>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="font-black text-blue-600">Rp {produk.hargaEcer.toLocaleString()}</span>
                                        <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${produk.stok > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{produk.stok}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* KANAN: KERANJANG */}
                <div className="w-full md:w-[400px] bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-full z-10">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><ShoppingCart size={20} className="text-blue-600"/> Keranjang</h3>
                            <button onClick={() => setKeranjang([])} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Eraser size={18}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {keranjang.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                                <ShoppingCart size={64} className="opacity-20"/>
                                <p className="font-bold text-sm">Keranjang Kosong</p>
                            </div>
                        ) : (
                            keranjang.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.nama}</h4>
                                        <div className="text-xs text-slate-500 font-medium mt-1">Rp {item.hargaEcer.toLocaleString()}</div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 px-2 mx-2">
                                        <button onClick={() => kurangiQty(item.id)} className="w-6 h-6 flex items-center justify-center bg-white rounded-lg text-slate-600 shadow-sm hover:text-red-500 font-bold">-</button>
                                        <span className="font-bold text-sm min-w-[20px] text-center">{item.qty}</span>
                                        <button onClick={() => tambahKeKeranjang(item)} className="w-6 h-6 flex items-center justify-center bg-blue-600 rounded-lg text-white shadow-sm hover:bg-blue-700 font-bold">+</button>
                                    </div>
                                    <div className="font-black text-slate-800 text-sm">{(item.hargaEcer * item.qty).toLocaleString()}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl space-y-3 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                        {/* SETTING TRANSAKSI */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between bg-white p-2 px-3 rounded-xl border border-slate-200">
                                <span className="text-xs font-bold text-slate-500">PPN 11%</span>
                                <button onClick={() => setPpnAktif(!ppnAktif)} className={`w-10 h-6 rounded-full p-1 transition-all ${ppnAktif ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'} flex`}><div className="w-4 h-4 bg-white rounded-full shadow-md"></div></button>
                            </div>
                            <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 flex items-center">
                                <span className="text-xs font-bold text-slate-500 mr-2">Diskon</span>
                                <input type="text" className="w-full text-right font-bold text-sm outline-none text-red-500 bg-transparent placeholder:text-slate-300" placeholder="Rp 0" value={inputDiskon} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setInputDiskon(val ? "Rp " + parseInt(val).toLocaleString() : ""); }} />
                            </div>
                        </div>

                        {/* RINGKASAN */}
                        <div className="space-y-1 pt-2">
                            <div className="flex justify-between text-xs text-slate-500 font-medium"><span>Subtotal</span><span>Rp {subtotalMurni.toLocaleString()}</span></div>
                            {nilaiDiskon > 0 && <div className="flex justify-between text-xs text-red-500 font-bold"><span>Diskon</span><span>- Rp {nilaiDiskon.toLocaleString()}</span></div>}
                            {ppnAktif && <div className="flex justify-between text-xs text-slate-500 font-medium"><span>PPN 11%</span><span>Rp {nilaiPPN.toLocaleString()}</span></div>}
                            <div className="flex justify-between text-xl font-black text-slate-800 pt-2 border-t border-slate-200 mt-2"><span>Total</span><span>Rp {totalAkhir.toLocaleString()}</span></div>
                        </div>

                        {/* PEMBAYARAN */}
                        <div className="space-y-3 pt-2">
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setMetodePembayaran('Cash')} className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${metodePembayaran === 'Cash' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Banknote size={16}/> Tunai</button>
                                <button onClick={() => setMetodePembayaran('QRIS')} className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${metodePembayaran === 'QRIS' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><QrCode size={16}/> QRIS</button>
                                <button onClick={() => setMetodePembayaran('Kasbon')} className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${metodePembayaran === 'Kasbon' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><BookUser size={16}/> Kasbon</button>
                            </div>

                            {metodePembayaran === 'Cash' && (
                                <div className="bg-white p-3 rounded-xl border-2 border-green-100 flex items-center gap-2">
                                    <Banknote className="text-green-500" size={20}/>
                                    <input type="text" className="w-full font-black text-lg outline-none text-slate-800 placeholder:text-slate-300" placeholder="Input Uang..." autoFocus
                                        value={inputBayar} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setInputBayar(val ? "Rp " + parseInt(val).toLocaleString() : ""); }} />
                                </div>
                            )}

                            {metodePembayaran === 'Kasbon' && (
                                <div className="bg-white p-3 rounded-xl border-2 border-orange-100 flex items-center gap-2">
                                    <UserCircle className="text-orange-500" size={20}/>
                                    <input type="text" className="w-full font-bold text-sm outline-none text-slate-800 placeholder:text-slate-300" placeholder="Nama Pelanggan (Wajib)" 
                                        value={namaPelangganKasbon} onChange={(e) => setNamaPelangganKasbon(e.target.value)} />
                                </div>
                            )}

                            <button onClick={handleBayarClick} disabled={keranjang.length === 0} 
                                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-300 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {metodePembayaran === 'Kasbon' ? 'Simpan Hutang' : 'Bayar Sekarang'} <ArrowRight size={20}/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}

            {/* KASBON TAB */}
            {activeTab === 'kasbon' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><BookUser size={20} className="text-orange-500"/> Buku Kasbon</h3>
                        <p className="text-xs text-slate-400 mt-1">Kelola hutang pelanggan di sini.</p>
                    </div>
                    <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold border border-orange-100">
                        Total Belum Lunas: Rp {kasbonList.filter(k => k.status === 'Belum Lunas').reduce((a, b) => a + b.total, 0).toLocaleString()}
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-6">Tanggal & ID</th>
                                <th className="p-6">Nama Pelanggan</th>
                                <th className="p-6">Items</th>
                                <th className="p-6">Total Tagihan</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kasbonList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <BookUser size={48} className="opacity-20"/>
                                            <p>Tidak ada data kasbon.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : kasbonList.map(k => (
                                <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-6">
                                        <div className="font-mono text-xs font-bold text-slate-500">{k.id}</div>
                                        <div className="text-xs text-slate-400 mt-1">{k.tanggal}</div>
                                    </td>
                                    <td className="p-6 font-bold text-slate-800 text-base">{k.namaPelanggan}</td>
                                    <td className="p-6 text-xs text-slate-500 max-w-[200px] truncate">
                                        {k.items.map(i => i.nama).join(", ")}
                                    </td>
                                    <td className="p-6 font-black text-slate-700">Rp {k.total.toLocaleString()}</td>
                                    <td className="p-6">
                                        {k.status === 'Lunas' ? (
                                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><CheckCircle2 size={12}/> LUNAS</span>
                                        ) : (
                                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 w-fit"><AlertTriangle size={12}/> BELUM LUNAS</span>
                                        )}
                                    </td>
                                    <td className="p-6 flex justify-center gap-2">
                                        {k.status === 'Belum Lunas' && (
                                            <button 
                                                onClick={() => setShowLunasConfirm({ id: k.id, nama: k.namaPelanggan })}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Coins size={14}/> Lunasi
                                            </button>
                                        )}
                                        {k.status === 'Lunas' && <span className="text-slate-300 text-xs italic">Selesai</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutGrid size={20} className="text-blue-500"/> Stok Produk</h3>
                        <p className="text-xs text-slate-400 mt-1">Kelola stok barang dagangan Anda.</p>
                    </div>
                    <button onClick={() => { setEditId(null); setNewItem({name:"", category:"Sembako", stockPcs:"", pricePcs:"", barcode:""}); setShowAddModal(true); }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2">
                        <PlusCircle size={18}/> Tambah Barang
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4 pl-6">Produk</th>
                                <th className="p-4">Barcode</th>
                                <th className="p-4">Kategori</th>
                                <th className="p-4">Harga</th>
                                <th className="p-4">Stok</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {produkList.map((produk) => (
                                <tr key={produk.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 pl-6 font-bold text-slate-800">{produk.nama}</td>
                                    <td className="p-4 font-mono text-xs bg-slate-100 rounded text-slate-500 w-fit px-2">{produk.barcode || "-"}</td>
                                    <td className="p-4"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-xs font-bold">{produk.kategori}</span></td>
                                    <td className="p-4 font-bold">Rp {produk.hargaEcer.toLocaleString()}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-lg font-bold text-xs ${produk.stok <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{produk.stok} pcs</span></td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => { setEditId(produk.id); setNewItem({name: produk.nama, category: produk.kategori, stockPcs: produk.stok.toString(), pricePcs: produk.hargaEcer.toString(), barcode: produk.barcode}); setShowAddModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16}/></button>
                                        <button onClick={() => clickHapusProduk(produk.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={20} className="text-purple-500"/> Riwayat Transaksi</h3>
                        <p className="text-xs text-slate-400 mt-1">Rekap semua transaksi yang terjadi.</p>
                    </div>
                    <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center gap-2 text-xs">
                        <FileText size={16}/> Download Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-4 pl-6">ID & Tanggal</th>
                                <th className="p-4">Kasir</th>
                                <th className="p-4">Metode</th>
                                <th className="p-4">Items</th>
                                <th className="p-4">Total</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riwayat.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-300 font-bold">Belum ada transaksi</td></tr>
                            ) : riwayat.map((trx) => (
                                <tr key={trx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 pl-6">
                                        <div className="font-mono text-xs font-bold text-slate-500">{trx.id}</div>
                                        <div className="text-[10px] text-slate-400">{trx.tanggal} {trx.waktu}</div>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">{trx.kasir}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                            trx.metodePembayaran === 'QRIS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            trx.metodePembayaran === 'Kasbon' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                            'bg-green-50 text-green-600 border-green-100'}`}>
                                            {trx.metodePembayaran}
                                        </span>
                                        {trx.catatan && <div className="text-[10px] text-slate-400 mt-1">Pel: {trx.catatan}</div>}
                                    </td>
                                    <td className="p-4 text-xs max-w-[200px] truncate text-slate-500">{trx.items.map(i => `${i.nama} (${i.qty})`).join(', ')}</td>
                                    <td className="p-4 font-black text-slate-700">Rp {trx.total.toLocaleString()}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => handleKirimWA(trx)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"><MessageCircle size={16}/></button>
                                        {currentUser?.role === 'admin' && (
                                           <button onClick={() => { setHistoryToDelete(trx.id); setShowDeleteHistoryConfirm(true); }} className="p-2 bg-red-100 text-red-500 rounded-lg hover:bg-red-200 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && currentUser?.role === 'admin' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden max-w-4xl mx-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={20} className="text-blue-500"/> Manajemen Pengguna</h3>
                        <p className="text-xs text-slate-400 mt-1">Tambah atau hapus akses kasir.</p>
                    </div>
                    <button onClick={() => setShowAddUserModal(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-slate-300 transition-all flex items-center gap-2">
                        <UserPlus size={18}/> Tambah User
                    </button>
                </div>
                <div className="p-6 grid gap-4">
                    {dbUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {u.nama.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{u.nama}</h4>
                                    <div className="flex gap-2 text-xs mt-1">
                                        <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">@{u.username}</span>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${u.role==='admin'?'text-purple-600 bg-purple-100':'text-blue-600 bg-blue-100'}`}>{u.role}</span>
                                    </div>
                                </div>
                            </div>
                            {u.id !== currentUser.id && (
                                <button onClick={() => clickDeleteUser(u.id, u.nama)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={20}/></button>
                            )}
                        </div>
                    ))}
                </div>
             </div>
          )}
        </div>
      </main>

      {/* --- MODALS --- */}
      
      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-pop-in">
                <h3 className="font-bold text-xl mb-4 text-slate-800">Tambah User Baru</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="Nama Lengkap" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={newUser.nama} onChange={e => setNewUser({...newUser, nama: e.target.value})}/>
                    <input type="text" placeholder="Username" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}/>
                    <input type="password" placeholder="Password" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
                    <select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none font-bold text-slate-600" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="kasir">Kasir</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowAddUserModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Simpan</button>
                </div>
            </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-pop-in">
                  <h3 className="font-bold text-xl mb-4 text-slate-800 flex items-center gap-2"><KeyRound size={20}/> Ganti Password</h3>
                  <div className="space-y-3">
                      <input type="password" placeholder="Password Lama" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={passForm.oldPass} onChange={e => setPassForm({...passForm, oldPass: e.target.value})}/>
                      <input type="password" placeholder="Password Baru" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={passForm.newPass} onChange={e => setPassForm({...passForm, newPass: e.target.value})}/>
                      <input type="password" placeholder="Konfirmasi Password Baru" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold" value={passForm.confirmPass} onChange={e => setPassForm({...passForm, confirmPass: e.target.value})}/>
                      {passError && <p className="text-red-500 text-xs font-bold text-center">{passError}</p>}
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={() => { setShowPasswordModal(false); setPassError(''); }} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                      <button onClick={handleChangePassword} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-black shadow-lg">Ganti</button>
                  </div>
              </div>
          </div>
      )}

      {/* CONFIRM LUNAS KASBON MODAL */}
      {showLunasConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-pop-in text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Coins size={32} className="text-blue-600"/>
                  </div>
                  <h3 className="font-bold text-lg mb-2">Lunasi Hutang?</h3>
                  <p className="text-slate-500 text-sm mb-6">
                      Apakah pelanggan <b>{showLunasConfirm.nama}</b> sudah membayar lunas tagihannya?
                  </p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowLunasConfirm(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold">Batal</button>
                      <button onClick={() => handleLunasiKasbon(showLunasConfirm.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200">Ya, Lunas</button>
                  </div>
              </div>
          </div>
      )}

      {/* SUCCESS MODALS */}
      {showAddUserSuccess && <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none"><div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce-in flex items-center gap-2"><UserCheck size={20}/> User Berhasil Ditambahkan!</div></div>}
      {showPassSuccess && <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none"><div className="bg-slate-800 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce-in flex items-center gap-2"><KeyRound size={20}/> Password Berhasil Diganti!</div></div>}
      {showSaveSuccess && <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-none"><div className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-xl animate-bounce-in flex items-center gap-2"><CheckCircle2 size={20}/> Produk Disimpan!</div></div>}

      {/* DELETE CONFIRMS */}
      {showDeleteUserConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-pop-in text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><AlertTriangle size={32}/></div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">Hapus User?</h3>
                <p className="text-slate-500 mb-6">Yakin ingin menghapus user <b>{userToDelete?.nama}</b>?</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteUserConfirm(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Batal</button>
                    <button onClick={executeDeleteUser} className="flex-1 bg-red-500 py-3 rounded-xl font-bold text-white hover:bg-red-600 shadow-lg shadow-red-200">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {/* PRODUCT ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-pop-in">
                <h3 className="font-bold text-xl mb-4 text-slate-800">{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                <div className="space-y-3">
                    <div><label className="text-xs font-bold text-slate-400 ml-1">Nama Produk</label><input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Contoh: Kopi Kapal Api"/></div>
                    <div className="flex gap-3">
                        <div className="flex-1"><label className="text-xs font-bold text-slate-400 ml-1">Kategori</label><select className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none" value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})}><option>Sembako</option><option>Makanan</option><option>Minuman</option><option>Rokok</option><option>Obat</option><option>Alat Tulis</option><option>Lainnya</option></select></div>
                        <div className="w-1/3"><label className="text-xs font-bold text-slate-400 ml-1">Stok</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500" value={newItem.stockPcs} onChange={(e) => setNewItem({...newItem, stockPcs: e.target.value})}/></div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-400 ml-1">Harga Jual (Rp)</label><input type="number" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500" value={newItem.pricePcs} onChange={(e) => setNewItem({...newItem, pricePcs: e.target.value})}/></div>
                    <div><label className="text-xs font-bold text-slate-400 ml-1">Barcode (Opsional)</label><div className="flex gap-2"><input type="text" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-blue-500" value={newItem.barcode} onChange={(e) => setNewItem({...newItem, barcode: e.target.value})}/><button className="bg-slate-200 p-3 rounded-xl text-slate-500"><ScanBarcode/></button></div></div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Batal</button>
                    <button onClick={handleSimpanProduk} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Simpan</button>
                </div>
            </div>
        </div>
      )}

      {/* TRANSACTION SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full animate-pop-in overflow-hidden relative">
                <div className="bg-green-500 p-6 text-center text-white relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                    <CheckCircle2 size={48} className="mx-auto relative z-10 mb-2"/>
                    <h2 className="text-2xl font-black relative z-10">Transaksi Sukses!</h2>
                    {lastTrx?.metodePembayaran === 'Kasbon' && <p className="text-white/80 font-bold text-sm relative z-10 mt-1">Dicatat sebagai Hutang</p>}
                </div>
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Transaksi</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">Rp {lastTrx?.total.toLocaleString()}</h3>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 space-y-2">
                        {lastTrx?.metodePembayaran !== 'Kasbon' && (
                           <>
                             <div className="flex justify-between text-sm text-slate-600"><span>Tunai Diterima</span><span className="font-bold">Rp {lastTrx?.bayar.toLocaleString()}</span></div>
                             <div className="flex justify-between text-sm text-green-600"><span>Kembalian</span><span className="font-bold">Rp {lastTrx?.kembali.toLocaleString()}</span></div>
                           </>
                        )}
                        {lastTrx?.metodePembayaran === 'Kasbon' && (
                             <div className="flex justify-between text-sm text-orange-600"><span>Pelanggan</span><span className="font-bold">{lastTrx?.catatan}</span></div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowSuccess(false)} className="py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Tutup</button>
                        <button onClick={() => lastTrx && handleKirimWA(lastTrx)} className="py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"><ReceiptText size={18}/> Struk WA</button>
                    </div>
                </div>
            </div>
        </div>
      )}

       {/* QRIS MODAL */}
       {showQrisModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full animate-pop-in text-center p-6">
                <h3 className="font-bold text-xl text-slate-800 mb-2">Scan QRIS</h3>
                <p className="text-slate-400 text-sm mb-4">Silakan scan kode di bawah ini</p>
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 inline-block mb-4 shadow-inner">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png" alt="QRIS" className="w-48 h-48 object-contain"/>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-6">Rp {totalAkhir.toLocaleString()}</h2>
                <div className="flex gap-3">
                    <button onClick={() => setShowQrisModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Batal</button>
                    <button onClick={executeTransaction} disabled={isLoading} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                        {isLoading ? 'Memproses...' : 'Selesai Bayar'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* WARNING EMPTY CART */}
      {showEmptyWarning && <div className="fixed inset-0 flex items-center justify-center z-[60]" onClick={() => setShowEmptyWarning(false)}><div className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-bold shadow-2xl animate-bounce-in flex flex-col items-center gap-2"><ShoppingCart size={32} className="text-yellow-400"/><p>Keranjang masih kosong!</p><p className="text-xs font-normal text-slate-400">Pilih barang dulu sebelum bayar.</p></div></div>}
    </div>
  );
};

export default App;