"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Eye, Camera, PenTool, ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { PageSizeToggle } from "@/components/shared/PageSizeToggle";
import { Avatar } from "@/components/shared/Avatar";
import { useToast } from "@/components/shared/ToastSystem";
import { StatusBadge } from "./StatusBadge";
import { STATUS_CFG, PULANG_CFG, avatarColor, parseLokasi } from "./shared";
import type { SiswaAbsensi, StatusAbsensi, FilterAbsensi } from "./types";

const GRID_COLS = "28px 40px 2.2fr 1.3fr 1fr 1fr 1.3fr 60px 60px 116px";

type Props = {
  loading: boolean;
  hasSiswa: boolean;
  filteredSiswa: SiswaAbsensi[];
  pagedSiswa: SiswaAbsensi[];
  tableStart: number;
  tableEnd: number;
  activeFilter: FilterAbsensi | null;
  tablePage: number;
  setTablePage: React.Dispatch<React.SetStateAction<number>>;
  tablePageCount: number;
  tablePageSize: number;
  setTablePageSize: (n: number) => void;
  onOpenDokumen: (siswa: SiswaAbsensi, source: "hadir" | "pulang") => void;
  /** Kelas & tanggal yang sedang ditampilkan — dipakai untuk memanggil endpoint
   * update saat admin/guru mengedit status kehadiran langsung dari tabel ini. */
  kelasId?: string;
  tanggal?: string;
  onStatusUpdated?: () => void;
};

export function AbsensiHarianTable({
  loading, hasSiswa, filteredSiswa, pagedSiswa, tableStart, tableEnd, activeFilter,
  tablePage, setTablePage, tablePageCount, tablePageSize, setTablePageSize,
  onOpenDokumen, kelasId, tanggal, onStatusUpdated,
}: Props) {
  const toast = useToast();
  const [editingSiswaId, setEditingSiswaId] = useState<string | null>(null);
  const [savingSiswaId, setSavingSiswaId] = useState<string | null>(null);
  const canEdit = !!kelasId && !!tanggal;

  async function saveStatus(siswaId: string, status: StatusAbsensi) {
    if (!kelasId || !tanggal) return;
    setSavingSiswaId(siswaId);
    try {
      const res = await fetch("/api/absensi-harian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId, tanggal, absensi: [{ siswaId, status }] }),
      });
      if (res.ok) {
        toast.success("Status kehadiran diperbarui", "");
        onStatusUpdated?.();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal memperbarui status", "");
      }
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setSavingSiswaId(null);
      setEditingSiswaId(null);
    }
  }
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

  if (!hasSiswa) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Users size={24} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Belum ada siswa di kelas ini</p>
      </div>
    );
  }

  if (filteredSiswa.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Users size={24} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Tidak ada siswa dengan status ini</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-225">
          <div className="grid items-center gap-3 px-5 py-3" style={{ gridTemplateColumns: GRID_COLS, backgroundColor: "#1C2B33" }}>
            <span />
            <span />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Nama</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">NIS</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Status</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wider text-white">Waktu</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Lokasi</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wider text-white">Foto</span>
            <span className="text-center text-[10px] font-bold uppercase tracking-wider text-white">TTD</span>
            <span className="text-right text-[10px] font-bold uppercase tracking-wider text-white">Aksi</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {pagedSiswa.map((s, idx) => {
              const ac = avatarColor(s.nama);
              const isPulangView = activeFilter === "PULANG";
              const waktu = isPulangView ? s.waktuPulang : s.waktuAbsen;
              const lokasiRaw = isPulangView ? s.lokasiPulang : s.lokasi;
              const fotoRaw = isPulangView ? s.fotoPulang : s.foto;
              const ttdRaw = isPulangView ? s.ttdPulang : s.ttd;
              const hasDok = !!(ttdRaw || lokasiRaw || fotoRaw);
              const lokasiParsed = parseLokasi(lokasiRaw);
              const isEditingRow = editingSiswaId === s.siswaId;
              const isSavingRow = savingSiswaId === s.siswaId;
              const openDokumen = () => onOpenDokumen(s, isPulangView ? "pulang" : "hadir");
              return (
                <motion.div key={s.siswaId}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                  className="grid items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20"
                  style={{ gridTemplateColumns: GRID_COLS }}>
                  <span className="text-center text-[11px] font-bold text-slate-300 dark:text-slate-600">{tableStart + idx}</span>
                  <Avatar
                    src={s.fotoProfil}
                    nama={s.nama}
                    sizePx={36}
                    fallbackBg={ac}
                    textClassName="text-[10px] font-extrabold"
                  />
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{s.nama}</p>
                  <p className="truncate text-xs font-medium tabular-nums text-slate-400 dark:text-slate-500">{s.nis ?? "—"}</p>
                  {isPulangView ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                      style={{ backgroundColor: PULANG_CFG.bg, color: PULANG_CFG.clr }}>
                      <PULANG_CFG.icon size={10} /> Pulang
                    </span>
                  ) : isEditingRow ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {(["HADIR", "IZIN", "SAKIT", "ALPA"] as StatusAbsensi[]).map((st) => {
                        const cfg = STATUS_CFG[st];
                        const active = s.status === st;
                        return (
                          <button key={st} type="button" disabled={isSavingRow}
                            onClick={() => saveStatus(s.siswaId, st)}
                            className="rounded-lg border px-2 py-1 text-[10px] font-bold transition-all hover:scale-105 disabled:cursor-wait disabled:opacity-50"
                            style={{
                              backgroundColor: active ? cfg.bg : "transparent",
                              color: active ? cfg.clr : "#94a3b8",
                              borderColor: active ? cfg.clr + "60" : "#e2e8f040",
                            }}>
                            {cfg.label}
                          </button>
                        );
                      })}
                      <button type="button" onClick={() => setEditingSiswaId(null)} title="Batal"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <StatusBadge status={s.status} />
                  )}
                  <span className="text-center text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">{waktu ?? "—"}</span>
                  <div className="min-w-0">
                    {lokasiParsed ? (
                      <button onClick={openDokumen} title="Lihat lokasi absen"
                        className="block max-w-full truncate text-left text-[11px] text-[#0082FB] hover:underline">
                        {lokasiParsed.lat.slice(0, 8)}…
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {fotoRaw ? (
                      <button onClick={openDokumen} title="Lihat foto selfie"
                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                        <Camera size={13} className="text-emerald-500" />
                      </button>
                    ) : <Camera size={13} className="text-slate-200 dark:text-slate-700" />}
                  </div>
                  <div className="flex justify-center">
                    {ttdRaw ? (
                      <button onClick={openDokumen} title="Lihat tanda tangan"
                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-[#0082FB] dark:hover:bg-[#0064E0]/20">
                        <PenTool size={13} className="text-[#0082FB]" />
                      </button>
                    ) : <PenTool size={13} className="text-slate-200 dark:text-slate-700" />}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    {!isPulangView && canEdit && (
                      <button type="button" onClick={() => setEditingSiswaId(isEditingRow ? null : s.siswaId)}
                        title="Edit status kehadiran"
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                        <Pencil size={12} />
                      </button>
                    )}
                    {hasDok && (
                      <button onClick={openDokumen}
                        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95"
                        style={{ background: "#0082FB" }}>
                        <Eye size={11} /> Lihat
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
      {filteredSiswa.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/40 px-5 py-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {tableStart}–{tableEnd} dari {filteredSiswa.length}
          </span>
          <div className="flex items-center gap-2.5">
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
                            ? "bg-[#0082FB] text-white shadow-sm"
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
