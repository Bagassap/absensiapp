"use client";

import { motion } from "framer-motion";
import { Users, Eye, Camera, PenTool, ChevronLeft, ChevronRight, Check, StickyNote, Trash2, Loader2 } from "lucide-react";
import { PageSizeToggle } from "@/components/shared/PageSizeToggle";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColor, parseLokasi } from "./shared";
import type { AbsensiKegiatanRow } from "./types";

// Mobile (<640px) hanya menampilkan kolom penting (avatar, Nama, Kegiatan, Jam,
// Aksi) — kolom No./Lokasi/Foto/TTD disembunyikan (bukan cuma diperkecil)
// karena 9 kolom penuh tidak muat di layar ~360-390px tanpa memaksa teks jadi
// 0px lebar; detail lengkapnya tetap bisa dilihat lewat tombol "Lihat".
const GRID_COLS_MOBILE = "grid-cols-[36px_2fr_1.4fr_44px_80px]";
const GRID_COLS_DESKTOP = "sm:grid-cols-[24px_36px_2fr_1.6fr_0.9fr_1.2fr_44px_44px_88px]";
const ROW_GRID = `grid ${GRID_COLS_MOBILE} ${GRID_COLS_DESKTOP}`;

type Props = {
  loading: boolean;
  hasKegiatan: boolean;
  filteredRows: AbsensiKegiatanRow[];
  pagedRows: AbsensiKegiatanRow[];
  tableStart: number;
  tableEnd: number;
  tablePage: number;
  setTablePage: React.Dispatch<React.SetStateAction<number>>;
  tablePageCount: number;
  tablePageSize: number;
  setTablePageSize: (n: number) => void;
  onOpenDokumen: (row: AbsensiKegiatanRow) => void;
  // Hapus absensi — khusus admin & superadmin (halaman ini sendiri sudah
  // dibatasi Role.ADMIN, jadi tidak perlu guard tambahan di sisi UI).
  onDelete?: (row: AbsensiKegiatanRow) => void;
  deletingId?: string | null;
};

export function AbsensiHarianTable({
  loading, hasKegiatan, filteredRows, pagedRows, tableStart, tableEnd,
  tablePage, setTablePage, tablePageCount, tablePageSize, setTablePageSize,
  onOpenDokumen, onDelete, deletingId,
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 space-y-3 p-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  if (!hasKegiatan) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Users size={24} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Belum ada kegiatan untuk tanggal ini</p>
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Users size={24} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Belum ada guru yang absen</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-hidden">
        <div className={`${ROW_GRID} items-center gap-2 px-5 py-3`} style={{ backgroundColor: "#013920" }}>
          <span className="hidden sm:block" />
          <span />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">Nama</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white">Kegiatan</span>
          <span className="text-center text-[10px] font-bold uppercase tracking-wider text-white">Jam</span>
          <span className="hidden text-[10px] font-bold uppercase tracking-wider text-white sm:block">Lokasi</span>
          <span className="hidden text-center text-[10px] font-bold uppercase tracking-wider text-white sm:block">Foto</span>
          <span className="hidden text-center text-[10px] font-bold uppercase tracking-wider text-white sm:block">TTD</span>
          <span className="text-right text-[10px] font-bold uppercase tracking-wider text-white">Aksi</span>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
          {pagedRows.map((r, idx) => {
            const ac = avatarColor(r.nama ?? "-");
            const lokasiParsed = parseLokasi(r.lokasi);
            const openDokumen = () => onOpenDokumen(r);
            return (
              <motion.div key={r.id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                className={`${ROW_GRID} items-center gap-2 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20`}>
                <span className="hidden text-center text-[11px] font-bold text-slate-300 dark:text-slate-600 sm:block">{tableStart + idx}</span>
                <Avatar
                  src={r.fotoProfil}
                  nama={r.nama ?? "-"}
                  sizePx={32}
                  fallbackBg={ac}
                  textClassName="text-[10px] font-extrabold"
                />
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span className="truncate">{r.nama ?? "-"}</span>
                    {r.verified && (
                      <span title="Terverifikasi" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: "#3B82F6" }}>
                        <Check size={11} className="text-white" strokeWidth={3.5} />
                      </span>
                    )}
                  </p>
                  {r.catatan && (
                    <p title={r.catatan} className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] font-medium" style={{ color: "#3B82F6" }}>
                      <StickyNote size={11} className="shrink-0" />
                      <span className="truncate">{r.catatan}</span>
                    </p>
                  )}
                </div>
                <p className="flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="truncate">{r.kegiatanNama}</span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white"
                    style={{ backgroundColor: r.status === "IZIN" ? "#F59E0B" : "#00C853" }}>
                    {r.status === "IZIN" ? "Izin" : "Hadir"}
                  </span>
                </p>
                <span className="text-center text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">{r.waktuAbsen}</span>
                <div className="hidden min-w-0 sm:block">
                  {lokasiParsed ? (
                    <button onClick={openDokumen} title="Lihat lokasi absen"
                      className="block max-w-full truncate text-left text-[11px] text-[#000000] hover:underline">
                      {lokasiParsed.lat.slice(0, 8)}…
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                </div>
                <div className="hidden justify-center sm:flex">
                  {r.foto ? (
                    <button onClick={openDokumen} title="Lihat foto selfie"
                      className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                      <Camera size={13} className="text-emerald-500" />
                    </button>
                  ) : <Camera size={13} className="text-slate-200 dark:text-slate-700" />}
                </div>
                <div className="hidden justify-center sm:flex">
                  {r.ttd ? (
                    <button onClick={openDokumen} title="Lihat tanda tangan"
                      className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-[#00C853] dark:hover:bg-[#013920]/20">
                      <PenTool size={13} className="text-[#000000]" />
                    </button>
                  ) : <PenTool size={13} className="text-slate-200 dark:text-slate-700" />}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={openDokumen} title="Lihat detail"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
                    style={{ background: "#00C853" }}>
                    <Eye size={13} />
                  </button>
                  {onDelete && (
                    <button onClick={() => onDelete(r)} disabled={deletingId === r.id} title="Hapus absensi"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-60"
                      style={{ background: "#EF4444" }}>
                      {deletingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      {filteredRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/40 px-5 py-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {tableStart}–{tableEnd} dari {filteredRows.length}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Tampilkan:</span>
            <PageSizeToggle value={tablePageSize} onChange={setTablePageSize} />
            {tablePageCount > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setTablePage((p) => Math.max(0, p - 1))} disabled={tablePage === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: tablePageCount }, (_, i) => i)
                  .filter((i) => i === 0 || i === tablePageCount - 1 || Math.abs(i - tablePage) <= 1)
                  .map((i, idx, arr) => (
                    <span key={i} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== i - 1 && (
                        <span className="px-1 text-xs font-semibold text-slate-300 dark:text-slate-600">…</span>
                      )}
                      <button onClick={() => setTablePage(i)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          i === tablePage
                            ? "bg-[#00C853] text-white shadow-sm"
                            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        }`}>
                        {i + 1}
                      </button>
                    </span>
                  ))}
                <button onClick={() => setTablePage((p) => Math.min(tablePageCount - 1, p + 1))} disabled={tablePage >= tablePageCount - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
