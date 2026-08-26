"use client";

import { CreditCard, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const KARTU_PELAJAR_URL = "https://e-kartu.smklimpung.id";

// Sengaja dibuat sebagai strip promo yang ramping dan ringan (bukan blok
// hero besar seperti header dashboard/Data Siswa) — bila keduanya memakai
// bentuk yang sama (rounded besar, background solid penuh, dekorasi
// lingkaran blur), banner ini akan terkesan menyaingi header alih-alih
// jadi elemen sekunder. Dipakai di Data Siswa (Admin/Guru) & Dashboard Siswa.
export function KartuPelajarBanner({
  description = "Cek & cetak kartu pelajar siswa lewat portal e-Kartu",
}: {
  description?: string;
}) {
  return (
    <motion.a
      href={KARTU_PELAJAR_URL}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
      className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-[#FF7A00] bg-[#FFF4E9] p-4 shadow-sm transition-colors hover:bg-[#FFF4E9]/70 sm:flex-row sm:items-center sm:justify-between dark:border-[#FF7A00]/30 dark:bg-[#FF7A00]/10 dark:hover:bg-[#FF7A00]/15"
    >
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm animate-pulse [animation-duration:2.5s]"
          style={{ background: "#FF7A00" }}>
          <CreditCard size={20} />
        </div>
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <p className="text-sm font-extrabold text-[#FF7A00] dark:text-[#FF7A00]">Kartu Pelajar Digital</p>
            <span className="rounded-lg bg-[#FF7A00] px-2 py-0.5 text-[9px] font-bold text-white">Baru</span>
          </div>
          <p className="text-xs text-[#7A4A1E]/80 dark:text-[#FF7A00]/70">{description}</p>
        </div>
      </div>

      <span className="flex shrink-0 items-center gap-1.5 self-start rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-transform group-hover:translate-x-0.5 sm:self-auto"
        style={{ background: "#FF7A00" }}>
        Buka e-Kartu
        <ArrowUpRight size={14} />
      </span>
    </motion.a>
  );
}
