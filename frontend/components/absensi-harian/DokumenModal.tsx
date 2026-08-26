"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Download, Camera, PenTool, ExternalLink,
} from "lucide-react";
import type { SiswaAbsensi, StatusAbsensi } from "./types";
import { STATUS_CFG, PULANG_CFG, BRAND_GRADIENT, formatTgl, avatarColor, parseLokasi, resolveMediaSrc } from "./shared";
import { Avatar } from "@/components/shared/Avatar";

export function DokumenModal({ siswa, tanggal, kelas, onClose, source = "hadir" }: {
  siswa: SiswaAbsensi; tanggal: string; kelas: string; onClose: () => void; source?: "hadir" | "pulang";
}) {
  const [imgOverlay, setImgOverlay] = useState<string | null>(null);
  const isPulang = source === "pulang";
  const rawLokasi = isPulang ? siswa.lokasiPulang : siswa.lokasi;
  const lokasi = parseLokasi(rawLokasi);
  const fotoSrc = resolveMediaSrc(isPulang ? siswa.fotoPulang : siswa.foto);
  const ttdSrc = (isPulang ? siswa.ttdPulang : siswa.ttd) ?? null;
  const waktu = isPulang ? siswa.waktuPulang : siswa.waktuAbsen;
  const catatan = isPulang ? siswa.catatanPulang : siswa.catatan;
  const status = (siswa.status ?? "HADIR") as StatusAbsensi;
  const fotoLabel = !isPulang && (status === "IZIN" || status === "SAKIT") ? "Foto Surat Izin/Sakit" : "Foto Selfie";
  const theme = isPulang ? PULANG_CFG : STATUS_CFG[status];
  const ThemeIcon = theme.icon;
  const ac = avatarColor(siswa.nama);

  return (
    <>
      <AnimatePresence>
        {imgOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-110 flex flex-col items-center justify-center bg-black/90 p-4"
            onClick={() => setImgOverlay(null)}>
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] max-w-3xl flex-col items-center gap-4">
              <img src={imgOverlay} alt="Dokumen" className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl" />
              <div className="flex gap-3">
                <button onClick={() => { const a = document.createElement("a"); a.href = imgOverlay; a.download = "dok-" + siswa.nama + ".png"; a.click(); }}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
                  <Download size={14} /> Download
                </button>
                <button onClick={() => setImgOverlay(null)}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
                  <X size={14} /> Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-3xl shadow-2xl sm:mx-0 sm:flex-row sm:overflow-hidden">

          <button onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md transition-colors hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-800">
            <X size={15} />
          </button>

          <div className="relative flex shrink-0 flex-col overflow-hidden sm:w-60"
            style={{ background: BRAND_GRADIENT }}>
            <div className="pointer-events-none absolute -right-10 -top-10 hidden h-44 w-44 rounded-full bg-white/10 sm:block" />

            <div className="flex items-center gap-3 px-4 pb-3 pt-10 sm:hidden">
              <div className="relative shrink-0" style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.25)", borderRadius: "9999px" }}>
                <Avatar
                  src={siswa.fotoProfil}
                  nama={siswa.nama}
                  sizePx={44}
                  fallbackBg={ac}
                  textClassName="text-sm font-extrabold"
                />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/40 bg-white/20">
                  <ThemeIcon size={10} className="text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-extrabold leading-tight text-white">{siswa.nama}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-lg px-2 py-0.5 text-[9px] font-extrabold text-white" style={{ background: "rgba(255,255,255,0.22)" }}>
                    {theme.label}
                  </span>
                  <span className="text-[10px] text-white/70">{kelas} · {formatTgl(tanggal)}</span>
                </div>
              </div>
              <div className="shrink-0 pr-6 text-right">
                <p className="text-[8px] font-bold uppercase tracking-wide text-white/55">{isPulang ? "Pulang" : "Absen"}</p>
                <p className="font-mono text-sm font-extrabold text-white">{waktu ?? "—"}</p>
              </div>
            </div>
            {catatan && (
              <div className="px-4 pb-3 sm:hidden">
                <p className="text-[11px] leading-snug text-white/85">{catatan}</p>
              </div>
            )}

            <div className="relative hidden flex-1 flex-col items-center justify-center px-5 pb-8 pt-10 text-center sm:flex">
              <div className="relative" style={{ boxShadow: "0 0 0 4px rgba(255,255,255,0.25),0 12px 24px rgba(0,0,0,0.2)", borderRadius: "9999px" }}>
                <Avatar
                  src={siswa.fotoProfil}
                  nama={siswa.nama}
                  sizePx={80}
                  fallbackBg={ac}
                  textClassName="text-xl font-extrabold"
                />
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 shadow-lg">
                  <ThemeIcon size={13} className="text-white" />
                </div>
              </div>
              <h2 className="mt-4 text-sm font-extrabold leading-tight text-white">{siswa.nama}</h2>
              <div className="mt-2 rounded-lg px-3 py-1 text-xs font-extrabold text-white" style={{ background: "rgba(255,255,255,0.22)" }}>
                {theme.label}
              </div>
              <div className="mt-1 rounded-lg px-2.5 py-0.5 text-[10px] font-semibold text-white/80" style={{ background: "rgba(255,255,255,0.12)" }}>
                {kelas}
              </div>
              <div className="my-4 h-px w-full bg-white/20" />
              <div className="w-full text-left space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Tanggal</p>
                  <p className="mt-0.5 text-sm font-bold text-white">{formatTgl(tanggal)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">{isPulang ? "Waktu Pulang" : "Waktu Absen"}</p>
                  <p className="mt-0.5 font-mono text-2xl font-extrabold text-white">{waktu ?? "—"}</p>
                </div>
                {catatan && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Keterangan</p>
                    <p className="mt-0.5 text-xs text-white/90 leading-relaxed">{catatan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-[#1C2B33]">
            <div className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/40 dark:bg-[#1C2B33] sm:px-5 sm:py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Dokumen Kehadiran</p>
            </div>
            <div className="flex-1 sm:min-h-0 sm:overflow-y-auto">
              <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
                {fotoSrc && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 px-4 py-2.5 sm:py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#EF444418" }}>
                        <Camera size={13} style={{ color: "#EF4444" }} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{fotoLabel}</span>
                    </div>
                    <button onClick={() => setImgOverlay(fotoSrc)} className="group block w-full overflow-hidden">
                      <img src={fotoSrc} alt={fotoLabel} className="max-h-32 w-full object-cover group-hover:brightness-90 transition-all duration-200 sm:max-h-52" />
                    </button>
                  </div>
                )}
                {ttdSrc && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#0082FB18" }}>
                          <PenTool size={13} style={{ color: "#0082FB" }} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanda Tangan Digital</span>
                      </div>
                      <button onClick={() => setImgOverlay(ttdSrc)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-200">
                        <Download size={10} /> Simpan
                      </button>
                    </div>
                    <div className="flex items-center justify-center bg-white dark:bg-slate-900/40 p-2.5 sm:p-4">
                      <button onClick={() => setImgOverlay(ttdSrc)}
                        className="group relative w-full overflow-hidden rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 hover:shadow-md transition-shadow sm:p-3">
                        <img src={ttdSrc} alt="TTD" className="h-14 w-full object-contain group-hover:scale-105 transition-transform duration-300 sm:h-20" />
                      </button>
                    </div>
                  </div>
                )}
                {lokasi && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#0082FB18" }}>
                          <MapPin size={13} style={{ color: "#0082FB" }} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lokasi Absensi</span>
                      </div>
                      <a href={`https://maps.google.com/maps?q=${lokasi.lat},${lokasi.lng}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold hover:opacity-80" style={{ background: "#EAF3FF", color: "#0082FB" }}>
                        <ExternalLink size={10} /> Maps
                      </a>
                    </div>
                    <iframe src={`https://maps.google.com/maps?q=${lokasi.lat},${lokasi.lng}&output=embed`}
                      className="h-24 w-full border-0 sm:h-40" loading="lazy" title="Lokasi" />
                    <div className="flex items-center gap-2 px-4 py-2 sm:py-2.5">
                      <MapPin size={11} className="shrink-0" style={{ color: "#0064E0" }} />
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{lokasi.lat}, {lokasi.lng}</span>
                    </div>
                  </div>
                )}
                {rawLokasi && !lokasi && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Lokasi Absensi</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{rawLokasi}</p>
                  </div>
                )}
                {!fotoSrc && !ttdSrc && !rawLokasi && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center sm:gap-3 sm:py-16">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-14 sm:w-14">
                      <PenTool size={20} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Tidak ada dokumen pendukung</p>
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-100 bg-white px-4 py-2.5 dark:border-slate-700/40 dark:bg-[#1C2B33] sm:py-3">
              <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-bold text-white"
                style={{ background: BRAND_GRADIENT }}>
                Tutup
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
