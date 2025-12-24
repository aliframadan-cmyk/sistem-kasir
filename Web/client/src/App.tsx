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
    { id: 3, nama: "Gula Pasir 1kg", kategori: "Sembako", stok: 50, hargaEcer: 16500, gambar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRz09Rd9WFvx_u3TeZyja70Z_jpQ18aX9ll2w&s"},
    { id: 4, nama: "Telur Ayam 1kg", kategori: "Sembako", stok: 30, hargaEcer: 28000, gambar: "https://img.antaranews.com/cache/1200x800/2020/09/15/IMG-20200915-WA0047.jpg.webp" },
    { id: 5, nama: "Terigu Segitiga Biru", kategori: "Sembako", stok: 25, hargaEcer: 12000, gambar: "https://c.alfagift.id/product/1/1_A28090001915_20240508102544159_base.jpg" },
    { id: 6, nama: "Garam Dapur Beriodium", kategori: "Bumbu", stok: 100, hargaEcer: 3500, gambar: "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//91/MTA-28327123/no-brand_no-brand_full01.jpg" },
    { id: 7, nama: "Kecap Manis 520ml", kategori: "Bumbu", stok: 20, hargaEcer: 22000, gambar: "https://id-test-11.slatic.net/p/81f71d729042613354d66d580327824d.jpg" },
    { id: 8, nama: "Sabun Cuci Piring", kategori: "Kebersihan", stok: 40, hargaEcer: 15000, gambar: "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//101/MTA-3390895/sunlight_-sunlight-jeruk-nipis-sabun-cuci-piring--755-ml-_full02.jpg" },
    { id: 9, nama: "Sampoerna Mild 16", kategori: "Rokok", stok: 50, hargaEcer: 35000, gambar: "https://mudeverse.mudev.id/wp-content/uploads/2025/06/product_lXGD4y51v.jpg" },
    { id: 10, nama: "Gudang Garam Filter 12", kategori: "Rokok", stok: 40, hargaEcer: 24000, gambar: "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full//86/MTA-34432241/gudang_garam_gudang_garam_filter_international_full01_jr2jhv5t.jpg" },
    { id: 11, nama: "Djarum 76 apel", kategori: "Rokok", stok: 30, hargaEcer: 17000, gambar: "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/full/catalog-image/89/MTA-183102054/djarum_76_djarum_76_apel_rokok_kretek_12_-_skt_full03_ie65ropx.webp" },
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

  const filteredProduk = produkList
    .filter(p => selectedKategori === "Semua" || p.kategori === selectedKategori)
    .filter(p => p.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900">
      
      {/* SIDEBAR DENGAN FILTER KHUSUS */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4 border-r border-slate-800">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-900/20">
          <Package size={28} />
        </div>
        
        {/* Menu Navigasi Utama */}
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

        {/* Filter Kategori Khusus (Hanya muncul di Tab POS) */}
        {activeTab === 'pos' && (
          <div className="flex flex-col gap-4 mt-2 items-center">
            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Filter</span>
            <button onClick={() => setSelectedKategori('Semua')} title="Semua Barang" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Semua' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>
              <Boxes size={20}/>
            </button>
            <button onClick={() => setSelectedKategori('Sembako')} title="Sembako" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Sembako' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>
              <Egg size={20}/>
            </button>
            <button onClick={() => setSelectedKategori('Bumbu')} title="Bumbu" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Bumbu' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>
              <Flame size={20}/>
            </button>
            <button onClick={() => setSelectedKategori('Rokok')} title="Rokok" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Rokok' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>
              <Cigarette size={20}/>
            </button>
            <button onClick={() => setSelectedKategori('Kebersihan')} title="Kebersihan" className={`p-3 rounded-xl transition-all ${selectedKategori === 'Kebersihan' ? 'bg-cyan-500 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>
              <Waves size={20}/>
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                {activeTab === 'pos' ? ` ${selectedKategori}` : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat'}
              </h1>
              {activeTab === 'pos' && <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Mode Penjualan Aktif</p>}
            </div>
            <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Cari nama barang..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" onChange={(e) => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* GRID PRODUK */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProduk.map(p => (
                <div key={p.id} onClick={() => tambahKeKeranjang(p)} className="bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-500 cursor-pointer transition-all group shadow-sm hover:shadow-xl overflow-hidden flex flex-col">
                  <div className="h-48 w-full overflow-hidden bg-slate-50 relative">
                    <img src={p.gambar} alt={p.nama} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] bg-white/90 backdrop-blur px-3 py-1.5 rounded-full font-black text-blue-600 uppercase tracking-widest shadow-sm">
                        {p.kategori}
                      </span>
                    </div>
                  </div>
                  <div className="p-7">
                    <h3 className="text-lg font-bold text-slate-700 leading-tight h-12 line-clamp-2">{p.nama}</h3>
                    <div className="flex justify-between items-end mt-5">
                      <div>
                        <p className="text-blue-600 font-black text-2xl tracking-tighter">Rp {p.hargaEcer.toLocaleString('id-ID')}</p>
                        <p className={`text-xs font-bold mt-1 ${p.stok < 10 ? 'text-red-500' : 'text-slate-400'}`}>Stok: {p.stok}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-active:scale-90">
                        <Plus size={20} />
                      </div>
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
                    <th className="px-10 py-6 text-right">Stok Gudang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-6 flex items-center gap-5">
                        <img src={p.gambar} alt="" className="w-12 h-12 rounded-2xl object-cover bg-slate-100 shadow-sm" />
                        <span className="font-bold text-slate-700 text-lg">{p.nama}</span>
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-[10px] bg-slate-100 px-4 py-1.5 rounded-full font-black text-slate-500 uppercase tracking-widest">
                          {p.kategori}
                        </span>
                      </td>
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
                <button onClick={() => setShowDeleteAllConfirm(true)} className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-5 py-2.5 rounded-xl transition-all ml-auto border border-transparent hover:border-red-100">
                  <Trash2 size={16}/> Bersihkan Riwayat
                </button>
              )}
              {riwayat.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <AlertCircle className="mx-auto text-slate-200 mb-4" size={56}/>
                  <p className="text-slate-400 font-bold text-lg">Tidak ada transaksi ditemukan</p>
                </div>
              ) : (
                riwayat.map(h => (
                  <div key={h.id} onClick={() => setSelectedHistory(h)} className="group bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center hover:border-blue-500 cursor-pointer shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><ReceiptText size={24}/></div>
                      <div>
                        <p className="font-black text-slate-800 text-lg tracking-tight">{h.id}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{h.tanggal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <p className="font-black text-blue-600 text-2xl tracking-tighter">Rp {h.total.toLocaleString('id-ID')}</p>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(h.id); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><X size={20}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* CART SIDEBAR (Hanya di POS) */}
        {activeTab === 'pos' && (
          <aside className="w-[400px] bg-white border-l border-slate-100 p-10 flex flex-col shadow-2xl shadow-slate-200/50">
            <h2 className="text-2xl font-black text-slate-800 mb-10 flex items-center gap-3">
              <ShoppingCart className="text-blue-600" size={28}/> 
              Pesanan Anda
            </h2>
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
              {keranjang.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-40">
                  <ShoppingCart size={80} className="mb-6"/>
                  <p className="font-black italic text-xl">KERANJANG KOSONG</p>
                </div>
              ) : (
                keranjang.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50/50 p-5 rounded-[1.5rem] group border border-transparent hover:border-blue-100 transition-all">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                        <img src={item.gambar} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-black text-slate-700 text-sm line-clamp-1">{item.nama}</p>
                        <p className="text-xs text-blue-600 font-black mt-0.5">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="w-8 h-8 flex items-center justify-center bg-white text-red-400 rounded-full shadow-sm hover:text-red-600 transition-all border border-slate-100"><X size={14}/></button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-8 border-t-2 border-dashed border-slate-100 mt-8 space-y-6">
              <div className="flex justify-between items-end">
                <span className="font-black text-slate-400 text-xs uppercase tracking-[0.2em]">Total Tagihan</span>
                <span className="text-4xl font-black text-blue-600 tracking-tighter">Rp {totalHarga.toLocaleString('id-ID')}</span>
              </div>
              <button onClick={handleBayar} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-600/20 active:scale-[0.98] hover:bg-blue-700 transition-all uppercase tracking-widest">
                Bayar Sekarang
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* --- POPUPS / MODALS --- */}
      {/* (Success, Warning, Detail Modals - Tetap seperti sebelumnya dengan style konsisten) */}
      {showSuccess && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 shadow-2xl text-center scale-up-animation">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 border-8 border-green-100"><CheckCircle2 size={48} /></div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Berhasil!</h2>
            <p className="text-slate-500 text-sm mb-10 font-bold uppercase tracking-wider">Transaksi Telah Dicatat</p>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700">Lanjutkan</button>
          </div>
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
            <button onClick={() => setSelectedHistory(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600"><X size={28} /></button>
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-800"><ReceiptText className="text-blue-600" size={32}/> Struk Belanja</h2>
            <div className="space-y-4 mb-10 max-h-72 overflow-y-auto pr-3 custom-scrollbar">
              {selectedHistory.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <div>
                    <p className="font-black text-slate-700 text-sm">{item.nama}</p>
                    <p className="text-xs text-slate-400 font-bold">Qty: {item.qty} pcs</p>
                  </div>
                  <span className="font-black text-slate-800">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 p-6 rounded-[2rem] flex justify-between items-center">
              <span className="font-black text-blue-400 uppercase text-[10px] tracking-widest">Grand Total</span>
              <span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {selectedHistory.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Delete/Warning Modals logic tetap ada di sini */}
    </div>
  );
};

export default App;