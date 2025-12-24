import React, { useState } from 'react';
import { 
  LayoutGrid, ShoppingCart, Package, History, Search, Plus, 
  Trash2, X, CheckCircle2, ReceiptText, AlertCircle
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
  
  // State Baru untuk Filter Kategori
  const [selectedKategori, setSelectedKategori] = useState<string>("Semua");

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // --- Data Produk (Sudah Ditambah Rokok & Kategori Dipisah) ---
  const [produkList, setProdukList] = useState<Produk[]>([
    { id: 1, nama: "Beras Premium 5kg", kategori: "Sembako", stok: 20, hargaEcer: 75000, gambar: "https://akcdn.detik.net.id/visual/2023/10/10/ilustrasi-beras_169.jpeg?w=750&q=90" },
    { id: 2, nama: "Minyak Goreng 2L", kategori: "Sembako", stok: 15, hargaEcer: 34000, gambar: "https://image.dailymartazzahra.com/s3/productimages/webp/co37129/p647771/w600-h600/68d96bd8-9169-4913-9306-e65cad8c5075.jpg"},
    { id: 3, nama: "Gula Pasir 1kg", kategori: "Sembako", stok: 50, hargaEcer: 16500, gambar: "https://images.unsplash.com/photo-1581007871115-f14bc016e0a4?w=400"},
    { id: 4, nama: "Telur Ayam 1kg", kategori: "Sembako", stok: 30, hargaEcer: 28000, gambar: "https://images.unsplash.com/photo-1582722872445-44c501f3c89d?w=400" },
    { id: 5, nama: "Terigu Segitiga Biru", kategori: "Sembako", stok: 25, hargaEcer: 12000, gambar: "https://c.alfagift.id/product/1/1_A28090001915_20240508102544159_base.jpg" },
    { id: 6, nama: "Garam Dapur Beriodium", kategori: "Bumbu", stok: 100, hargaEcer: 3500, gambar: "https://images.unsplash.com/photo-1610450534241-1f9532658428?w=400" },
    { id: 7, nama: "Kecap Manis 520ml", kategori: "Bumbu", stok: 20, hargaEcer: 22000, gambar: "https://images.unsplash.com/photo-1622359570138-02830206148a?q=80&w=400&auto=format&fit=crop" },
    { id: 8, nama: "Sabun Cuci Piring", kategori: "Kebersihan", stok: 40, hargaEcer: 15000, gambar: "https://images.unsplash.com/photo-1584622781564-1d9876a13d1e?q=80&w=400&auto=format&fit=crop" },
    // TAMBAHAN PRODUK ROKOK
    { id: 9, nama: "Sampoerna Mild 16", kategori: "Rokok", stok: 50, hargaEcer: 35000, gambar: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?w=400" },
    { id: 10, nama: "Gudang Garam Filter 12", kategori: "Rokok", stok: 40, hargaEcer: 24000, gambar: "https://images.unsplash.com/photo-1623945410152-30128956973e?w=400" },
    { id: 11, nama: "Djarum Super 12", kategori: "Rokok", stok: 30, hargaEcer: 23000, gambar: "https://images.unsplash.com/photo-1568200234200-a53b51b32f91?w=400" },
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

  const hapusSatuRiwayat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const eksekusiHapusSatu = () => {
    setRiwayat(riwayat.filter(item => item.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const hapusSemuaRiwayat = () => {
    setShowDeleteAllConfirm(true);
  };

  const eksekusiHapusSemua = () => {
    setRiwayat([]);
    setShowDeleteAllConfirm(false);
  };

  // --- Filter Logic ---
  const filteredProduk = produkList
    .filter(p => selectedKategori === "Semua" || p.kategori === selectedKategori)
    .filter(p => p.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-20 bg-[#0F172A] flex flex-col items-center py-6 gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-900/20"><Package size={28} /></div>
        <nav className="flex flex-col gap-4">
          <button onClick={() => setActiveTab('pos')} className={`p-3 rounded-xl transition-all ${activeTab === 'pos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}><ShoppingCart size={24}/></button>
          <button onClick={() => setActiveTab('inventory')} className={`p-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={24}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}><History size={24}/></button>
        </nav>
      </aside>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
              {activeTab === 'pos' ? 'Kasir Sembako' : activeTab === 'inventory' ? 'Stok Barang' : 'Riwayat Penjualan'}
            </h1>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" placeholder="Cari..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500" onChange={(e) => setSearch(e.target.value)}/>
            </div>
          </div>

          {/* POS VIEW DENGAN TAB KATEGORI */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              {/* TOMBOL TAB KATEGORI */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {["Semua", "Sembako", "Bumbu", "Rokok", "Kebersihan"].map((kat) => (
                  <button
                    key={kat}
                    onClick={() => setSelectedKategori(kat)}
                    className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                      selectedKategori === kat 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                        : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    {kat}
                  </button>
                ))}
              </div>

              {/* GRID PRODUK */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProduk.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => tambahKeKeranjang(p)} 
                    className="bg-white rounded-[2rem] border border-slate-100 hover:border-blue-500 cursor-pointer transition-all group shadow-sm hover:shadow-xl overflow-hidden"
                  >
                    <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                      <img 
                        src={p.gambar} 
                        alt={p.nama} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="text-[10px] bg-white/90 backdrop-blur px-3 py-1 rounded-full font-black text-blue-600 uppercase tracking-widest shadow-sm">
                          {p.kategori}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-700 leading-tight h-12 line-clamp-2">{p.nama}</h3>
                      <div className="flex justify-between items-end mt-4">
                        <div>
                          <p className="text-blue-600 font-black text-xl">Rp {p.hargaEcer.toLocaleString('id-ID')}</p>
                          <p className={`text-xs font-bold mt-1 ${p.stok < 10 ? 'text-red-500' : 'text-slate-400'}`}>
                            Stok: {p.stok}
                          </p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Plus size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVENTORY VIEW */}
          {activeTab === 'inventory' && (
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Barang</th>
                    <th className="px-8 py-5">Kategori</th>
                    <th className="px-8 py-5 text-right">Tersedia (Stok)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {produkList.filter(p => p.nama.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <img src={p.gambar} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                        <span className="font-bold text-slate-700">{p.nama}</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-full font-black text-slate-400 uppercase tracking-wider">
                          {p.kategori}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-blue-600 text-lg">{p.stok}</td>
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
                <button onClick={hapusSemuaRiwayat} className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-lg transition-all ml-auto">
                  <Trash2 size={16}/> Hapus Semua Riwayat
                </button>
              )}
              {riwayat.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                  <AlertCircle className="mx-auto text-slate-200 mb-4" size={48}/>
                  <p className="text-slate-400 font-bold">Belum ada riwayat transaksi</p>
                </div>
              ) : (
                riwayat.map(h => (
                  <div key={h.id} onClick={() => setSelectedHistory(h)} className="group bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-blue-500 cursor-pointer shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ReceiptText/></div>
                      <div><p className="font-bold text-slate-800">{h.id}</p><p className="text-xs text-slate-400 font-medium">{h.tanggal}</p></div>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-black text-blue-600 text-lg">Rp {h.total.toLocaleString('id-ID')}</p>
                      <button onClick={(e) => hapusSatuRiwayat(e, h.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* CART SIDEBAR */}
        {activeTab === 'pos' && (
          <aside className="w-96 bg-white border-l border-slate-100 p-8 flex flex-col shadow-2xl shadow-slate-200/50">
            <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> Pesanan</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {keranjang.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200">
                  <ShoppingCart size={64} className="mb-4 opacity-20"/>
                  <p className="font-bold italic">Belum ada barang</p>
                </div>
              ) : (
                keranjang.map(item => (
                  <div key={item.id} className="flex justify-between items-start bg-slate-50 p-4 rounded-2xl group border border-transparent hover:border-blue-100">
                    <div className="flex gap-3">
                      <img src={item.gambar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-bold text-sm text-slate-700 line-clamp-1">{item.nama}</p>
                        <p className="text-xs text-slate-400 font-bold">{item.qty} x Rp {item.hargaEcer.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <button onClick={() => setKeranjang(keranjang.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 transition-all"><X size={16}/></button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-6 border-t border-dashed border-slate-200 mt-6 space-y-4">
              <div className="flex justify-between items-end"><span className="font-bold text-slate-400 text-sm">TOTAL</span><span className="text-3xl font-black text-blue-600 tracking-tighter">Rp {totalHarga.toLocaleString('id-ID')}</span></div>
              <button onClick={handleBayar} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all">BAYAR SEKARANG</button>
            </div>
          </aside>
        )}
      </div>

      {/* --- POPUPS --- */}
      {showEmptyWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-100"><ShoppingCart size={40} /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Oops! Keranjang Kosong</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Pilih barang terlebih dahulu sebelum lanjut ke pembayaran.</p>
            <button onClick={() => setShowEmptyWarning(false)} className="w-full bg-[#14B8A6] text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-teal-500/20">OKE, SAYA MENGERTI</button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100"><CheckCircle2 size={40} /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Berhasil!</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Stok sudah diperbarui dan transaksi tercatat.</p>
            <button onClick={() => setShowSuccess(false)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-blue-500/20">MANTAP!</button>
          </div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100"><Trash2 size={40} /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Hapus Semua?</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Anda yakin ingin menghapus SEMUA riwayat transaksi?</p>
            <div className="flex flex-col gap-3">
              <button onClick={eksekusiHapusSemua} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-red-500/20">YA, HAPUS SEMUA</button>
              <button onClick={() => setShowDeleteAllConfirm(false)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[120] p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100"><AlertCircle size={40} /></div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Hapus Transaksi?</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Hapus catatan <span className="font-bold text-slate-800">{deleteTargetId}</span>?</p>
            <div className="flex flex-col gap-3">
              <button onClick={eksekusiHapusSatu} className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase shadow-lg shadow-red-500/20">YA, HAPUS</button>
              <button onClick={() => setDeleteTargetId(null)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-slate-800">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
            <button onClick={() => setSelectedHistory(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600"><X size={24} /></button>
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-800 tracking-tight"><ReceiptText className="text-blue-600"/> Rincian Belanja</h2>
            <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2">
              {selectedHistory.items.map((item, i) => (
                <div key={i} className="flex justify-between border-b border-slate-50 pb-3 text-sm font-medium">
                  <span>{item.nama} <span className="text-slate-400">x{item.qty}</span></span>
                  <span className="font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-5 rounded-2xl">
              <span className="font-bold text-blue-400 uppercase text-[10px] tracking-widest">Total Bayar</span>
              <span className="text-2xl font-black text-blue-600 tracking-tighter">Rp {selectedHistory.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;