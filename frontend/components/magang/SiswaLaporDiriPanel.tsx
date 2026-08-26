"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, MapPin, AlertCircle, CheckCircle2, Upload, File as FileIcon,
  Download, Loader2, History,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import type { LaporDiriStatusSaya } from "./lapor-diri-types";

function periodeLabel(periode: string): string {
  const [y, m] = periode.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

function fmtTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function SiswaLaporDiriPanel() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<LaporDiriStatusSaya | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [catatan, setCatatan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/magang/lapor-diri/saya", { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      toast.error("Gagal memuat status lapor diri", "");
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
      const res = await fetch("/api/magang/lapor-diri/saya", { method: "POST", body: fd });
      if (res.ok) {
        toast.success("Lapor diri berhasil dikirim!", "");
        setFile(null);
        setCatatan("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        load();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal mengirim lapor diri", "");
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
          Anda belum memiliki penempatan PKL yang aktif, jadi belum perlu lapor diri.
        </p>
      </div>
    );
  }

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

      {status.sudahLapor && status.current ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl shadow-lg" style={{ background: "#00D67F" }}>
          <div className="relative px-6 py-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, delay: 0.1 }}
              className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/25 shadow-lg">
              <CheckCircle2 size={30} className="text-white" />
            </motion.div>
            <h2 className="mt-4 text-lg font-extrabold text-white">Sudah Lapor Diri Bulan Ini</h2>
            <p className="mt-1 text-sm text-white/80">Periode {periodeLabel(status.periode)}</p>
            <a href={`/api/uploads${status.current.fileUrl}`} target="_blank" rel="noopener noreferrer"
              className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/25">
              <FileIcon size={14} /> {status.current.fileName}
            </a>
            <p className="mt-4 text-xs text-white/70">Ingin ganti file? Unggah ulang di bawah ini untuk menimpa laporan bulan ini.</p>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          Anda belum lapor diri untuk periode {status?.periode ? periodeLabel(status.periode) : "bulan ini"}.
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">
          {status.sudahLapor ? "Unggah Ulang Laporan" : "Unggah Laporan Bulan Ini"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">File presentasi PDF atau PPT/PPTX, maks. 20MB</p>

        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-[#0082FB]/40 hover:bg-[#0082FB]/5 dark:border-slate-600 dark:bg-slate-700/40">
            <Upload size={16} className="shrink-0 text-[#0082FB]" />
            <div className="min-w-0 flex-1">
              {file ? (
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-800 dark:text-slate-200">
                  <FileIcon size={13} className="shrink-0" /> {file.name}
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Klik untuk pilih file PDF/PPT/PPTX</p>
              )}
            </div>
            <input ref={fileInputRef} type="file"
              accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
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
          {submitting ? "Mengirim..." : "Kirim Lapor Diri"}
        </button>
      </div>

      {status.history.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <History size={15} className="text-[#0082FB]" /> Riwayat Lapor Diri
          </h2>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/50">
            {status.history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmtTgl(h.createdAt)}</p>
                  <p className="truncate text-xs text-slate-400">{h.fileName}</p>
                </div>
                <a href={`/api/uploads${h.fileUrl}`} target="_blank" rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                  <Download size={11} /> Unduh
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
