import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutGrid, ShoppingCart, History, Search, LayoutDashboard,
  Trash2, CheckCircle2, ReceiptText, PlusCircle, Edit, LogOut, Printer, Eraser, ScanBarcode, TrendingUp, Wallet, ArrowRight, UserCircle, KeyRound, Settings, Users, UserPlus, XCircle, UserCheck, AlertTriangle, Minus, Plus, Download, AlertOctagon, MessageCircle, FileText, Tag, CreditCard, Banknote, QrCode, Coins
} from 'lucide-react';

// --- KONFIGURASI TOKO ---
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_beJfa1EtbhzGt4z7dcWZM2EDGfwtCMZ3Pg&s"; 
const NAMA_TOKO = "TOKO SUDAR";
const QRIS_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png";

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
    bayar: number;     // NEW: Uang yang diterima
    kembali: number;   // NEW: Kembalian
    metodePembayaran: string; 
}
interface UserSession { id: number; username: string; role: 'admin' | 'kasir'; nama: string; }
interface UserData { id: number; username: string; password: string; role: string; nama: string; }

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

  // --- STATE MANAJEMEN USER & PASSWORD ---
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddUserSuccess, setShowAddUserSuccess] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: number, nama: string} | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', nama: '', role: 'kasir' });
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
  
  // --- STATE TRANSAKSI ---
  const [ppnAktif, setPpnAktif] = useState(false);
  const [inputDiskon, setInputDiskon] = useState(""); 
  const [metodePembayaran, setMetodePembayaran] = useState<string>('Cash'); 
  const [inputBayar, setInputBayar] = useState(""); // NEW: State untuk input uang

  // UI States
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

  const nilaiPPN = useMemo(() => {
    return ppnAktif ? Math.round(subtotalSetelahDiskon * 0.11) : 0;
  }, [ppnAktif, subtotalSetelahDiskon]);

  const totalAkhir = subtotalSetelahDiskon + nilaiPPN;

  // --- LOGIKA KEMBALIAN ---
  const nilaiBayar = useMemo(() => {
    if (metodePembayaran === 'QRIS') return totalAkhir; // Jika QRIS, anggap bayar pas
    return parseInt(inputBayar.replace(/\D/g, '')) || 0;
  }, [inputBayar, metodePembayaran, totalAkhir]);

  const nilaiKembalian = useMemo(() => {
    return nilaiBayar - totalAkhir;
  }, [nilaiBayar, totalAkhir]);

  const isKurangBayar = metodePembayaran === 'Cash' && nilaiBayar < totalAkhir;

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
    setPpnAktif(false); 
    setInputDiskon(""); 
    setInputBayar(""); // Reset input bayar
    setMetodePembayaran('Cash');
    setShowPassSuccess(false);
  };

  // --- LOGIKA KIRIM WHATSAPP ---
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
    pesan += `Total: Rp ${trx.total.toLocaleString()}\n`;
    pesan += `Bayar: Rp ${trx.bayar.toLocaleString()}\n`;
    pesan += `Kembali: Rp ${trx.kembali.toLocaleString()}\n`;
    pesan += `--------------------------------\n`;
    pesan += `Terima Kasih sudah berbelanja! 🙏`;

    const encodedPesan = encodeURIComponent(pesan);
    window.open(`https://wa.me/?text=${encodedPesan}`, '_blank');
  };

  // --- LOGIKA USER & EXCEL ---
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

  const handleExportExcel = () => {
    if (riwayat.length === 0) return alert("Belum ada data transaksi untuk diexport.");
    const dataUntukExcel = riwayat.map(trx => ({
        "ID Transaksi": trx.id,
        "Tanggal": trx.tanggal,
        "Waktu": trx.waktu,
        "Kasir": trx.kasir,
        "Metode Bayar": trx.metodePembayaran,
        "Detail Barang": trx.items.map(item => `${item.nama} (${item.qty})`).join(", "),
        "Total": trx.total,
        "Bayar": trx.bayar,
        "Kembali": trx.kembali
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataUntukExcel);
    const wscols = [{wch: 20}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 50}, {wch: 15}, {wch: 15}, {wch: 15}];
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");
    const tanggalHariIni = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Laporan_Transaksi_${tanggalHariIni}.xlsx`);
  };

  // --- LOGIKA POS ---
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

  // --- LOGIKA BAYAR ---
  const handleBayarClick = () => {
      if (keranjang.length === 0) return setShowEmptyWarning(true);
      if (metodePembayaran === 'Cash' && isKurangBayar) return alert("Uang pembayaran kurang!");
      
      if (metodePembayaran === 'QRIS') {
          setShowQrisModal(true);
      } else {
          executeTransaction();
      }
  };

  const executeTransaction = async () => {
    setIsLoading(true);
    setShowQrisModal(false);

    setTimeout(() => {
        const now = new Date();
        const trx: HistoryTransaksi = { 
            id: `INV-${Date.now()}`, 
            kasir: currentUser?.nama || 'Unknown', 
            tanggal: now.toLocaleDateString('id-ID'), 
            waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            items: [...keranjang],
            subtotal: subtotalMurni,
            diskon: nilaiDiskon,
            ppn: nilaiPPN,
            total: totalAkhir,
            bayar: nilaiBayar,      // SIMPAN NILAI BAYAR
            kembali: nilaiKembalian, // SIMPAN KEMBALIAN
            metodePembayaran: metodePembayaran 
        };
        setRiwayat(prev => [trx, ...prev]); 
        setProdukList(prevList => prevList.map(p => { 
            const itemBeli = keranjang.find(k => k.id === p.id);
            return itemBeli ? { ...p, stok: p.stok - itemBeli.qty } : p;
        }));
        setLastTrx(trx);
        setKeranjang([]);
        setPpnAktif(false); 
        setInputDiskon(""); 
        setInputBayar(""); // Reset
        setMetodePembayaran('Cash'); 
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

      {/* STRUK PRINT */}
      <div id="struk-print" className="hidden font-mono text-sm max-w-[80mm] mx-auto bg-white p-4">
        {lastTrx && <div className="text-center">
            <img src={LOGO_URL} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain grayscale" />
            <h2 className="font-bold text-lg">{NAMA_TOKO}</h2>
            <p className="text-xs">{lastTrx.tanggal} {lastTrx.waktu}</p>
            <p className="text-xs">No: {lastTrx.id}</p>
            <p className="text-xs">Kasir: {lastTrx.kasir}</p>
            <p className="text-xs font-bold mt-1">Metode: {lastTrx.metodePembayaran}</p>
            <hr className="border-dashed border-black my-2"/>
            <div className="text-left">{lastTrx.items.map(i => (<div key={i.id} className="flex justify-between"><span>{i.nama} <span className="text-[10px]"><br/>{i.qty} x {i.hargaEcer.toLocaleString()}</span></span><span>{i.subtotal.toLocaleString()}</span></div>))}</div>
            <hr className="border-dashed border-black my-2"/>
            {/* ITEM TOTAL STRUK */}
            <div className="flex justify-between font-bold text-lg border-t border-black mt-1 pt-1"><span>TOTAL</span><span>Rp {lastTrx.total.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs mt-2"><span>Bayar</span><span>Rp {lastTrx.bayar.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs font-bold"><span>Kembali</span><span>Rp {lastTrx.kembali.toLocaleString()}</span></div>
            <p className="text-center text-xs mt-4">Terima Kasih</p>
        </div>}
      </div>

      {/* SIDEBAR */}
      <aside className="w-24 bg-[#0F172A] flex flex-col items-center py-6 gap-4 z-20 no-print shadow-2xl">
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

          {/* DASHBOARD TAB */}
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
                      <div className="flex justify-between items-end mt-2"><p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p><p className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stok > 10 ? 'bg-green-100 text-green-700' : p.stok > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>Stok: {p.stok}</p></div>
                      <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all translate-y-full group-hover:translate-y-0"><div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg"><PlusCircle size={24}/></div></div>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-700">Daftar Produk</h3><button onClick={() => { setEditId(null); setNewItem({ name: "", category: "Sembako", stockPcs: "", pricePcs: "", barcode: "" }); setShowAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95"><PlusCircle size={18}/> Tambah Produk</button></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-600"><thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs"><tr><th className="p-6">Nama</th><th className="p-6">Kategori</th><th className="p-6">Harga</th><th className="p-6 text-center">Stok</th><th className="p-6 text-center">Aksi</th></tr></thead><tbody>{filteredProduk.map(p => (<tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td className="p-6 font-bold text-slate-700">{p.nama}<br/><span className="text-[10px] text-slate-400 font-normal">{p.barcode}</span></td><td className="p-6"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">{p.kategori}</span></td><td className="p-6 font-bold">Rp {p.hargaEcer.toLocaleString()}</td><td className="p-6 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold ${p.stok <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{p.stok}</span></td><td className="p-6 flex justify-center gap-2"><button onClick={() => { setEditId(p.id); setNewItem({ name: p.nama, category: p.kategori, stockPcs: p.stok.toString(), pricePcs: p.hargaEcer.toString(), barcode: p.barcode }); setShowAddModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button><button onClick={() => clickHapusProduk(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-700">Riwayat Transaksi</h3><div className="flex gap-2"><button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-green-200 flex items-center gap-2"><Download size={16}/> Export Excel</button>{currentUser.role === 'admin' && (<button onClick={hapusSemuaRiwayat} className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"><Trash2 size={16}/> Reset</button>)}</div></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm text-slate-600"><thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs"><tr><th className="p-6">ID</th><th className="p-6">Waktu</th><th className="p-6">Metode</th><th className="p-6">Total</th><th className="p-6">Bayar/Kembali</th><th className="p-6 text-center">Aksi</th></tr></thead><tbody>{riwayat.map(t => (<tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"><td className="p-6 font-mono text-xs font-bold text-slate-500">{t.id}</td><td className="p-6"><div className="font-bold text-slate-700">{t.tanggal}</div><div className="text-xs text-slate-400">{t.waktu}</div></td><td className="p-6"><span className={`px-2 py-1 rounded text-xs font-bold ${t.metodePembayaran === 'QRIS' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{t.metodePembayaran}</span></td><td className="p-6 font-black text-slate-800 text-base">Rp {t.total.toLocaleString()}</td><td className="p-6 text-xs"><div className="text-green-600">In: Rp {t.bayar.toLocaleString()}</div><div className="text-orange-500">Out: Rp {t.kembali.toLocaleString()}</div></td><td className="p-6 flex justify-center gap-2"><button onClick={() => { setLastTrx(t); setTimeout(() => window.print(), 100); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Print Ulang"><Printer size={16}/></button><button onClick={() => handleKirimWA(t)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Kirim WA"><MessageCircle size={16}/></button>{currentUser.role === 'admin' && (<button onClick={() => clickHapusSatuRiwayat(t.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>)}</td></tr>))}</tbody></table></div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && currentUser.role === 'admin' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="font-bold text-slate-700">Manajemen Pengguna</h3><button onClick={() => setShowAddUserModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2"><UserPlus size={18}/> Tambah User</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {dbUsers.map(user => (
                        <div key={user.id} className="border border-slate-200 rounded-2xl p-6 flex items-center justify-between group hover:border-blue-300 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>{user.nama.charAt(0)}</div>
                                <div><h4 className="font-bold text-slate-700">{user.nama}</h4><p className="text-xs text-slate-400 font-bold uppercase">{user.role}</p></div>
                            </div>
                            <button onClick={() => clickDeleteUser(user.id, user.nama)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
             </div>
          )}
        </main>
        
        {/* CHECKOUT SIDEBAR (KANAN) */}
        {activeTab === 'pos' && (
            <aside className="w-96 bg-white border-l border-slate-100 flex flex-col z-10 shadow-xl">
                <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> Keranjang</h2></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {keranjang.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4"><ShoppingCart size={64} className="opacity-20"/><p className="font-bold text-sm">Keranjang Kosong</p></div>
                    ) : (
                        keranjang.map(item => (
                            <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                <div className="flex-1"><h4 className="font-bold text-slate-700 text-sm line-clamp-1">{item.nama}</h4><p className="text-xs text-slate-400 mt-1">Rp {item.hargaEcer.toLocaleString()}</p></div>
                                <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm ml-2">
                                    <button onClick={() => kurangiQty(item.id)} className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold text-sm transition-colors"><Minus size={14}/></button>
                                    <span className="font-black text-sm w-4 text-center">{item.qty}</span>
                                    <button onClick={() => tambahKeKeranjang(item)} className="w-6 h-6 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded text-blue-600 font-bold text-sm transition-colors"><Plus size={14}/></button>
                                </div>
                                <button onClick={() => hapusItemKeranjang(item.id)} className="ml-2 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        ))
                    )}
                </div>

                {/* AREA PEMBAYARAN DI KANAN BAWAH */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
                    <div className="space-y-2 text-sm text-slate-600">
                        <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">Rp {subtotalMurni.toLocaleString()}</span></div>
                        
                        {/* INPUT DISKON */}
                        <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><Tag size={14}/> Diskon (Rp)</span>
                            <input 
                                type="text" 
                                className="w-32 text-right p-1 rounded border border-slate-300 text-sm font-bold text-red-500 focus:outline-none focus:border-red-500 bg-white"
                                placeholder="0"
                                value={inputDiskon}
                                onChange={(e) => setInputDiskon(e.target.value)}
                            />
                        </div>
                        
                        {/* CHECKBOX PPN */}
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setPpnAktif(!ppnAktif)}>
                            <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${ppnAktif ? 'bg-blue-600 border-blue-600' : 'border-slate-400 bg-white'}`}>{ppnAktif && <CheckCircle2 size={12} className="text-white"/>}</div><span>PPN 11%</span></div>
                            <span className="font-bold">+ Rp {nilaiPPN.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* PILIHAN METODE PEMBAYARAN */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button onClick={() => setMetodePembayaran('Cash')} className={`py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodePembayaran === 'Cash' ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            <Banknote size={16}/> Cash
                        </button>
                        <button onClick={() => setMetodePembayaran('QRIS')} className={`py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodePembayaran === 'QRIS' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            <QrCode size={16}/> QRIS/TF
                        </button>
                    </div>

                    {/* INPUT UANG DITERIMA (KHUSUS CASH) */}
                    {metodePembayaran === 'Cash' && (
                        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Banknote size={14}/> Uang Diterima</span>
                                {isKurangBayar && inputBayar !== "" && <span className="text-xs text-red-500 font-bold">Kurang!</span>}
                            </div>
                            <input 
                                type="text" 
                                className={`w-full text-right text-lg font-black outline-none border-b-2 p-1 ${isKurangBayar ? 'border-red-500 text-red-600' : 'border-slate-200 text-slate-800 focus:border-blue-500'}`}
                                placeholder="0"
                                value={inputBayar}
                                onChange={(e) => setInputBayar(e.target.value)}
                            />
                            {nilaiBayar > 0 && (
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-slate-200">
                                    <span className="text-xs font-bold text-slate-500">Kembalian</span>
                                    <span className={`font-black ${nilaiKembalian < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        Rp {nilaiKembalian.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="border-t border-dashed border-slate-300 pt-3">
                        <div className="flex justify-between items-end mb-4"><span className="font-bold text-slate-800">Total Akhir</span><span className="font-black text-2xl text-blue-600">Rp {totalAkhir.toLocaleString()}</span></div>
                        <button 
                            onClick={handleBayarClick} 
                            disabled={keranjang.length === 0 || isLoading || (metodePembayaran === 'Cash' && isKurangBayar)} 
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black shadow-lg shadow-blue-200 flex justify-center items-center gap-2 transition-all active:scale-95"
                        >
                            {isLoading ? 'Memproses...' : 'BAYAR SEKARANG'}
                        </button>
                    </div>
                </div>
            </aside>
        )}
      </div>

      {/* MODAL QRIS PAYMENT (BARU) */}
      {showQrisModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-pop-in relative overflow-hidden text-center">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-600"></div>
                  <h3 className="text-xl font-black text-slate-800 mb-2 mt-2">Scan untuk Bayar</h3>
                  <p className="text-slate-500 text-sm mb-6">Silakan scan QR Code di bawah ini</p>
                  
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-inner mb-6 inline-block">
                      <img src={QRIS_IMAGE_URL} alt="QRIS Code" className="w-48 h-48 object-contain mx-auto" />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-2xl mb-6">
                      <p className="text-xs text-blue-600 font-bold uppercase mb-1">Total Pembayaran</p>
                      <p className="text-3xl font-black text-blue-700">Rp {totalAkhir.toLocaleString()}</p>
                  </div>

                  <div className="flex gap-3">
                      <button onClick={() => setShowQrisModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold transition-colors">Batal</button>
                      <button onClick={executeTransaction} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-colors">Sudah Masuk</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODALS LAINNYA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-pop-in">
                <h3 className="text-2xl font-black text-slate-800 mb-6">{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nama Produk</label><input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Kategori</label><select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}><option>Sembako</option><option>Makanan</option><option>Minuman</option><option>Snack</option><option>Rokok</option><option>Obat</option><option>Lainnya</option></select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Barcode</label><input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Stok</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.stockPcs} onChange={e => setNewItem({...newItem, stockPcs: e.target.value})}/></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Harga Jual</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500" value={newItem.pricePcs} onChange={e => setNewItem({...newItem, pricePcs: e.target.value})}/></div>
                    </div>
                    <div className="flex gap-3 mt-6"><button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold">Batal</button><button onClick={handleSimpanProduk} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200">Simpan</button></div>
                </div>
            </div>
        </div>
      )}

      {/* POPUP SUKSES BAYAR (DENGAN KEMBALIAN) */}
      {showSuccess && lastTrx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center max-w-sm w-full animate-pop-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={48} className="text-green-600"/></div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Pembayaran Sukses!</h3>
                <div className="bg-slate-50 p-4 rounded-xl mb-6 space-y-2">
                    <div className="flex justify-between text-sm text-slate-500"><span>Total Tagihan</span><span className="font-bold text-slate-800">Rp {lastTrx.total.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm text-slate-500"><span>Uang Diterima</span><span className="font-bold text-slate-800">Rp {lastTrx.bayar.toLocaleString()}</span></div>
                    <div className="border-t border-dashed border-slate-300 my-2"></div>
                    <div className="flex justify-between text-lg font-black text-green-600"><span>Kembalian</span><span>Rp {lastTrx.kembali.toLocaleString()}</span></div>
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={() => { window.print(); setShowSuccess(false); }} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"><Printer size={20}/> Cetak Struk</button>
                    <button onClick={() => { handleKirimWA(lastTrx); setShowSuccess(false); }} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"><MessageCircle size={20}/> Kirim WhatsApp</button>
                    <button onClick={() => setShowSuccess(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl font-bold">Tutup</button>
                </div>
            </div>
        </div>
      )}

      {/* NOTIFIKASI KECIL */}
      {showAddUserModal && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-pop-in"><h3 className="text-xl font-black text-slate-800 mb-4">Tambah User Baru</h3><div className="space-y-3"><input type="text" placeholder="Nama Lengkap" className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={newUser.nama} onChange={e=>setNewUser({...newUser, nama: e.target.value})}/><input type="text" placeholder="Username" className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})}/><input type="password" placeholder="Password" className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})}/><select className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})}><option value="kasir">Kasir</option><option value="admin">Admin</option></select></div><div className="flex gap-3 mt-6"><button onClick={()=>setShowAddUserModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button><button onClick={handleAddUser} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Simpan</button></div></div></div>)}
      {showPasswordModal && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-pop-in"><h3 className="text-xl font-black text-slate-800 mb-4">Ganti Password</h3><div className="space-y-3"><input type="password" placeholder="Password Lama" className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={passForm.oldPass} onChange={e=>setPassForm({...passForm, oldPass: e.target.value})}/><input type="password" placeholder="Password Baru" className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={passForm.newPass} onChange={e=>setPassForm({...passForm, newPass: e.target.value})}/><input type="password" placeholder="Konfirmasi Password" className="w-full bg-slate-50 border p-3 rounded-xl font-bold outline-none" value={passForm.confirmPass} onChange={e=>setPassForm({...passForm, confirmPass: e.target.value})}/>{passError && <p className="text-red-500 text-xs font-bold">{passError}</p>}</div><div className="flex gap-3 mt-6"><button onClick={()=>setShowPasswordModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button><button onClick={handleChangePassword} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Simpan</button></div></div></div>)}
      {showEmptyWarning && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><AlertTriangle size={48} className="mx-auto text-orange-500 mb-4"/><h3 className="font-bold text-lg mb-2">Keranjang Kosong!</h3><p className="text-slate-500 text-sm mb-6">Silakan pilih produk terlebih dahulu.</p><button onClick={() => setShowEmptyWarning(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold w-full">OK</button></div></div>)}
      {showSaveSuccess && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><CheckCircle2 size={48} className="mx-auto text-green-500 mb-4"/><h3 className="font-bold text-lg mb-6">Data Berhasil Disimpan!</h3><button onClick={() => setShowSaveSuccess(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold w-full">OK</button></div></div>)}
      {showPassSuccess && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><CheckCircle2 size={48} className="mx-auto text-green-500 mb-4"/><h3 className="font-bold text-lg mb-6">Password Berhasil Diganti!</h3><button onClick={() => setShowPassSuccess(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold w-full">OK</button></div></div>)}
      {showAddUserSuccess && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><CheckCircle2 size={48} className="mx-auto text-green-500 mb-4"/><h3 className="font-bold text-lg mb-6">User Berhasil Ditambah!</h3><button onClick={() => setShowAddUserSuccess(false)} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold w-full">OK</button></div></div>)}
      {showDeleteConfirm && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><Trash2 size={48} className="mx-auto text-red-500 mb-4"/><h3 className="font-bold text-lg mb-2">Hapus Produk?</h3><p className="text-slate-500 text-sm mb-6">Tindakan ini tidak bisa dibatalkan.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Batal</button><button onClick={executeDeleteProduk} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Hapus</button></div></div></div>)}
      {showDeleteHistoryConfirm && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><Trash2 size={48} className="mx-auto text-red-500 mb-4"/><h3 className="font-bold text-lg mb-2">Hapus Riwayat?</h3><p className="text-slate-500 text-sm mb-6">Data transaksi akan hilang permanen.</p><div className="flex gap-3"><button onClick={() => setShowDeleteHistoryConfirm(false)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Batal</button><button onClick={executeDeleteHistory} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Hapus</button></div></div></div>)}
      {showDeleteUserConfirm && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs text-center animate-pop-in"><Trash2 size={48} className="mx-auto text-red-500 mb-4"/><h3 className="font-bold text-lg mb-2">Hapus User?</h3><p className="text-slate-500 text-sm mb-6">Akun <b>{userToDelete?.nama}</b> akan dihapus.</p><div className="flex gap-3"><button onClick={() => setShowDeleteUserConfirm(false)} className="flex-1 bg-slate-100 py-2 rounded-xl font-bold">Batal</button><button onClick={executeDeleteUser} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Hapus</button></div></div></div>)}
    </div>
  );
};

export default App;