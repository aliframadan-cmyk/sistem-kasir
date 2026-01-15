import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-white dark:bg-zinc-900 rounded-lg shadow-xl mt-10">
      <h1 className="text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">
        Selamat Datang di Sistem Kasir Sederhana
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Silakan gunakan navigasi di atas untuk mengakses fitur-fitur aplikasi.
      </p>
      
      <div className="flex gap-4">
        <Link 
          href="/kasir"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
        >
          Mulai Transaksi (Kasir)
        </Link>
        <Link
          href="/products"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-md"
        >
          Lihat Daftar Produk
        </Link>
      </div>
    </div>
  );
}