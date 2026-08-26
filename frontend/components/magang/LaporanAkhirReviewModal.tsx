"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Download, CheckCircle2, AlertTriangle, Loader2, Clock } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, toTitleCase } from "@/components/data-siswa/shared";
import type { LaporanAkhirRow } from "./laporan-akhir-types";

function fmtTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function LaporanAkhirReviewModal({ row, onClose, onReview }: {
  row: LaporanAkhirRow | null;
  onClose: () => void;
  onReview: (penempatanId: string, status: "DITERIMA" | "REVISI", pesanRevisi?: string) => Promise<void>;
}) {
  const [showRevisiForm, setShowRevisiForm] = useState(false);
  const [pesanRevisi, setPesanRevisi] = useState("");
  const [busy, setBusy] = useState<"terima" | "revisi" | null>(null);

  function handleClose() {
    setShowRevisiForm(false);
    setPesanRevisi("");
    onClose();
  }

  async function handleTerima() {
    if (!row) return;
    setBusy("terima");
    try { await onReview(row.penempatanId, "DITERIMA"); handleClose(); } finally { setBusy(null); }
  }

  async function handleKirimRevisi() {
    if (!row || !pesanRevisi.trim()) return;
    setBusy("revisi");
    try { await onReview(row.penempatanId, "REVISI", pesanRevisi.trim()); handleClose(); } finally { setBusy(null); }
  }

  const laporan = row?.laporan ?? null;
  const nama = row ? toTitleCase(row.siswa.nama ?? "—") : "";

  return (
    <AnimatePresence>
      {row && laporan && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">

            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-6 py-5" style={{ background: "#0082FB" }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <Avatar src={row.siswa.fotoProfil} nama={nama} sizePx={40} fallbackBg={avatarColorFor(nama)} textClassName="text-sm font-extrabold" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold text-white">{nama}</h2>
                <p className="truncate text-xs text-white/70">{row.tempatMagang.namaTempat} · {row.siswa.nis}</p>
              </div>
              <button onClick={handleClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-700/50 dark:bg-slate-700/40">
                  <FileText size={13} className="text-[#0082FB]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Berkas Laporan Akhir</span>
                </div>
                <a href={`/api/uploads${laporan.fileUrl}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400">
                    <Download size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{laporan.fileName}</span>
                </a>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock size={11} /> Dikirim {fmtTgl(laporan.submittedAt)}
              </p>

              {laporan.catatan && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan Siswa</p>
                  {laporan.catatan}
                </div>
              )}

              {laporan.status === "DITERIMA" && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: "#E3FBF0", color: "#00D67F" }}>
                  <CheckCircle2 size={15} /> Laporan ini sudah diterima
                </div>
              )}
              {laporan.status === "REVISI" && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#F1F5F8", color: "#1C2B33" }}>
                  <p className="flex items-center gap-2 font-semibold" style={{ color: "#8A9E1F" }}>
                    <AlertTriangle size={15} /> Revisi diminta
                  </p>
                  {laporan.pesanRevisi && <p className="mt-1.5 text-slate-600 dark:text-slate-300">{laporan.pesanRevisi}</p>}
                </div>
              )}

              {laporan.status === "TERKIRIM" && showRevisiForm && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">Pesan Revisi <span className="text-red-500">*</span></label>
                  <textarea value={pesanRevisi} onChange={(e) => setPesanRevisi(e.target.value)} rows={3} autoFocus
                    placeholder="Tuliskan catatan revisi untuk siswa…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-[#0082FB] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                </div>
              )}
            </div>

            {laporan.status === "TERKIRIM" && (
              <div className="flex shrink-0 gap-3 border-t border-slate-100 p-6 pt-4 dark:border-slate-700">
                {showRevisiForm ? (
                  <>
                    <button type="button" onClick={() => setShowRevisiForm(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
                      Batal
                    </button>
                    <button type="button" onClick={handleKirimRevisi} disabled={!pesanRevisi.trim() || !!busy}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
                      style={{ background: "#C3F84A", color: "#1C2B33" }}>
                      {busy === "revisi" ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                      Kirim Revisi
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setShowRevisiForm(true)} disabled={!!busy}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
                      style={{ background: "#F1F5F8", color: "#8A9E1F" }}>
                      <AlertTriangle size={14} /> Revisi
                    </button>
                    <button type="button" onClick={handleTerima} disabled={!!busy}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50"
                      style={{ background: "#00D67F" }}>
                      {busy === "terima" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Terima
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
