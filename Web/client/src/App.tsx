import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutGrid, ShoppingCart, History, Search, LayoutDashboard,
  Trash2, CheckCircle2, ReceiptText, PlusCircle, Edit, LogOut, Eraser, ScanBarcode, Wallet, ArrowRight, UserCircle, KeyRound, Users, UserPlus, AlertTriangle, BookUser, Banknote, Tag, MessageCircle, Calendar, Phone, Printer, FileText, Download
} from 'lucide-react';

// --- KONFIGURASI TOKO ---
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_beJfa1EtbhzGt4z7dcWZM2EDGfwtCMZ3Pg&s"; 
const NAMA_TOKO = "TOKO SUDAR";
const ALAMAT_TOKO = "Jl. Raya Makmur No. 123";
const TELP_TOKO = "0812-3456-7890";

// --- DATA AWAL ---
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
    id: string; kasir: string; tanggal: string; waktu: string; 
    items: ItemKeranjang[]; subtotal: number; diskon: number; ppn: number;      
    total: number; bayar: number; kembali: number; metodePembayaran: string; catatan?: string; 
}
interface UserSession { id: number; username: string; role: 'admin' | 'kasir'; nama: string; }
interface UserData { id: number; username: string; password: string; role: string; nama: string; }
interface KasbonData {
    id: string; 
    tanggal: string;
    namaPelanggan: string;
    nomorHP: string;
    jatuhTempo: string;
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

  // --- STATE UTAMA ---
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
  const [nomorHPKasbon, setNomorHPKasbon] = useState(""); 
  const [jatuhTempoKasbon, setJatuhTempoKasbon] = useState(""); 
  const [showLunasConfirm, setShowLunasConfirm] = useState<{id: string, nama: string} | null>(null);
  const [showDeleteKasbonConfirm, setShowDeleteKasbonConfirm] = useState<string | null>(null);

  // --- STATE RIWAYAT ---
  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>(() => {
    try {
        const saved = localStorage.getItem('db_riwayat');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState<string | null>(null);

  // --- POS STATE ---
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [barcodeInput, setBarcodeInput] = useState("");
  
  const [ppnAktif, setPpnAktif] = useState(false);
  const [inputDiskon, setInputDiskon] = useState(""); 
  const [metodePembayaran, setMetodePembayaran] = useState<string>('Cash'); 
  const [inputBayar, setInputBayar] = useState(""); 

  // --- MODALS STATE ---
  const [showKasbonWarning, setShowKasbonWarning] = useState(false);
  const [kasbonWarningMsg, setKasbonWarningMsg] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: number, nama: string} | null>(null);
  
  const [newUser, setNewUser] = useState({ username: '', password: '', nama: '', role: 'kasir' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showKurangBayarModal, setShowKurangBayarModal] = useState(false);
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
  const isKurangBayar = useMemo(() => metodePembayaran === 'Cash' && nilaiBayar < totalAkhir, [metodePembayaran, nilaiBayar, totalAkhir]);

  const uniqueCategories = useMemo(() => ['Semua', ...new Set(produkList.map(item => item.kategori))], [produkList]);
  const filteredProduk = useMemo(() => produkList.filter(p => (selectedCategory === 'Semua' || p.kategori === selectedCategory) && p.nama.toLowerCase().includes(search.toLowerCase())), [produkList, search, selectedCategory]);

  // --- EFFECT ---
  useEffect(() => { localStorage.setItem('db_produk', JSON.stringify(produkList)); }, [produkList]);
  useEffect(() => { localStorage.setItem('db_riwayat', JSON.stringify(riwayat)); }, [riwayat]);
  useEffect(() => { localStorage.setItem('db_users', JSON.stringify(dbUsers)); }, [dbUsers]);
  useEffect(() => { localStorage.setItem('db_kasbon', JSON.stringify(kasbonList)); }, [kasbonList]);
  useEffect(() => { if (activeTab === 'pos' && barcodeInputRef.current) barcodeInputRef.current.focus(); }, [activeTab]);
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kasir_session', JSON.stringify(currentUser));
      if (currentUser.role === 'kasir') setActiveTab('pos');
      else if (currentUser.role === 'admin') setActiveTab('dashboard');
    } else { localStorage.removeItem('kasir_session'); }
  }, [currentUser]);

  useEffect(() => {
    if (metodePembayaran === 'Kasbon') {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        setJatuhTempoKasbon(date.toISOString().split('T')[0]);
    }
  }, [metodePembayaran]);

  // --- FUNCTIONS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = dbUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser({ id: user.id, username: user.username, role: user.role as 'admin'|'kasir', nama: user.nama });
      setLoginError(''); setLoginForm({ username: '', password: '' });
    } else { setLoginError('Username atau Password Salah!'); }
  };

  const handleLogout = () => {
    setCurrentUser(null); setKeranjang([]); setPpnAktif(false); setInputDiskon(""); setInputBayar(""); setMetodePembayaran('Cash');
  };

  // --- PRINT STRUK (THERMAL) ---
  const handlePrintStruk = (trx: HistoryTransaksi) => {
    const printWindow = window.open('', '', 'width=350,height=600');
    if (!printWindow) return alert("Pop-up blocked!");

    const itemsHtml = trx.items.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <span style="font-size: 12px;">${item.nama} x${item.qty}</span>
        <span style="font-size: 12px; font-weight: bold;">${(item.hargaEcer * item.qty).toLocaleString()}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk - ${trx.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 10px; width: 58mm; margin: 0 auto; color: #000; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .logo-img { width: 50px; height: 50px; object-fit: contain; margin-bottom: 5px; filter: grayscale(100%); } 
            .items { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .totals { text-align: right; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            h2 { margin: 0; font-size: 16px; font-weight: bold; }
            p { margin: 2px 0; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${LOGO_URL}" class="logo-img" alt="Logo" />
            <h2>${NAMA_TOKO}</h2>
            <p>${ALAMAT_TOKO}</p>
            <p>${TELP_TOKO}</p>
            <p style="margin-top:5px;">${trx.id}</p>
            <p>${trx.tanggal} ${trx.waktu}</p>
            <p>Kasir: ${trx.kasir}</p>
          </div>
          <div class="items">
            ${itemsHtml}
          </div>
          <div class="totals">
             ${trx.diskon > 0 ? `<p>Diskon: -${trx.diskon.toLocaleString()}</p>` : ''}
             ${trx.ppn > 0 ? `<p>PPN 11%: ${trx.ppn.toLocaleString()}</p>` : ''}
             <p style="font-size: 14px; font-weight: bold; margin-top:5px;">TOTAL: ${trx.total.toLocaleString()}</p>
             <p>Bayar: ${trx.bayar.toLocaleString()}</p>
             <p>Kembali: ${trx.kembali.toLocaleString()}</p>
             <p>Metode: ${trx.metodePembayaran}</p>
          </div>
          <div class="footer">
            <p>Terima Kasih</p>
            <p>Barang yang dibeli tidak dapat ditukar</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- WA FORMAT ---
  const handleKirimWA = (trx: HistoryTransaksi) => {
    let pesan = `*STRUK BELANJA - ${NAMA_TOKO}*\n`;
    pesan += `No: ${trx.id}\n`;
    pesan += `Tanggal: ${trx.tanggal} ${trx.waktu}\n`;
    pesan += `Kasir: ${trx.kasir}\n`;
    const namaPelanggan = trx.catatan ? trx.catatan : "Umum";
    pesan += `Pelanggan: ${namaPelanggan}\n`;
    pesan += `--------------------------------\n`;

    trx.items.forEach(item => {
        pesan += `${item.nama}\n`;
        pesan += `${item.qty} x ${item.hargaEcer.toLocaleString()} = ${item.subtotal.toLocaleString()}\n`;
    });

    pesan += `--------------------------------\n`;
    pesan += `Subtotal: Rp ${trx.subtotal.toLocaleString()}\n`;
    if(trx.diskon > 0) pesan += `Diskon: - Rp ${trx.diskon.toLocaleString()}\n`;
    if(trx.ppn > 0) pesan += `PPN (11%): Rp ${trx.ppn.toLocaleString()}\n`;
    pesan += `--------------------------------\n`;
    pesan += `*Total: Rp ${trx.total.toLocaleString()}*\n`;
    
    if (trx.metodePembayaran === 'Kasbon') {
        pesan += `Status: HUTANG / KASBON\n`;
    } else if (trx.metodePembayaran === 'QRIS') {
        pesan += `Status: LUNAS (QRIS)\n`;
    } else {
        pesan += `Status: LUNAS (TUNAI)\n`;
    }

    pesan += `--------------------------------\n`;
    pesan += `Terima Kasih! 🙏`;

    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  const handleTagihHutangWA = (kasbon: KasbonData) => {
      let phone = kasbon.nomorHP.replace(/\D/g,'');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      const jatuhTempoIndo = new Date(kasbon.jatuhTempo).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
      const pesan = `Halo Kak *${kasbon.namaPelanggan}*,\n\nKami dari *${NAMA_TOKO}* ingin mengingatkan bahwa tagihan kasbon sebesar *Rp ${kasbon.total.toLocaleString()}* akan/sudah jatuh tempo pada:\n📅 *${jatuhTempoIndo}*\n\nMohon segera melakukan pembayaran ya kak agar bisa belanja kembali.\n\nTerima kasih! 🙏`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  const checkIsOverdue = (dateString: string) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const dueDate = new Date(dateString);
      return today > dueDate;
  };

  // --- EXPORT HISTORY EXCEL ---
  const handleExportHistory = () => {
    if (riwayat.length === 0) return alert("Belum ada data.");
    const data = riwayat.flatMap(t => t.items.map(item => ({ "ID": t.id, "Tgl": t.tanggal, "Kasir": t.kasir, "Item": item.nama, "Harga": item.hargaEcer, "Qty": item.qty, "Subtotal": item.subtotal, "Total Trx": t.total, "Metode": t.metodePembayaran })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.xlsx`);
  };

  // --- EXPORT KASBON EXCEL (NEW FEATURE) ---
  const handleExportKasbon = () => {
      if (kasbonList.length === 0) return alert("Belum ada data kasbon.");
      
      const data = kasbonList.map(k => ({
          "ID Transaksi": k.id,
          "Tanggal": k.tanggal,
          "Nama Pelanggan": k.namaPelanggan,
          "Nomor HP": k.nomorHP,
          "Jatuh Tempo": k.jatuhTempo,
          "Total Hutang": k.total,
          "Status": k.status,
          "Detail Barang": k.items.map(i => `${i.nama} (${i.qty})`).join(', ')
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Kasbon");
      XLSX.writeFile(wb, `Backup_Kasbon_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };

  const handleDeleteHistory = () => {
      if (!showDeleteHistoryConfirm) return;
      setRiwayat(prev => prev.filter(trx => trx.id !== showDeleteHistoryConfirm));
      setShowDeleteHistoryConfirm(null);
  };

  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok Habis!");
    setKeranjang(prev => {
        const item = prev.find(k => k.id === produk.id);
        if (item && item.qty + 1 > produk.stok) { alert("Stok kurang!"); return prev; }
        return item ? prev.map(k => k.id === produk.id ? { ...k, qty: k.qty + 1, subtotal: (k.qty + 1) * k.hargaEcer } : k) : [...prev, { ...produk, qty: 1, subtotal: produk.hargaEcer }];
    });
  };

  const kurangiQty = (id: number) => {
    setKeranjang(prev => {
        const item = prev.find(k => k.id === id);
        return item && item.qty > 1 ? prev.map(k => k.id === id ? { ...k, qty: k.qty - 1, subtotal: (k.qty - 1) * k.hargaEcer } : k) : prev.filter(k => k.id !== id);
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
      if (metodePembayaran === 'Cash' && isKurangBayar) return setShowKurangBayarModal(true);
      if (metodePembayaran === 'Kasbon') {
          if (!namaPelangganKasbon.trim() || !jatuhTempoKasbon || !nomorHPKasbon.trim()) {
              setKasbonWarningMsg("Mohon lengkapi Nama, Tanggal & No WA!");
              setShowKasbonWarning(true); return;
          }
      }
      executeTransaction();
  };

  const executeTransaction = async () => {
    setIsLoading(true); 
    setTimeout(() => {
        const now = new Date();
        const trxId = `INV-${Date.now()}`;
        
        const namaPelanggan = metodePembayaran === 'Kasbon' ? namaPelangganKasbon : "";

        const trx: HistoryTransaksi = { 
            id: trxId, kasir: currentUser?.nama || 'Unknown', 
            tanggal: now.toLocaleDateString('id-ID'), waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            items: [...keranjang], subtotal: subtotalMurni, diskon: nilaiDiskon, ppn: nilaiPPN, total: totalAkhir,
            bayar: nilaiBayar, kembali: nilaiKembalian, metodePembayaran,
            catatan: namaPelanggan 
        };

        if (metodePembayaran === 'Kasbon') {
            const newKasbon: KasbonData = {
                id: trxId, tanggal: trx.tanggal, 
                namaPelanggan: namaPelangganKasbon, nomorHP: nomorHPKasbon, jatuhTempo: jatuhTempoKasbon,
                total: totalAkhir, status: 'Belum Lunas', items: [...keranjang]
            };
            setKasbonList(prev => [newKasbon, ...prev]);
        }

        setRiwayat(prev => [trx, ...prev]); 
        setProdukList(prev => prev.map(p => { 
            const item = keranjang.find(k => k.id === p.id);
            return item ? { ...p, stok: p.stok - item.qty } : p;
        }));
        
        setLastTrx(trx); setKeranjang([]); setPpnAktif(false); setInputDiskon(""); setInputBayar(""); 
        setNamaPelangganKasbon(""); setNomorHPKasbon(""); setJatuhTempoKasbon(""); 
        setMetodePembayaran('Cash'); setIsLoading(false); setShowSuccess(true);
    }, 800);
  };

  const handleLunasiKasbon = (id: string) => {
      setKasbonList(prev => prev.map(k => k.id === id ? { ...k, status: 'Lunas' } : k));
      setShowLunasConfirm(null);
  };

  const handleDeleteKasbon = () => {
      if (!showDeleteKasbonConfirm) return;
      setKasbonList(prev => prev.filter(k => k.id !== showDeleteKasbonConfirm));
      setShowDeleteKasbonConfirm(null);
  };

  const handleSimpanProduk = () => {
    const productData = { nama: newItem.name, kategori: newItem.category, stok: parseInt(newItem.stockPcs)||0, hargaEcer: parseInt(newItem.pricePcs)||0, barcode: newItem.barcode };
    if (editId) { setProdukList(produkList.map(p => p.id === editId ? { ...p, ...productData } : p)); } 
    else { const newId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1; setProdukList([...produkList, { id: newId, ...productData }]); }
    setShowAddModal(false); setShowSaveSuccess(true);
  };

  const getButtonBayarClass = () => {
      if (keranjang.length === 0) return 'bg-slate-300 cursor-not-allowed';
      if (metodePembayaran === 'QRIS') return 'bg-blue-600 hover:bg-blue-700';
      if (metodePembayaran === 'Kasbon') return 'bg-slate-900 hover:bg-slate-800';
      if (nilaiBayar < totalAkhir) return 'bg-red-600 hover:bg-red-700 animate-pulse'; 
      return 'bg-green-600 hover:bg-green-700';
  };

  const stats = useMemo(() => {
    const totalOmset = riwayat.reduce((acc, curr) => acc + curr.total, 0);
    const chartData = [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toLocaleDateString('id-ID');
        return { date: dateStr.split('/')[0], total: riwayat.filter(r => r.tanggal === dateStr).reduce((acc, curr) => acc + curr.total, 0) }; 
    }).reverse();
    const maxOmset = Math.max(...chartData.map(d => d.total), 100000); 
    const kasbonBelumLunas = kasbonList.filter(k => k.status === 'Belum Lunas').reduce((a,b)=>a+b.total,0);
    return { totalOmset, totalTransaksi: riwayat.length, itemsTerjual: riwayat.reduce((acc, curr) => acc + curr.items.reduce((a, b) => a + b.qty, 0), 0), chartData, maxOmset, kasbonBelumLunas };
  }, [riwayat, kasbonList]);

  // --- RENDER ---
  if (!currentUser) return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-200 font-sans p-4">
      <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm">
        <div className="text-center mb-6">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-3"><img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain"/></div>
            <h1 className="text-2xl font-black text-slate-800">Login Sistem</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" className="w-full bg-slate-50 border p-3 rounded-xl font-bold" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})}/>
            <input type="password" className="w-full bg-slate-50 border p-3 rounded-xl font-bold" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}/>
            {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold shadow-lg">MASUK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-24 bg-slate-900 text-white flex flex-col items-center py-6 gap-2 shadow-2xl z-20">
        <div className="mb-6 p-2 bg-white/10 rounded-2xl"><img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain"/></div>
        {currentUser?.role === 'admin' && <button onClick={() => setActiveTab('dashboard')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={24}/><span className="text-[10px] font-bold">Dash</span></button>}
        {currentUser?.role === 'kasir' && <button onClick={() => setActiveTab('pos')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'pos' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><ShoppingCart size={24}/><span className="text-[10px] font-bold">Kasir</span></button>}
        {currentUser?.role === 'admin' && <button onClick={() => setActiveTab('kasbon')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'kasbon' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><BookUser size={24}/><span className="text-[10px] font-bold">Kasbon</span></button>}
        {currentUser?.role === 'admin' && <button onClick={() => setActiveTab('inventory')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'inventory' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutGrid size={24}/><span className="text-[10px] font-bold">Produk</span></button>}
        <button onClick={() => setActiveTab('history')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'history' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><History size={24}/><span className="text-[10px] font-bold">Riwayat</span></button>
        {currentUser?.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`p-4 rounded-2xl w-full flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'users' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}><Users size={24}/><span className="text-[10px] font-bold">Users</span></button>}
        <div className="mt-auto flex flex-col gap-2 w-full px-2">
            <button onClick={() => setShowPasswordModal(true)} className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700"><KeyRound size={20} className="mx-auto"/></button>
            <button onClick={handleLogout} className="p-3 rounded-xl bg-red-900/50 text-red-400 hover:bg-red-600"><LogOut size={20} className="mx-auto"/></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
             {activeTab === 'dashboard' && <><LayoutDashboard className="text-blue-600"/> Dashboard</>}
             {activeTab === 'pos' && <><ShoppingCart className="text-blue-600"/> Kasir</>}
             {activeTab === 'kasbon' && <><BookUser className="text-blue-600"/> Data Kasbon & Penagihan</>}
             {activeTab === 'inventory' && <><LayoutGrid className="text-blue-600"/> Stok Produk</>}
             {activeTab === 'history' && <><History className="text-blue-600"/> Riwayat Transaksi</>}
          </h2>
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block"><p className="text-xs text-slate-400 font-bold uppercase">Login sebagai</p><p className="font-bold text-slate-800">{currentUser?.nama}</p></div>
             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-black border-2 border-blue-200">{currentUser?.username.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* --- DASHBOARD --- */}
          {activeTab === 'dashboard' && currentUser?.role === 'admin' && (
            <div className="space-y-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-white/20 rounded-2xl"><Wallet size={24}/></div></div>
                        <p className="text-sm opacity-80 font-medium">Total Omset</p>
                        <h3 className="text-3xl font-black mt-1">Rp {stats.totalOmset.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><AlertTriangle size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold">Total Piutang (Kasbon)</p>
                        <h3 className="text-3xl font-black text-orange-600 mt-1">Rp {stats.kasbonBelumLunas.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Tag size={24}/></div></div>
                        <p className="text-sm text-slate-400 font-bold">Item Terjual</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.itemsTerjual}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-64 flex items-end justify-between gap-2">
                     {stats.chartData.map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                             <div className="w-full bg-blue-100 rounded-t-xl relative group-hover:bg-blue-200" style={{ height: `${(d.total / stats.maxOmset) * 100}%` }}></div>
                             <span className="text-xs font-bold text-slate-400">{d.date}</span>
                        </div>
                     ))}
                </div>
            </div>
          )}

          {/* --- POS (KASIR) --- */}
          {activeTab === 'pos' && currentUser?.role === 'kasir' && (
            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex gap-3 bg-white">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Cari barang..." className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl font-bold outline-none" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <form onSubmit={handleScanBarcode} className="relative w-1/3">
                            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input ref={barcodeInputRef} type="text" placeholder="Scan Barcode" className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-blue-100 rounded-xl font-bold text-blue-800 outline-none" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} />
                        </form>
                    </div>
                    <div className="flex gap-2 p-2 overflow-x-auto border-b border-slate-50 scrollbar-hide">
                        {uniqueCategories.map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProduk.map((produk) => (
                            <button key={produk.id} onClick={() => tambahKeKeranjang(produk)} disabled={produk.stok === 0} className={`bg-white p-4 rounded-2xl border text-left flex flex-col justify-between h-32 shadow-sm ${produk.stok === 0 ? 'opacity-50 grayscale' : 'hover:border-blue-300'}`}>
                                <div><h4 className="font-bold text-slate-800 leading-tight line-clamp-2">{produk.nama}</h4><p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{produk.kategori}</p></div>
                                <div className="flex justify-between items-end mt-2"><span className="font-black text-blue-600">Rp {produk.hargaEcer.toLocaleString()}</span><span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${produk.stok > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{produk.stok}</span></div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-[400px] bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-full z-10">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl flex justify-between items-center">
                        <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><ShoppingCart size={20} className="text-blue-600"/> Keranjang</h3>
                        <button onClick={() => setKeranjang([])} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Eraser size={18}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {keranjang.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex-1"><h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.nama}</h4><div className="text-xs text-slate-500">Rp {item.hargaEcer.toLocaleString()}</div></div>
                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 px-2 mx-2"><button onClick={() => kurangiQty(item.id)} className="w-6 h-6 bg-white rounded-lg shadow-sm font-bold">-</button><span className="font-bold text-sm">{item.qty}</span><button onClick={() => tambahKeKeranjang(item)} className="w-6 h-6 bg-blue-600 text-white rounded-lg shadow-sm font-bold">+</button></div>
                                <div className="font-black text-slate-800 text-sm">{(item.hargaEcer * item.qty).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-5 bg-slate-50 border-t border-slate-200 rounded-b-3xl space-y-3">
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                 <input type="text" placeholder="Diskon (Rp)" className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold w-32 outline-none" value={inputDiskon} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setInputDiskon(val ? "Rp " + parseInt(val).toLocaleString() : ""); }} />
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <span className="text-xs font-bold text-slate-500">PPN 11%</span>
                                     <input type="checkbox" checked={ppnAktif} onChange={() => setPpnAktif(!ppnAktif)} className="w-4 h-4 accent-blue-600"/>
                                 </label>
                             </div>
                             <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{subtotalMurni.toLocaleString()}</span></div>
                             {nilaiDiskon > 0 && <div className="flex justify-between text-sm text-red-500"><span>Diskon</span><span>-{nilaiDiskon.toLocaleString()}</span></div>}
                             {ppnAktif && <div className="flex justify-between text-sm text-slate-500"><span>PPN</span><span>+{nilaiPPN.toLocaleString()}</span></div>}
                         </div>

                         <div className="flex justify-between text-xl font-black text-slate-800 pt-2 border-t border-slate-200 mt-2"><span>Total</span><span>Rp {totalAkhir.toLocaleString()}</span></div>
                         
                         <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setMetodePembayaran('Cash')} className={`py-2 rounded-xl text-xs font-bold border ${metodePembayaran === 'Cash' ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white'}`}>Tunai</button>
                            <button onClick={() => setMetodePembayaran('QRIS')} className={`py-2 rounded-xl text-xs font-bold border ${metodePembayaran === 'QRIS' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white'}`}>QRIS</button>
                            <button onClick={() => setMetodePembayaran('Kasbon')} className={`py-2 rounded-xl text-xs font-bold border ${metodePembayaran === 'Kasbon' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white'}`}>Kasbon</button>
                         </div>
                         {metodePembayaran === 'Cash' && (
                             <div className="bg-white p-3 rounded-xl border-2 border-green-100 flex items-center gap-2">
                                <Banknote className="text-green-500" size={20}/><input type="text" className="w-full font-black text-lg outline-none" placeholder="Input Uang..." value={inputBayar} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setInputBayar(val ? "Rp " + parseInt(val).toLocaleString() : ""); }} />
                             </div>
                         )}
                         {metodePembayaran === 'Kasbon' && (
                            <div className="space-y-2 animate-fade-in">
                                <div className="bg-white p-2 rounded-xl border border-orange-200 flex items-center gap-2"><UserCircle className="text-orange-500" size={18}/><input type="text" className="w-full font-bold text-sm outline-none" placeholder="Nama Pelanggan" value={namaPelangganKasbon} onChange={(e) => setNamaPelangganKasbon(e.target.value)} /></div>
                                <div className="bg-white p-2 rounded-xl border border-orange-200 flex items-center gap-2"><Phone className="text-orange-500" size={18}/><input type="tel" className="w-full font-bold text-sm outline-none" placeholder="Nomor WA (08xx)" value={nomorHPKasbon} onChange={(e) => setNomorHPKasbon(e.target.value)} /></div>
                                <div className="bg-white p-2 rounded-xl border border-orange-200 flex items-center gap-2"><Calendar className="text-orange-500" size={18}/><div className="flex-1"><p className="text-[10px] text-slate-400 font-bold uppercase">Jatuh Tempo</p><input type="date" className="w-full font-bold text-sm outline-none" value={jatuhTempoKasbon} onChange={(e) => setJatuhTempoKasbon(e.target.value)} /></div></div>
                            </div>
                         )}
                         
                         <button onClick={handleBayarClick} disabled={keranjang.length === 0} className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center gap-2 transition-all ${getButtonBayarClass()}`}>
                            {metodePembayaran === 'Kasbon' ? 'Simpan Hutang' : 'Bayar Sekarang'} <ArrowRight size={20}/>
                         </button>
                    </div>
                </div>
            </div>
          )}

          {/* --- DATA KASBON --- */}
          {activeTab === 'kasbon' && currentUser?.role === 'admin' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><BookUser size={20} className="text-orange-500"/> Buku Kasbon</h3>
                        <p className="text-xs text-slate-400 mt-1">Kelola hutang & penagihan.</p>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold border border-orange-100">
                             Total Belum Lunas: Rp {stats.kasbonBelumLunas.toLocaleString()}
                         </div>
                         <button onClick={handleExportKasbon} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 text-xs transition-all">
                             <FileText size={16}/> Backup Excel
                         </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs">
                            <tr>
                                <th className="p-6">Tgl & ID</th>
                                <th className="p-6">Pelanggan</th>
                                <th className="p-6">Jatuh Tempo</th>
                                <th className="p-6">Tagihan</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kasbonList.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Tidak ada data kasbon.</td></tr>
                            ) : kasbonList.map(k => {
                                const isOverdue = k.status === 'Belum Lunas' && checkIsOverdue(k.jatuhTempo);
                                return (
                                <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="p-6"><div className="font-mono text-xs font-bold text-slate-500">{k.id}</div><div className="text-xs text-slate-400 mt-1">{k.tanggal}</div></td>
                                    <td className="p-6">
                                        <div className="font-bold text-slate-800 text-base">{k.namaPelanggan}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10}/> {k.nomorHP || "-"}</div>
                                    </td>
                                    <td className="p-6">
                                        <div className={`font-bold text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                                            <Calendar size={14}/> {new Date(k.jatuhTempo).toLocaleDateString('id-ID')}
                                        </div>
                                        {isOverdue && <span className="text-[10px] bg-red-100 text-red-600 px-2 rounded-full font-bold mt-1 inline-block">LEWAT JATUH TEMPO</span>}
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
                                            <>
                                                <button onClick={() => handleTagihHutangWA(k)} className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1" title="Kirim Tagihan WA"><MessageCircle size={16}/> Tagih WA</button>
                                                <button onClick={() => setShowLunasConfirm({ id: k.id, nama: k.namaPelanggan })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all">Lunasi</button>
                                            </>
                                        )}
                                        {k.status === 'Lunas' && (
                                            <button onClick={() => setShowDeleteKasbonConfirm(k.id)} className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1" title="Hapus Data">
                                                <Trash2 size={16}/> Hapus
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

          {/* --- INVENTORY & HISTORY & USERS --- */}
          {activeTab === 'inventory' && currentUser?.role === 'admin' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutGrid size={20} className="text-blue-500"/> Stok Produk</h3>
                    <button onClick={() => { setEditId(null); setNewItem({name:"", category:"Sembako", stockPcs:"", pricePcs:"", barcode:""}); setShowAddModal(true); }} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><PlusCircle size={18}/> Tambah</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs"><tr><th className="p-4 pl-6">Produk</th><th className="p-4">Stok</th><th className="p-4 text-center">Aksi</th></tr></thead>
                        <tbody>
                            {produkList.map((produk) => (
                                <tr key={produk.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="p-4 pl-6 font-bold text-slate-800">{produk.nama}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-lg font-bold text-xs ${produk.stok <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{produk.stok} pcs</span></td>
                                    <td className="p-4 flex justify-center gap-2"><button onClick={() => { setEditId(produk.id); setNewItem({name: produk.nama, category: produk.kategori, stockPcs: produk.stok.toString(), pricePcs: produk.hargaEcer.toString(), barcode: produk.barcode}); setShowAddModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit size={16}/></button><button onClick={() => {setDeleteTargetId(produk.id); setShowDeleteConfirm(true);}} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

          {activeTab === 'history' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={20} className="text-purple-500"/> Riwayat</h3>
                    <button onClick={handleExportHistory} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 text-xs"><FileText size={16}/> Excel</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-xs"><tr><th className="p-4 pl-6">ID & Tgl</th><th className="p-4">Total</th><th className="p-4 text-center">Aksi</th></tr></thead>
                        <tbody>
                            {riwayat.length === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center text-slate-400">Belum ada riwayat transaksi.</td></tr>
                            ) : riwayat.map((trx) => (
                                <tr key={trx.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    <td className="p-4 pl-6"><div className="font-mono text-xs font-bold text-slate-500">{trx.id}</div><div className="text-[10px] text-slate-400">{trx.tanggal}</div></td>
                                    <td className="p-4 font-black text-slate-700">Rp {trx.total.toLocaleString()}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => handlePrintStruk(trx)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="Print Struk"><Printer size={16}/></button>
                                        <button onClick={() => handleKirimWA(trx)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" title="Kirim WA"><MessageCircle size={16}/></button>
                                        {currentUser?.role === 'admin' && (
                                            <button onClick={() => setShowDeleteHistoryConfirm(trx.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Hapus Riwayat"><Trash2 size={16}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}
          
           {activeTab === 'users' && currentUser?.role === 'admin' && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden max-w-4xl mx-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={20} className="text-blue-500"/> User</h3>
                    <button onClick={() => setShowAddUserModal(true)} className="bg-slate-800 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><UserPlus size={18}/> Tambah</button>
                </div>
                <div className="p-6 grid gap-4">
                    {dbUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50">
                            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{u.nama.charAt(0)}</div><div><h4 className="font-bold text-slate-800">{u.nama}</h4><p className="text-xs text-slate-500">@{u.username}</p></div></div>
                            {u.id !== currentUser.id && <button onClick={() => {setUserToDelete({id:u.id, nama:u.nama}); setShowDeleteUserConfirm(true);}} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={20}/></button>}
                        </div>
                    ))}
                </div>
             </div>
          )}
        </div>
      </main>

      {/* --- MODALS (ALERTS & POPUPS) --- */}
      {showKasbonWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center animate-pop-in">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                <h3 className="font-black text-xl text-slate-800 mb-2">Data Belum Lengkap!</h3>
                <p className="text-slate-500 mb-6 text-sm">{kasbonWarningMsg}</p>
                <button onClick={() => setShowKasbonWarning(false)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Lengkapi Data</button>
            </div>
        </div>
      )}

      {showKurangBayarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                <h3 className="font-black text-xl text-slate-800 mb-2">Uang Kurang!</h3>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 space-y-2">
                    <div className="flex justify-between text-base font-bold text-red-600"><span>KURANG</span><span>Rp {(totalAkhir - nilaiBayar).toLocaleString()}</span></div>
                </div>
                <button onClick={() => setShowKurangBayarModal(false)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold">Cek Lagi</button>
            </div>
        </div>
      )}

      {showLunasConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
                  <h3 className="font-bold text-lg mb-2">Lunasi Hutang?</h3>
                  <p className="text-slate-500 text-sm mb-6">Pelanggan <b>{showLunasConfirm.nama}</b> sudah bayar lunas?</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowLunasConfirm(null)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button>
                      <button onClick={() => handleLunasiKasbon(showLunasConfirm.id)} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Ya, Lunas</button>
                  </div>
              </div>
          </div>
      )}

      {showDeleteKasbonConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                  <h3 className="font-bold text-lg mb-2">Hapus Data Kasbon?</h3>
                  <p className="text-slate-500 text-sm mb-6">Data yang dihapus tidak bisa dikembalikan.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowDeleteKasbonConfirm(null)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button>
                      <button onClick={handleDeleteKasbon} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Hapus</button>
                  </div>
              </div>
          </div>
      )}

      {showDeleteHistoryConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center animate-pop-in">
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                  <h3 className="font-bold text-lg mb-2">Hapus Riwayat?</h3>
                  <p className="text-slate-500 text-sm mb-6">Transaksi <b>{showDeleteHistoryConfirm}</b> akan dihapus permanen.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowDeleteHistoryConfirm(null)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button>
                      <button onClick={handleDeleteHistory} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Hapus</button>
                  </div>
              </div>
          </div>
      )}
      
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden text-center p-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={40}/></div>
                <h2 className="text-2xl font-black mb-2">Transaksi Sukses!</h2>
                <p className="text-slate-500 text-sm mb-6">{lastTrx?.metodePembayaran === 'Kasbon' ? 'Data hutang telah tersimpan.' : 'Terima kasih telah berbelanja.'}</p>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setShowSuccess(false)} className="py-3 rounded-xl font-bold text-slate-600 bg-slate-100">Tutup</button>
                    <button onClick={() => lastTrx && handlePrintStruk(lastTrx)} className="py-3 rounded-xl font-bold text-white bg-slate-800 flex items-center justify-center gap-2"><Printer size={18}/> Print</button>
                    <button onClick={() => lastTrx && handleKirimWA(lastTrx)} className="py-3 rounded-xl font-bold text-white bg-green-600 flex items-center justify-center gap-2"><MessageCircle size={18}/> WA</button>
                </div>
            </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-3">
                <h3 className="font-bold text-xl mb-4">{editId ? 'Edit' : 'Tambah'} Produk</h3>
                <input type="text" className="w-full bg-slate-50 p-3 rounded-xl border font-bold" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Nama Produk"/>
                <div className="flex gap-3"><input type="number" className="w-full bg-slate-50 p-3 rounded-xl border font-bold" value={newItem.pricePcs} onChange={(e) => setNewItem({...newItem, pricePcs: e.target.value})} placeholder="Harga"/><input type="number" className="w-1/3 bg-slate-50 p-3 rounded-xl border font-bold" value={newItem.stockPcs} onChange={(e) => setNewItem({...newItem, stockPcs: e.target.value})} placeholder="Stok"/></div>
                <div className="flex gap-3 mt-6"><button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Batal</button><button onClick={handleSimpanProduk} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">Simpan</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;