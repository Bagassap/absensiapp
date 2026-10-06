"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Download, Camera, PenTool, ExternalLink, CalendarCheck2, BadgeCheck, Check, Loader2, StickyNote } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import type { AbsensiKegiatanRow } from "./types";
import { BRAND_GRADIENT, formatTgl, avatarColor, parseLokasi, resolveMediaSrc } from "./shared";
import { Avatar } from "@/components/shared/Avatar";

// Badge biru terverifikasi bergaya IG/X — dibuat manual (bulatan solid +
// centang putih) alih-alih pakai ikon BadgeCheck outline lucide, karena
// versi outline-nya terlalu tipis/samar di ukuran kecil untuk "mencolok".
function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <span title="Terverifikasi" className="inline-flex shrink-0 items-center justify-center rounded-full shadow-sm"
      style={{ backgroundColor: "#3B82F6", width: size, height: size }}>
      <Check size={Math.round(size * 0.6)} className="text-white" strokeWidth={3.5} />
    </span>
  );
}

export function DokumenModal({ row, tanggal, onClose, onVerifiedChange }: {
  row: AbsensiKegiatanRow; tanggal: string; onClose: () => void;
  onVerifiedChange?: (id: string, verified: boolean, verifiedAt: string | null, catatan: string | null) => void;
}) {
  const toast = useToast();
  const [imgOverlay, setImgOverlay] = useState<string | null>(null);
  const [verified, setVerified] = useState(row.verified);
  const [catatan, setCatatan] = useState(row.catatan ?? "");
  const [verifying, setVerifying] = useState(false);
  const lokasi = parseLokasi(row.lokasi);
  const fotoSrc = resolveMediaSrc(row.foto);
  const ttdSrc = row.ttd || null;
  const ac = avatarColor(row.nama ?? "-");
  const subtitle = row.nip ? `NIP ${row.nip}` : "Guru";

  async function handleToggleVerifikasi() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/absensi-harian/${row.id}/verifikasi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatan: verified ? undefined : catatan.trim() || undefined }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        setVerified(d.verified);
        setCatatan(d.catatan ?? "");
        onVerifiedChange?.(row.id, d.verified, d.verifiedAt ?? null, d.catatan ?? null);
        toast.success(d.verified ? "Absensi diverifikasi" : "Verifikasi dibatalkan", row.nama ?? "");
      } else {
        toast.error(d?.message ?? "Gagal memverifikasi absensi", "");
      }
    } catch {
      toast.error("Gagal memverifikasi absensi", "");
    } finally {
      setVerifying(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
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
                <button onClick={() => { const a = document.createElement("a"); a.href = imgOverlay; a.download = "dok-" + (row.nama ?? "guru") + ".png"; a.click(); }}
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
          className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-3xl shadow-2xl sm:mx-0 sm:max-h-[78vh] sm:flex-row sm:overflow-hidden">

          <button onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md transition-colors hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-800">
            <X size={15} />
          </button>

          <div className="relative flex shrink-0 flex-col overflow-hidden sm:w-60"
            style={{ background: "#013920" }}>
            <div className="pointer-events-none absolute -right-10 -top-10 hidden h-44 w-44 rounded-full bg-white/10 sm:block" />

            <div className="flex items-center gap-3 px-4 pb-3 pt-10 sm:hidden">
              <div className="relative shrink-0" style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.25)", borderRadius: "9999px" }}>
                <Avatar
                  src={row.fotoProfil}
                  nama={row.nama ?? "-"}
                  sizePx={44}
                  fallbackBg={ac}
                  textClassName="text-sm font-extrabold"
                />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/40 bg-white/20">
                  <CalendarCheck2 size={10} className="text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-1.5 truncate text-sm font-extrabold leading-tight text-white">
                  <span className="truncate">{row.nama ?? "-"}</span>
                  {verified && <VerifiedBadge size={15} />}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-lg px-2 py-0.5 text-[9px] font-extrabold text-white" style={{ background: "rgba(255,255,255,0.22)" }}>
                    {row.kegiatanNama}
                  </span>
                  {row.status === "IZIN" && (
                    <span className="rounded-lg px-2 py-0.5 text-[9px] font-extrabold text-white" style={{ background: "#F59E0B" }}>
                      Izin
                    </span>
                  )}
                  <span className="text-[10px] text-white/70">{subtitle} · {formatTgl(tanggal)}</span>
                </div>
              </div>
              <div className="shrink-0 pr-6 text-right">
                <p className="text-[8px] font-bold uppercase tracking-wide text-white/55">Absen</p>
                <p className="font-mono text-sm font-extrabold text-white">{row.waktuAbsen}</p>
              </div>
            </div>

            <div className="relative hidden flex-1 flex-col items-center justify-center px-5 pb-8 pt-10 text-center sm:flex">
              <div className="relative" style={{ boxShadow: "0 0 0 4px rgba(255,255,255,0.25),0 12px 24px rgba(0,0,0,0.2)", borderRadius: "9999px" }}>
                <Avatar
                  src={row.fotoProfil}
                  nama={row.nama ?? "-"}
                  sizePx={80}
                  fallbackBg={ac}
                  textClassName="text-xl font-extrabold"
                />
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 shadow-lg">
                  <CalendarCheck2 size={13} className="text-white" />
                </div>
              </div>
              <h2 className="mt-4 flex items-center gap-1.5 text-sm font-extrabold leading-tight text-white">
                {row.nama ?? "-"}
                {verified && <VerifiedBadge size={16} />}
              </h2>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="rounded-lg px-3 py-1 text-xs font-extrabold text-white" style={{ background: "rgba(255,255,255,0.22)" }}>
                  {row.kegiatanNama}
                </span>
                {row.status === "IZIN" && (
                  <span className="rounded-lg px-3 py-1 text-xs font-extrabold text-white" style={{ background: "#F59E0B" }}>
                    Izin
                  </span>
                )}
              </div>
              <div className="mt-1 rounded-lg px-2.5 py-0.5 text-[10px] font-semibold text-white/80" style={{ background: "rgba(255,255,255,0.12)" }}>
                {subtitle}
              </div>
              <div className="my-4 h-px w-full bg-white/20" />
              <div className="w-full text-left space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Tanggal</p>
                  <p className="mt-0.5 text-sm font-bold text-white">{formatTgl(tanggal)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Waktu Absen</p>
                  <p className="mt-0.5 font-mono text-2xl font-extrabold text-white">{row.waktuAbsen}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-800">
            <div className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/40 dark:bg-slate-800 sm:px-5 sm:py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Dokumen Absensi</p>
            </div>
            <div className="flex-1 sm:min-h-0 sm:overflow-y-auto">
              {/* Grid 2 kolom (Foto + Lokasi berdampingan, TTD selebar penuh
                  di bawah) supaya modal terasa persegi panjang ke samping,
                  bukan tumpukan kartu vertikal yang membuatnya tinggi seperti
                  kotak. */}
              <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4">
                {fotoSrc && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 px-4 py-2.5 sm:py-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#EF444418" }}>
                        <Camera size={13} style={{ color: "#EF4444" }} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Foto Selfie</span>
                    </div>
                    <button onClick={() => setImgOverlay(fotoSrc)} className="group block w-full overflow-hidden">
                      <img src={fotoSrc} alt="Foto Selfie" className="h-40 w-full object-cover group-hover:brightness-90 transition-all duration-200 sm:h-56" />
                    </button>
                  </div>
                )}
                {lokasi && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#00C85318" }}>
                          <MapPin size={13} style={{ color: "#000000" }} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lokasi Absensi</span>
                      </div>
                      <a href={`https://maps.google.com/maps?q=${lokasi.lat},${lokasi.lng}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold hover:opacity-80" style={{ background: "#FFF7E4", color: "#000000" }}>
                        <ExternalLink size={10} /> Maps
                      </a>
                    </div>
                    <iframe src={`https://maps.google.com/maps?q=${lokasi.lat},${lokasi.lng}&output=embed`}
                      className="h-32 w-full border-0 sm:h-44" loading="lazy" title="Lokasi" />
                    <div className="flex items-center gap-2 px-4 py-2 sm:py-2.5">
                      <MapPin size={11} className="shrink-0" style={{ color: "#000000" }} />
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{lokasi.lat}, {lokasi.lng}</span>
                    </div>
                  </div>
                )}
                {row.lokasi && !lokasi && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Lokasi Absensi</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{row.lokasi}</p>
                  </div>
                )}
                {ttdSrc && (
                  <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/60 shadow-sm sm:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#00C85318" }}>
                          <PenTool size={13} style={{ color: "#000000" }} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanda Tangan Digital</span>
                      </div>
                      <button onClick={() => setImgOverlay(ttdSrc)}
                        className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-200">
                        <Download size={10} /> Simpan
                      </button>
                    </div>
                    <div className="flex items-center justify-center bg-white dark:bg-slate-900/40 p-2.5 sm:p-3">
                      <button onClick={() => setImgOverlay(ttdSrc)}
                        className="group relative w-full max-w-md overflow-hidden rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 hover:shadow-md transition-shadow sm:p-3">
                        <img src={ttdSrc} alt="TTD" className="h-14 w-full object-contain group-hover:scale-105 transition-transform duration-300 sm:h-16" />
                      </button>
                    </div>
                  </div>
                )}
                {!fotoSrc && !ttdSrc && !row.lokasi && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center sm:col-span-2 sm:gap-3 sm:py-16">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-14 sm:w-14">
                      <PenTool size={20} className="text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Tidak ada dokumen pendukung</p>
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 z-10 flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-4 py-2.5 dark:border-slate-700/40 dark:bg-slate-800 sm:py-3">
              {verified && catatan ? (
                <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                  <StickyNote size={13} className="mt-0.5 shrink-0" style={{ color: "#3B82F6" }} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B82F6" }}>Catatan dari Ketenagaan</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{catatan}</p>
                  </div>
                </div>
              ) : !verified ? (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <StickyNote size={11} /> Catatan dari Ketenagaan <span className="normal-case text-slate-300">(opsional)</span>
                  </label>
                  <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
                    placeholder="Tulis catatan untuk guru ini, mis. keterlambatan, seragam, dsb."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200" />
                </div>
              ) : null}

              <div className="flex gap-2">
                <button onClick={handleToggleVerifikasi} disabled={verifying}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: verified ? "#EF4444" : "#3B82F6" }}>
                  {verifying ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
                  {verified ? "Batalkan Verifikasi" : "Verifikasi Absensi"}
                </button>
                <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                  style={{ background: BRAND_GRADIENT }}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
