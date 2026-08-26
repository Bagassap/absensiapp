"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, MapPin, AlertCircle, CheckCircle2, AlertTriangle, Clock, Upload, File as FileIcon,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import type { LaporanAkhirStatusSaya } from "./laporan-akhir-types";

function fmtTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function SiswaLaporanPanel() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<LaporanAkhirStatusSaya | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/magang/laporan-akhir/saya", { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      toast.error("Gagal memuat status laporan akhir", "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit() {
    if (!file) { toast.error("File laporan wajib diunggah", ""); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (catatan.trim()) fd.append("catatan", catatan.trim());
      const res = await fetch("/api/magang/laporan-akhir/saya", { method: "POST", body: fd });
      if (res.ok) {
        toast.success("Laporan akhir berhasil dikirim!", "");
        setFile(null);
        setCatatan("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        load();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal mengirim laporan", "");
      }
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-slate-100 bg-white py-16 dark:border-slate-700 dark:bg-slate-800">
        <Loader2 size={24} className="animate-spin text-[#0082FB]" />
      </div>
    );
  }

  if (!status?.hasPenempatan) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
          <AlertCircle size={26} className="text-red-500" />
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-slate-800 dark:text-white">Belum Ada Penempatan PKL</h2>
        <p className="mt-1.5 max-w-sm text-sm text-slate-400 dark:text-slate-500">
          Anda belum memiliki penempatan PKL yang aktif, jadi belum perlu mengirim laporan akhir.
        </p>
      </div>
    );
  }

  const laporan = status.laporan;
  const canUpload = !laporan || laporan.status === "REVISI";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          <Briefcase size={15} className="text-[#0082FB]" /> {status.tempatMagang.namaTempat}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <MapPin size={12} className="mt-0.5 shrink-0" /> {status.tempatMagang.alamat}
        </p>
      </div>

      {laporan && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl shadow-lg"
          style={{ background: laporan.status === "DITERIMA" ? "#00D67F" : laporan.status === "REVISI" ? "#C3F84A" : "#0082FB" }}>
          <div className="relative px-6 py-8 text-center" style={{ color: laporan.status === "REVISI" ? "#1C2B33" : "#FFFFFF" }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, delay: 0.1 }}
              className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
              style={{ background: laporan.status === "REVISI" ? "rgba(28,43,51,0.15)" : "rgba(255,255,255,0.25)" }}>
              {laporan.status === "DITERIMA" ? <CheckCircle2 size={30} />
                : laporan.status === "REVISI" ? <AlertTriangle size={30} />
                : <Clock size={30} />}
            </motion.div>
            <h2 className="mt-4 text-lg font-extrabold">
              {laporan.status === "DITERIMA" ? "Laporan Diterima!"
                : laporan.status === "REVISI" ? "Perlu Direvisi"
                : "Menunggu Review"}
            </h2>
            <p className="mt-1 text-sm opacity-80">Dikirim {fmtTgl(laporan.submittedAt)}</p>
            <a href={`/api/uploads${laporan.fileUrl}`} target="_blank" rel="noopener noreferrer"
              className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold backdrop-blur-sm"
              style={{ background: laporan.status === "REVISI" ? "rgba(28,43,51,0.12)" : "rgba(255,255,255,0.15)" }}>
              <FileIcon size={14} /> {laporan.fileName}
            </a>
            {laporan.status === "REVISI" && laporan.pesanRevisi && (
              <p className="mx-auto mt-4 max-w-sm rounded-xl px-4 py-3 text-left text-sm" style={{ background: "rgba(28,43,51,0.08)" }}>
                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">Catatan Revisi</span>
                {laporan.pesanRevisi}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {canUpload && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            {laporan ? "Kirim Ulang Laporan" : "Kirim Laporan Akhir"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">File PDF, Word, atau PPT/PPTX, maks. 20MB. Hanya bisa dikirim sekali kecuali diminta revisi.</p>

          <div className="mt-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-[#0082FB]/40 hover:bg-[#0082FB]/5 dark:border-slate-600 dark:bg-slate-700/40">
              <Upload size={16} className="shrink-0 text-[#0082FB]" />
              <div className="min-w-0 flex-1">
                {file ? (
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-800 dark:text-slate-200">
                    <FileIcon size={13} className="shrink-0" /> {file.name}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Klik untuk pilih file PDF/Word/PPT/PPTX</p>
                )}
              </div>
              <input ref={fileInputRef} type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            </label>
          </div>

          <div className="mt-3">
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
              placeholder="Catatan (opsional)..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#0082FB] focus:outline-none focus:ring-2 focus:ring-[#0082FB]/15 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100" />
          </div>

          <button type="button" onClick={handleSubmit} disabled={submitting || !file}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
            style={{ background: "#0082FB" }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {submitting ? "Mengirim..." : laporan ? "Kirim Ulang" : "Kirim Laporan"}
          </button>
        </div>
      )}
    </div>
  );
}
