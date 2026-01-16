import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import 'animate.css';
import { 
  LayoutGrid, ShoppingCart, History, Search, LayoutDashboard,
  Trash2, CheckCircle2, ReceiptText, PlusCircle, Edit, LogOut, Eraser, ScanBarcode, Wallet, ArrowRight, UserCircle, KeyRound, Users, UserPlus, AlertTriangle, BookUser, Banknote, Tag, MessageCircle, Calendar, Phone, Printer, FileText, Download, X, Lock
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
interface UserSession { id: number; username: string; role: 'admin' | 'kasir'; nama: string; password?: string; }
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
  const [holdOrder, setHoldOrder] = useState<ItemKeranjang[] | null>(null);
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
  
  // MODAL USER
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: number, nama: string} | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', nama: '', role: 'kasir' });
  
  // STATE GANTI PASSWORD
  const [showPasswordModal, setShowPasswordModal] = useState(false); 
  const [passwordForm, setPasswordForm] = useState({ oldPass: '', newPass: '' });

  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showKurangBayarModal, setShowKurangBayarModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); 
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); 
  
  // MODAL PRODUK
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
      setCurrentUser({ id: user.id, username: user.username, role: user.role as 'admin'|'kasir', nama: user.nama, password: user.password });
      setLoginError(''); setLoginForm({ username: '', password: '' });
    } else { setLoginError('Username atau Password Salah!'); }
  };

  const handleLogout = () => {
    setCurrentUser(null); setKeranjang([]); setPpnAktif(false); setInputDiskon(""); setInputBayar(""); setMetodePembayaran('Cash');
  };

  // --- PRINT & WA ---
  const handlePrintStruk = (trx: HistoryTransaksi) => {
    const printWindow = window.open('', '', 'width=350,height=600');
    if (!printWindow) return alert("Pop-up blocked!");
    const itemsHtml = trx.items.map(item => `<div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span style="font-size: 12px;">${item.nama} x${item.qty}</span><span style="font-size: 12px; font-weight: bold;">${(item.hargaEcer * item.qty).toLocaleString()}</span></div>`).join('');
    printWindow.document.write(`<html><head><title>Struk - ${trx.id}</title><style>body{font-family:'Courier New',monospace;padding:10px;width:58mm;margin:0 auto;color:#000}.header{text-align:center;margin-bottom:10px;border-bottom:1px dashed #000;padding-bottom:5px}.logo-img{width:50px;height:50px;object-fit:contain;margin-bottom:5px;filter:grayscale(100%)}.items{margin-bottom:10px;border-bottom:1px dashed #000;padding-bottom:5px}.totals{text-align:right}.footer{text-align:center;margin-top:15px;font-size:10px}h2{margin:0;font-size:16px;font-weight:bold}p{margin:2px 0;font-size:12px}</style></head><body><div class="header"><img src="${LOGO_URL}" class="logo-img"/><h2>${NAMA_TOKO}</h2><p>${ALAMAT_TOKO}</p><p>${TELP_TOKO}</p><p style="margin-top:5px;">${trx.id}</p><p>${trx.tanggal} ${trx.waktu}</p><p>Kasir: ${trx.kasir}</p></div><div class="items">${itemsHtml}</div><div class="totals">${trx.diskon > 0 ? `<p>Diskon: -${trx.diskon.toLocaleString()}</p>` : ''}${trx.ppn > 0 ? `<p>PPN 11%: ${trx.ppn.toLocaleString()}</p>` : ''}<p style="font-size: 14px; font-weight: bold; margin-top:5px;">TOTAL: ${trx.total.toLocaleString()}</p><p>Bayar: ${trx.bayar.toLocaleString()}</p><p>Kembali: ${trx.kembali.toLocaleString()}</p><p>Metode: ${trx.metodePembayaran}</p></div><div class="footer"><p>Terima Kasih</p><p>Barang yang dibeli tidak dapat ditukar</p></div><script>window.onload=function(){window.print();window.close()}</script></body></html>`);
    printWindow.document.close();
  };

  const handleKirimWA = (trx: HistoryTransaksi) => {
    let pesan = `*STRUK BELANJA - ${NAMA_TOKO}*\nNo: ${trx.id}\nTanggal: ${trx.tanggal} ${trx.waktu}\nKasir: ${trx.kasir}\n--------------------------------\n`;
    trx.items.forEach(item => { pesan += `${item.nama}\n${item.qty} x ${item.hargaEcer.toLocaleString()} = ${item.subtotal.toLocaleString()}\n`; });
    pesan += `--------------------------------\nSubtotal: Rp ${trx.subtotal.toLocaleString()}\n`;
    if(trx.diskon > 0) pesan += `Diskon: - Rp ${trx.diskon.toLocaleString()}\n`;
    if(trx.ppn > 0) pesan += `PPN (11%): Rp ${trx.ppn.toLocaleString()}\n`;
    pesan += `--------------------------------\n*Total: Rp ${trx.total.toLocaleString()}*\nStatus: ${trx.metodePembayaran === 'Kasbon' ? 'HUTANG' : 'LUNAS'}\n--------------------------------\nTerima Kasih! 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  const handleTagihHutangWA = (kasbon: KasbonData) => {
      let phone = kasbon.nomorHP.replace(/\D/g,'');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      const jatuhTempoIndo = new Date(kasbon.jatuhTempo).toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
      const pesan = `Halo Kak *${kasbon.namaPelanggan}*,\n\nKami dari *${NAMA_TOKO}* ingin mengingatkan tagihan kasbon sebesar *Rp ${kasbon.total.toLocaleString()}* jatuh tempo pada:\n📅 *${jatuhTempoIndo}*\n\nMohon segera melakukan pembayaran. Terima kasih! 🙏`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pesan)}`, '_blank');
  };

  // --- DATA MANAGEMENT FUNCTIONS ---
  const handleExportHistory = () => {
    // MODIFIKASI: Filter data berdasarkan role user saat export
    const filteredHistory = riwayat.filter(trx => 
      currentUser?.role === 'admin' || trx.kasir === currentUser?.nama
    );

    if (filteredHistory.length === 0) {
      Swal.fire({
        title: "Data Tidak Ditemukan",
        text: "Maaf, belum ada riwayat transaksi yang bisa diunduh.",
        icon: "error",
        showClass: { popup: 'animate__animated animate__shakeX' }
      });
      return;
    }
    
    const data = filteredHistory.flatMap(t => t.items.map(item => ({ "ID": t.id, "Tgl": t.tanggal, "Kasir": t.kasir, "Item": item.nama, "Harga": item.hargaEcer, "Qty": item.qty, "Subtotal": item.subtotal, "Total Trx": t.total })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_${currentUser?.nama}_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.xlsx`);
  };

  const handleExportKasbon = () => {
      if (kasbonList.length === 0) {
        Swal.fire({
            title: "Kasbon Kosong",
            text: "Belum ada data kasbon untuk dibackup.",
            icon: "warning",
            showClass: { popup: 'animate__animated animate__fadeInDown' }
        });
        return;
      }
    };

  const handleDeleteHistory = () => {
      if (!showDeleteHistoryConfirm) return;
      setRiwayat(prev => prev.filter(trx => trx.id !== showDeleteHistoryConfirm));
      setShowDeleteHistoryConfirm(null);
  };

  const handleDeleteProduk = () => {
      if (deleteTargetId !== null) {
          setProdukList(prev => prev.filter(p => p.id !== deleteTargetId));
          setDeleteTargetId(null);
          setShowDeleteConfirm(false);
      }
  };

  const handleDeleteKasbon = () => {
      if (!showDeleteKasbonConfirm) return;
      setKasbonList(prev => prev.filter(k => k.id !== showDeleteKasbonConfirm));
      setShowDeleteKasbonConfirm(null);
  };

  // --- USER MANAGEMENT FUNCTIONS ---
  const handleSimpanUser = () => {
      if (!newUser.username || !newUser.password || !newUser.nama) return alert("Semua data wajib diisi!");
      const newId = Date.now();
      setDbUsers(prev => [...prev, { id: newId, ...newUser }]);
      setNewUser({ username: '', password: '', nama: '', role: 'kasir' });
      setShowAddUserModal(false);
      setShowSaveSuccess(true);
  };

  const handleDeleteUser = () => {
      if (userToDelete) {
          setDbUsers(prev => prev.filter(u => u.id !== userToDelete.id));
          setUserToDelete(null);
          setShowDeleteUserConfirm(false);
      }
  };

  // --- CHANGE PASSWORD FUNCTION ---
  const handleChangePassword = () => {
      if (!currentUser) return;
      
      if (passwordForm.oldPass !== currentUser.password) {
          alert("Password lama salah! Mohon cek kembali.");
          return;
      }
      if (!passwordForm.newPass || passwordForm.newPass.length < 3) {
          alert("Password baru minimal 3 karakter!");
          return;
      }

      const updatedUsers = dbUsers.map(u => 
        u.id === currentUser.id ? { ...u, password: passwordForm.newPass } : u
      );
      setDbUsers(updatedUsers);
      const updatedUserSession = { ...currentUser, password: passwordForm.newPass };
      setCurrentUser(updatedUserSession);
      setPasswordForm({ oldPass: '', newPass: '' });
      setShowPasswordModal(false);
      setShowSaveSuccess(true);
  };

  // --- POS FUNCTIONS ---
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

// --- FUNGSI HOLD ORDER ---
  const handleHoldOrder = () => {
    if (keranjang.length === 0) return;
    setHoldOrder([...keranjang]);
    setKeranjang([]);
    Swal.fire({
      title: "Antrean Ditunda",
      text: "Pesanan disimpan sementara. Silakan layani pelanggan berikutnya.",
      icon: "info",
      timer: 2000,
      showConfirmButton: false,
      showClass: { popup: 'animate__animated animate__fadeInRight' }
    });
  };

  const handleRestoreOrder = () => {
    if (!holdOrder) return;
    if (keranjang.length > 0) {
      Swal.fire({
        title: "Keranjang Masih Terisi",
        text: "Selesaikan atau kosongkan keranjang saat ini terlebih dahulu.",
        icon: "warning"
      });
      return;
    }
    setKeranjang([...holdOrder]);
    setHoldOrder(null);
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
            bayar: nilaiBayar, kembali: nilaiKembalian, metodePembayaran, catatan: namaPelanggan 
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
            <button onClick={() => { setPasswordForm({oldPass:'', newPass:''}); setShowPasswordModal(true); }} className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700" title="Ganti Password"><KeyRound size={20} className="mx-auto"/></button>
            <button onClick={handleLogout} className="p-3 rounded-xl bg-red-900/50 text-red-400 hover:bg-red-600" title="Keluar"><LogOut size={20} className="mx-auto"/></button>
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
             {activeTab === 'users' && <><Users className="text-blue-600"/> Manajemen User</>}
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
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
                        {filteredProduk.map(p => (
                            <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all group relative overflow-hidden">
                                {p.stok <= 0 && <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-black text-red-500 z-10">HABIS</div>}
                                <p className="text-xs font-bold text-slate-400 mb-1">{p.kategori}</p>
                                <h3 className="font-bold text-slate-800 leading-tight mb-2 h-10 overflow-hidden">{p.nama}</h3>
                                <div className="flex justify-between items-end">
                                    <span className="font-black text-blue-600">Rp {p.hargaEcer.toLocaleString()}</span>
                                    <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg border border-slate-200">Stok: {p.stok}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-96 bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-full overflow-hidden">
                    <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold flex items-center gap-2">
                                <ShoppingCart size={20}/> Keranjang
                            </h3>
                            {/* Tombol Ambil (Restore) muncul di sini jika ada data tunda */}
                            {holdOrder && (
                                <button 
                                    onClick={handleRestoreOrder}
                                    className="bg-slate-100 text-slate-800 text-[10px] px-2 py-1 rounded-lg font-black animate-pulse"
                                >
                                    AMBIL PESANAN
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Tombol Tunda (Hold) - Icon Panah Biru */}
                            {keranjang.length > 0 && (
                                <button title="Tunda Pesanan" onClick={handleHoldOrder} className="text-blue-400 hover:text-white transition-colors">
                                    <ArrowRight size={20}/>
                                </button>
                            )}
                            {/* Ini adalah span 'Items' Anda yang tadi, tetap ada di sini */}
                            <span className="bg-white/20 px-2 py-1 rounded-lg text-xs font-bold">
                                {keranjang.reduce((a,b)=>a+b.qty,0)} Items
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {keranjang.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                                <ShoppingCart size={48} className="opacity-20"/>
                                <p className="font-bold">Keranjang Kosong</p>
                            </div>
                        ) : keranjang.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-slate-800">{item.nama}</h4>
                                    <p className="text-xs text-slate-500">Rp {item.hargaEcer.toLocaleString()} x {item.qty}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-bold text-sm">Rp {item.subtotal.toLocaleString()}</p>
                                    <button onClick={() => kurangiQty(item.id)} className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>Rp {subtotalMurni.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center text-slate-500">
                                <span>Diskon (Rp)</span>
                                <input type="text" className="w-24 text-right bg-white border border-slate-300 rounded px-1 text-xs outline-none focus:border-blue-500" value={inputDiskon} onChange={e => setInputDiskon(e.target.value)} placeholder="0"/>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={ppnAktif} onChange={e => setPpnAktif(e.target.checked)} className="accent-blue-600"/> PPN 11%</label>
                                <span>Rp {nilaiPPN.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg font-black text-slate-800 pt-2 border-t border-slate-200"><span>TOTAL</span><span>Rp {totalAkhir.toLocaleString()}</span></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                             {['Cash', 'QRIS', 'Kasbon'].map(m => (
                                <button key={m} onClick={() => setMetodePembayaran(m)} className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${metodePembayaran === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{m}</button>
                             ))}
                        </div>
                        
                        {metodePembayaran === 'Kasbon' ? (
                            <div className="space-y-2 bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                                <p className="text-xs font-bold text-yellow-800 flex items-center gap-1"><AlertTriangle size={12}/> Data Peminjam Wajib Diisi:</p>
                                <input type="text" placeholder="Nama Pelanggan" className="w-full p-2 text-xs border border-yellow-300 rounded-lg" value={namaPelangganKasbon} onChange={e => setNamaPelangganKasbon(e.target.value)} />
                                <input type="text" placeholder="No. WA (08xxx)" className="w-full p-2 text-xs border border-yellow-300 rounded-lg" value={nomorHPKasbon} onChange={e => setNomorHPKasbon(e.target.value)} />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">Jatuh Tempo:</span>
                                    <input type="date" className="flex-1 p-2 text-xs border border-yellow-300 rounded-lg" value={jatuhTempoKasbon} onChange={e => setJatuhTempoKasbon(e.target.value)} />
                                </div>
                            </div>
                        ) : (
                             metodePembayaran === 'Cash' && (
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                                    <input type="text" placeholder="Uang Tunai" className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-blue-500" value={inputBayar} onChange={e => setInputBayar(e.target.value)}/>
                                </div>
                             )
                        )}

                        <button onClick={handleBayarClick} disabled={keranjang.length === 0} className={`w-full py-4 rounded-xl text-white font-black shadow-lg text-lg flex items-center justify-center gap-2 transition-all ${getButtonBayarClass()}`}>
                            {metodePembayaran === 'Kasbon' ? 'CATAT KASBON' : 'BAYAR SEKARANG'} <ArrowRight size={20}/>
                        </button>
                    </div>
                </div>
            </div>
          )}

          {/* --- INVENTORY (ADMIN ONLY) --- */}
          {activeTab === 'inventory' && currentUser?.role === 'admin' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Stok Produk</h3>
                    <button onClick={() => { setEditId(null); setNewItem({name:"", category:"Sembako", stockPcs:"", pricePcs:"", barcode:""}); setShowAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><PlusCircle size={18}/> Tambah Produk</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm">
                            <tr><th className="p-4">Barcode</th><th className="p-4">Nama Produk</th><th className="p-4">Kategori</th><th className="p-4 text-center">Stok</th><th className="p-4 text-right">Harga</th><th className="p-4 text-center">Aksi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {produkList.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-sm font-mono text-slate-500">{p.barcode}</td>
                                    <td className="p-4 font-bold text-slate-800">{p.nama}</td>
                                    <td className="p-4 text-sm"><span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">{p.kategori}</span></td>
                                    <td className="p-4 text-center"><span className={`font-bold px-3 py-1 rounded-full ${p.stok < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{p.stok}</span></td>
                                    <td className="p-4 text-right font-bold">Rp {p.hargaEcer.toLocaleString()}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => { setEditId(p.id); setNewItem({name: p.nama, category: p.kategori, stockPcs: p.stok.toString(), pricePcs: p.hargaEcer.toString(), barcode: p.barcode}); setShowAddModal(true); }} className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200"><Edit size={16}/></button>
                                        <button onClick={() => { setDeleteTargetId(p.id); setShowDeleteConfirm(true); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* --- RIWAYAT (MODIFIED: FILTER PER USER) --- */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">Riwayat Transaksi</h3>
                        {currentUser?.role !== 'admin' && <p className="text-xs text-slate-400 font-bold mt-1">Menampilkan transaksi Anda ({currentUser?.nama})</p>}
                    </div>
                    <button onClick={handleExportHistory} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Download size={18}/> Export Excel</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm">
                            <tr><th className="p-4">ID & Waktu</th><th className="p-4">Kasir</th><th className="p-4">Detail Item</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Metode</th><th className="p-4 text-center">Aksi</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {riwayat
                              // MODIFIKASI: Filter Tampilan
                              .filter(trx => currentUser?.role === 'admin' || trx.kasir === currentUser?.nama)
                              .map(trx => (
                                <tr key={trx.id} className="hover:bg-slate-50 align-top">
                                    <td className="p-4">
                                        <p className="font-bold text-blue-600 text-xs">{trx.id}</p>
                                        <p className="text-xs text-slate-500">{trx.tanggal}</p>
                                        <p className="text-xs text-slate-400">{trx.waktu}</p>
                                    </td>
                                    <td className="p-4 text-sm font-bold">{trx.kasir}</td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            {trx.items.map((item, idx) => (
                                                <p key={idx} className="text-xs text-slate-600 flex justify-between w-48"><span>{item.nama} x{item.qty}</span> <span className="font-bold">{item.subtotal.toLocaleString()}</span></p>
                                            ))}
                                            {trx.diskon > 0 && <p className="text-xs text-green-600 flex justify-between w-48 font-bold"><span>Diskon</span> <span>-{trx.diskon.toLocaleString()}</span></p>}
                                            {trx.ppn > 0 && <p className="text-xs text-orange-600 flex justify-between w-48 font-bold"><span>PPN</span> <span>+{trx.ppn.toLocaleString()}</span></p>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-black text-slate-800">Rp {trx.total.toLocaleString()}</td>
                                    <td className="p-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{trx.metodePembayaran}</span></td>
                                    <td className="p-4">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => handlePrintStruk(trx)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title="Print"><Printer size={16}/></button>
                                            <button onClick={() => handleKirimWA(trx)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" title="Kirim WA"><MessageCircle size={16}/></button>
                                            {currentUser?.role === 'admin' && (
                                                <button onClick={() => setShowDeleteHistoryConfirm(trx.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Hapus"><Trash2 size={16}/></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {riwayat.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada riwayat transaksi</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* --- KASBON (ADMIN ONLY) --- */}
          {activeTab === 'kasbon' && currentUser?.role === 'admin' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Data Kasbon & Piutang</h3>
                      <button onClick={handleExportKasbon} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Download size={18}/> Backup Data</button>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold text-sm">
                              <tr><th className="p-4">Tgl & Tempo</th><th className="p-4">Pelanggan</th><th className="p-4 text-right">Total Hutang</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Aksi</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {kasbonList.map(k => (
                                  <tr key={k.id} className="hover:bg-slate-50">
                                      <td className="p-4">
                                          <p className="text-xs text-slate-500">{k.tanggal}</p>
                                          <p className="text-xs font-bold text-red-500">Jatuh Tempo: {k.jatuhTempo}</p>
                                      </td>
                                      <td className="p-4">
                                          <p className="font-bold text-slate-800">{k.namaPelanggan}</p>
                                          <p className="text-xs text-slate-500">{k.nomorHP}</p>
                                      </td>
                                      <td className="p-4 text-right font-black text-slate-800">Rp {k.total.toLocaleString()}</td>
                                      <td className="p-4 text-center">
                                          {k.status === 'Lunas' 
                                            ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 justify-center"><CheckCircle2 size={12}/> LUNAS</span>
                                            : <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black animate-pulse">BELUM LUNAS</span>
                                          }
                                      </td>
                                      <td className="p-4 flex justify-center gap-2">
                                          {k.status === 'Belum Lunas' && (
                                              <>
                                                <button onClick={() => handleTagihHutangWA(k)} className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 flex items-center gap-1"><MessageCircle size={12}/> Tagih</button>
                                                <button onClick={() => setShowLunasConfirm({id: k.id, nama: k.namaPelanggan})} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Lunasi</button>
                                              </>
                                          )}
                                          <button onClick={() => setShowDeleteKasbonConfirm(k.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={16}/></button>
                                      </td>
                                  </tr>
                              ))}
                              {kasbonList.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada data kasbon</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* --- USER MANAGEMENT (ADMIN ONLY) --- */}
          {activeTab === 'users' && currentUser?.role === 'admin' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Manajemen Pengguna</h3>
                    <button onClick={() => setShowAddUserModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><UserPlus size={18}/> Tambah User</button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dbUsers.map(user => (
                        <div key={user.id} className="border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">{user.nama}</h4>
                                <p className="text-xs text-slate-500 uppercase font-bold">{user.role}</p>
                                <p className="text-xs text-slate-400">Username: {user.username}</p>
                            </div>
                            {user.username !== 'admin' && (
                                <button onClick={() => { setUserToDelete({id: user.id, nama: user.nama}); setShowDeleteUserConfirm(true); }} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 size={18}/></button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
          )}

        </div>
      </main>

      {/* --- MODALS --- */}
      {/* Modal Transaksi Sukses */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><CheckCircle2 size={40}/></div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Transaksi Berhasil!</h3>
                <p className="text-slate-500 mb-6">Data telah tersimpan di sistem.</p>
                <div className="flex flex-col gap-2">
                    {lastTrx && (
                        <>
                            <button onClick={() => handlePrintStruk(lastTrx)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Printer size={18}/> Cetak Struk</button>
                            <button onClick={() => handleKirimWA(lastTrx)} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2"><MessageCircle size={18}/> Kirim WhatsApp</button>
                        </>
                    )}
                    <button onClick={() => setShowSuccess(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 mt-2">Tutup</button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Simpan Sukses (General) */}
      {showSaveSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><CheckCircle2 size={32}/></div>
                <h3 className="text-xl font-black text-slate-800 mb-6">Data Berhasil Disimpan!</h3>
                <button onClick={() => setShowSaveSuccess(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">OK</button>
            </div>
        </div>
      )}

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-4">{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="Barcode / Kode Barang" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value})} />
                    <input type="text" placeholder="Nama Produk" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    <select className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                        <option value="Sembako">Sembako</option><option value="Makanan">Makanan</option><option value="Minuman">Minuman</option><option value="Rokok">Rokok</option><option value="Obat">Obat</option><option value="Lainnya">Lainnya</option>
                    </select>
                    <div className="flex gap-3">
                        <input type="number" placeholder="Stok" className="w-1/3 p-3 bg-slate-50 rounded-xl border font-bold" value={newItem.stockPcs} onChange={e => setNewItem({...newItem, stockPcs: e.target.value})} />
                        <input type="number" placeholder="Harga Ecer" className="w-2/3 p-3 bg-slate-50 rounded-xl border font-bold" value={newItem.pricePcs} onChange={e => setNewItem({...newItem, pricePcs: e.target.value})} />
                    </div>
                    <button onClick={handleSimpanProduk} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-2">SIMPAN PRODUK</button>
                    <button onClick={() => setShowAddModal(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Tambah User */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-4">Tambah User Baru</h3>
                <div className="space-y-3">
                    <input type="text" placeholder="Nama Lengkap" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newUser.nama} onChange={e => setNewUser({...newUser, nama: e.target.value})} />
                    <input type="text" placeholder="Username" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                    <input type="text" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    <select className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="kasir">Kasir</option><option value="admin">Admin</option>
                    </select>
                    <button onClick={handleSimpanUser} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-2">SIMPAN USER</button>
                    <button onClick={() => setShowAddUserModal(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Ganti Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-4">Ganti Password</h3>
                <div className="space-y-3">
                    <input type="password" placeholder="Password Lama" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={passwordForm.oldPass} onChange={e => setPasswordForm({...passwordForm, oldPass: e.target.value})} />
                    <input type="password" placeholder="Password Baru" className="w-full p-3 bg-slate-50 rounded-xl border font-bold" value={passwordForm.newPass} onChange={e => setPasswordForm({...passwordForm, newPass: e.target.value})} />
                    <button onClick={handleChangePassword} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 mt-2">SIMPAN PASSWORD</button>
                    <button onClick={() => setShowPasswordModal(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertTriangle size={32}/></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Hapus Produk?</h3>
                <p className="text-slate-500 mb-6">Data yang dihapus tidak bisa dikembalikan.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={handleDeleteProduk} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {showDeleteHistoryConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-4">Hapus Riwayat?</h3>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteHistoryConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={handleDeleteHistory} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {showDeleteUserConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-2">Hapus User?</h3>
                <p className="text-slate-500 mb-6">User <span className="font-bold text-slate-800">{userToDelete.nama}</span> akan dihapus permanen.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteUserConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={handleDeleteUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Hapus</button>
                </div>
            </div>
        </div>
      )}
      
      {showLunasConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><Banknote size={32}/></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Lunasi Kasbon?</h3>
                <p className="text-slate-500 mb-6">Tagihan atas nama <span className="font-bold text-slate-800">{showLunasConfirm.nama}</span> akan ditandai LUNAS.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowLunasConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={() => handleLunasiKasbon(showLunasConfirm.id)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Ya, Lunas</button>
                </div>
            </div>
        </div>
      )}
      
      {showDeleteKasbonConfirm && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 mb-4">Hapus Data Kasbon?</h3>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteKasbonConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                    <button onClick={handleDeleteKasbon} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Hapus</button>
                </div>
            </div>
        </div>
      )}

      {/* Warning Modals */}
      {showEmptyWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600"><ShoppingCart size={32}/></div>
                <h3 className="text-lg font-black text-slate-800 mb-4">Keranjang Kosong!</h3>
                <button onClick={() => setShowEmptyWarning(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Kembali</button>
            </div>
        </div>
      )}
      {showKurangBayarModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertTriangle size={32}/></div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Uang Kurang!</h3>
                <p className="text-slate-500 mb-4">Mohon cek kembali nominal pembayaran.</p>
                <button onClick={() => setShowKurangBayarModal(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">OK</button>
            </div>
        </div>
      )}
      {showKasbonWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600"><AlertTriangle size={32}/></div>
                <h3 className="text-lg font-black text-slate-800 mb-2">Data Belum Lengkap</h3>
                <p className="text-slate-500 mb-4 text-sm">{kasbonWarningMsg}</p>
                <button onClick={() => setShowKasbonWarning(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">Lengkapi Data</button>
            </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 z-[60] flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-black text-slate-800">Memproses Transaksi...</h3>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;