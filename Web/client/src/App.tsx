import React, { useState } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, Plus, 
  X, CheckCircle2, ReceiptText, AlertCircle, Trash2,
  Egg, Flame, Cigarette, Waves, Boxes
} from 'lucide-react';

// --- Interfaces ---
interface Produk {
  id: number;
  nama: string;
  kategori: string;
  stok: number;
  hargaEcer: number;
  gambar: string;
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
  // --- States ---
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'history'>('pos');
  const [search, setSearch] = useState("");
  const [keranjang, setKeranjang] = useState<ItemKeranjang[]>([]);
  const [riwayat, setRiwayat] = useState<HistoryTransaksi[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryTransaksi | null>(null);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedKategori, setSelectedKategori] = useState<string>("Semua");
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // --- Data Produk ---
  const [produkList, setProdukList] = useState<Produk[]>([
    { id: 1, nama: "Beras Premium 5kg", kategori: "Sembako", stok: 20, hargaEcer: 75000, gambar: "https://akcdn.detik.net.id/visual/2023/10/10/ilustrasi-beras_169.jpeg?w=750&q=90" },
    { id: 2, nama: "Minyak Goreng 2L", kategori: "Sembako", stok: 15, hargaEcer: 34000, gambar: "https://image.dailymartazzahra.com/s3/productimages/webp/co37129/p647771/w600-h600/68d96bd8-9169-4913-9306-e65cad8c5075.jpg"},
    { id: 3, nama: "Gula Pasir 1kg", kategori: "Sembako", stok: 50, hargaEcer: 16500, gambar: "https://p16-images-sign-sg.tokopedia-static.net/tos-alisg-i-aphluv4xwc-sg/img/VqbcmM/2021/6/1/8443e276-c835-46a7-b787-94cdd4c6d059.jpg~tplv-aphluv4xwc-white-pad-v1:1600:1600.jpeg?lk3s=0ccea506&x-expires=1766619340&x-signature=GLjdGsE1yCk1LF5EfV%2BX4souq94%3D&x-signature-webp=CYnEQLJfgwpcgTNt%2FGw%2BofoXdHY%3D"},
    { id: 4, nama: "Telur Ayam 1kg", kategori: "Sembako", stok: 30, hargaEcer: 28000, gambar: "https://siopen.balangankab.go.id/storage/merchant/products/2024/03/20/webp/3ebfc5fe07a6c589d85e268548e8dc66.webp" },
    { id: 5, nama: "Terigu Segitiga Biru", kategori: "Sembako", stok: 25, hargaEcer: 12000, gambar: "https://c.alfagift.id/product/1/1_A28090001915_20240508102544159_base.jpg" },
    { id: 6, nama: "Garam Dapur Beriodium", kategori: "Bumbu", stok: 100, hargaEcer: 3500, gambar: "https://images.unsplash.com/photo-1610450534241-1f9532658428?w=400" },
    { id: 7, nama: "Kecap Manis 520ml", kategori: "Bumbu", stok: 20, hargaEcer: 22000, gambar: "https://images.unsplash.com/photo-1622359570138-02830206148a?q=80&w=400&auto=format&fit=crop" },
    { id: 8, nama: "Sabun Cuci Piring", kategori: "Kebersihan", stok: 40, hargaEcer: 15000, gambar: "https://images.unsplash.com/photo-1584622781564-1d9876a13d1e?q=80&w=400&auto=format&fit=crop" },
    { id: 9, nama: "Sampoerna Mild 16", kategori: "Rokok", stok: 50, hargaEcer: 35000, gambar: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?w=400" },
    { id: 10, nama: "Gudang Garam Filter 12", kategori: "Rokok", stok: 40, hargaEcer: 24000, gambar: "https://images.unsplash.com/photo-1623945410152-30128956973e?w=400" },
    { id: 11, nama: "Djarum 76 Apel", kategori: "Rokok", stok: 30, hargaEcer: 17000, gambar: "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/89/MTA-183102054/djarum_76_djarum_76_apel_rokok_kretek_12_-_skt_full03_ie65ropx.webp" },
  ]);

  // --- Logika POS ---
  const tambahKeKeranjang = (produk: Produk) => {
    if (produk.stok <= 0) return alert("Stok habis!");
    const itemExist = keranjang.find(item => item.id === produk.id);
    if (itemExist) {
      setKeranjang(keranjang.map(item => 
        item.id === produk.id ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.hargaEcer } : item
      ));
    } else {
      setKeranjang([...keranjang, { ...produk, qty: 1, subtotal: produk.hargaEcer }]);
    }
  };

  const totalHarga = keranjang.reduce((acc, item) => acc + item.subtotal, 0);

  const handleBayar = () => {
    if (keranjang.length === 0) {
      setShowEmptyWarning(true);
      return;
    }
    const transaksiBaru = {
      id: `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      tanggal: new Date().toLocaleString('id-ID'),
      items: [...keranjang],
      total: totalHarga
    };
    setProdukList(produkList.map(p => {
      const itemInCart = keranjang.find(i => i.id === p.id);
      return itemInCart ? { ...p, stok: p.stok - itemInCart.qty } : p;
    }));
    setRiwayat([transaksiBaru, ...riwayat]);
    setKeranjang([]);
    setShowSuccess(true);
  };

  // --- Logika Hapus Riwayat ---
  const hapusSatuRiwayat = (id: string) => {
    setRiwayat(riwayat.filter(h => h.id !== id));
    setDeleteTargetId(null);
  };

  const hapusSemuaRiwayat = () => {
    setRiwayat([]);
    setShowDeleteAllConfirm(false);
  };

  const filteredProduk = produkList
    .filter(p => selectedKategori === "Semua" || p.kategori === selectedKategori)
    .filter(p => p.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4 border-r border-slate-800">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-900/20">
          <Package size={28} />
        </div>
        
        <nav className="flex flex-col gap-3 pb-6 border-b border-slate-800 w-full items-center">
          <button onClick={() => setActiveTab('pos')} title="Kasir" className={`p-3 rounded-xl transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
            <ShoppingCart size={22}/>
          </button>
          <button onClick={() => setActiveTab('inventory')} title="Inventori" className={`p-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
            <LayoutGrid size={22}/>
          </button>
          <button onClick={() => setActiveTab('history')} title="Riwayat" className={`p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>
            <History size={22}/>
          </button>
        </nav>

        {activeTab === 'pos' && (
          <div className="flex flex-col gap-4 mt-2 items-center">
            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Filter</span>
            <button onClick={() => setSelectedKategori('Semua')} title="Semua" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Semua' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Boxes size={20}/></button>
            <button onClick={() => setSelectedKategori('Sembako')} title="Sembako" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Sembako' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Egg size={20}/></button>
            <button onClick={() => setSelectedKategori('Bumbu')} title="Bumbu" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Bumbu' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Flame size={20}/></button>
            <button onClick={() => setSelectedKategori('Rokok')} title="Rokok" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Rokok' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Cigarette size={20}/></button>
            <button onClick={() => setSelectedKategori('Kebersihan')} title="Kebersihan" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Kebersihan' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}><Waves size={20}/></button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                {activeTab === 'pos' ? `Kasir ${selectedKategori}` : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat'}
              </h1>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Cari barang..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20" onChange={(e) => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* POS VIEW */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProduk.map(p => (
                <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-500 cursor-pointer transition-all group shadow-sm overflow-hidden flex flex-col">
                  <div className="h-48 w-full overflow-hidden bg-slate-50 relative">
                    <img src={p.gambar} alt={p.nama} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="p-7">
                    <h3 className="text-lg font-bold text-slate-700 h-12 line-clamp-2">{p.nama}</h3>
                    <div className="flex justify-between items-end mt-5">
                      <div>
                        <p className="text-blue-600 font-black text-2xl tracking-tighter">Rp {p.hargaEcer.toLocaleString('id-ID')}</p>
                        <p className={`text-xs font-bold ${p.stok < 10 ? 'text-red-500' : 'text-slate-400'}`}>Stok: {p.stok}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={20} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INVENTORY VIEW */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6">Informasi Produk</th>
                    <th className="px-10 py-6">Kategori</th>
                    <th className="px-10 py-6 text-right">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-10 py-6 flex items-center gap-5">
                        <img src={p.gambar} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                        <span className="font-bold text-slate-700">{p.nama}</span>
                      </td>
                      <td className="px-10 py-6"><span className="text-[10px] bg-slate-100 px-4 py-1.5 rounded-full font-black text-slate-500 uppercase">{p.kategori}</span></td>
                      <td className="px-10 py-6 text-right font-black text-blue-600 text-xl">{p.stok}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* HISTORY VIEW */}
          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl">
              {riwayat.length > 0 && (
                <button onClick={() => setShowDeleteAllConfirm(true)} className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-5 py-2.5 rounded-xl transition-all ml-auto">
                  <Trash2 size={16}/> Bersihkan Riwayat
                </button>
              )}
              {riwayat.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <AlertCircle className="mx-auto text-slate-200 mb-4" size={56}/>
                  <p className="text-slate-400 font-bold text-lg">Tidak ada transaksi</p>
                </div>
              ) : (
                riwayat.map(h => (
                  <div key={h.id} onClick={() => setSelectedHistory(h)} className="group bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center hover:border-blue-500 cursor-pointer shadow-sm transition-all">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ReceiptText size={24}/></div>
                      <div>
                        <p className="font-black text-slate-800 text-lg">{h.id}</p>
                        <p className="text-xs text-slate-400 font-bold">{h.tanggal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <p className="font-black text-blue-600 text-2xl tracking-tighter">Rp {h.total.toLocaleString('id-ID')}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteTargetId(h.id); }} 
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X size={20}/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* CART SIDEBAR */}
        {activeTab === 'pos' && (
          <aside className="w-[400px] bg-white border-l border-slate-100 p-10 flex flex-col shadow-2xl">
            <h2 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
              <ShoppingCart className="text-blue-600" size={28}/> Pesanan
            </h2>
            <div className="flex-1 overflow-y-auto space-y-5">
              {keranjang.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <ShoppingCart size={80} className="mb-6"/>
                  <p className="font-black italic">KOSONG</p>
                </div>
              ) : (
                keranjang.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-5 rounded-[1.5rem]">
                    <div className="flex gap-4">
                      <img src={item.gambar} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="font-black text-slate-700 text-sm">{item.nama}</p>
                        <p className="text-xs text-blue-600 font-black">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400"><X size={14}/></button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-8 border-t-2 border-dashed border-slate-100 mt-8 space-y-6">
              <div className="flex justify-between items-end">
                <span className="font-black text-slate-400 text-xs uppercase tracking-widest">Total</span>
                <span className="text-4xl font-black text-blue-600">Rp {totalHarga.toLocaleString('id-ID')}</span>
              </div>
              <button onClick={handleBayar} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all">BAYAR SEKARANG</button>
            </div>
          </aside>
        )}
      </div>

      {/* --- POPUPS / MODALS --- */}
      
      {/* BERHASIL BAYAR */}
      {showSuccess && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 shadow-2xl text-center">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 border-8 border-green-100"><CheckCircle2 size={48} /></div>
            <h2 className="text-3xl font-black text-slate-800 mb-10">Berhasil!</h2>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase">Lanjutkan</button>
          </div>
        </div>
      )}

      {/* DETAIL RIWAYAT */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
            <button onClick={() => setSelectedHistory(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X size={28} /></button>
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800"><ReceiptText className="text-blue-600" size={32}/> Struk Belanja</h2>
            <div className="space-y-4 mb-10 max-h-72 overflow-y-auto">
              {selectedHistory.items.map((item, i) => (
                <div key={i} className="flex justify-between border-b border-slate-50 pb-4">
                  <div>
                    <p className="font-black text-slate-700 text-sm">{item.nama}</p>
                    <p className="text-xs text-slate-400">Qty: {item.qty} pcs</p>
                  </div>
                  <span className="font-black text-slate-800">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 p-6 rounded-[2rem] flex justify-between items-center">
              <span className="font-black text-blue-400 uppercase text-[10px]">Total Tagihan</span>
              <span className="text-3xl font-black text-blue-600">Rp {selectedHistory.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}

      {/* KONFIRMASI HAPUS SATU */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Hapus Transaksi?</h3>
            <p className="text-slate-500 text-sm mb-8">Data transaksi <b>{deleteTargetId}</b> akan dihapus permanen.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setDeleteTargetId(null)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Batal</button>
              <button onClick={() => hapusSatuRiwayat(deleteTargetId)} className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* KONFIRMASI HAPUS SEMUA */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-red-900/60 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={40} /></div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Kosongkan Riwayat?</h3>
            <p className="text-slate-500 text-sm mb-8">Semua data transaksi akan hilang selamanya.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowDeleteAllConfirm(false)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Batal</button>
              <button onClick={hapusSemuaRiwayat} className="py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200">Ya, Kosongkan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;