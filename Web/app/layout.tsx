import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem Kasir Sederhana",
  description: "Aplikasi Kasir Sederhana Next.js",
};

// Komponen Navbar untuk navigasi
function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-xl font-bold">
          Kasir App
        </Link>
        <div className="space-x-4">
          <Link href="/products" className="text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
            Produk
          </Link>
          <Link href="/kasir" className="text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
            Kasir
          </Link>
          <Link href="/laporan" className="text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
            Laporan
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        <div className="flex-grow max-w-7xl mx-auto w-full p-4">
          {children}
        </div>
      </body>
    </html>
  );
}