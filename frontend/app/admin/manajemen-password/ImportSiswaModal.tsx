"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

type RowResult = { baris: number; nama: string; nis?: string; alasan?: string };
type ImportResult = { berhasil: RowResult[]; gagal: RowResult[] };

async function downloadTemplate(toast: ReturnType<typeof useToast>) {
  try {
    const res = await fetch("/api/users/import-siswa/template");
    if (!res.ok) { toast.error("Gagal mengunduh template"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Impor_Siswa_Baru.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Server tidak dapat dijangkau");
  }
}

export function ImportSiswaModal({
  open, onClose, onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/users/import-siswa", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error("Gagal memproses file", data?.message ?? "Coba lagi");
        return;
      }
      setResult(data);
      if (data.berhasil?.length > 0) {
        toast.success(`${data.berhasil.length} akun siswa berhasil dibuat!`, data.gagal?.length > 0 ? `${data.gagal.length} baris gagal — lihat detail di bawah` : "");
        onImported();
      } else {
        toast.error("Tidak ada akun yang berhasil dibuat", "Periksa detail kegagalan di bawah");
      }
    } catch {
      toast.error("Server tidak dapat dijangkau");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between gap-3 bg-[#0082FB] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <FileSpreadsheet size={18} className="text-white" />
                </span>
                <h2 className="text-sm font-extrabold text-white">Impor Massal Siswa Baru</h2>
              </div>
              <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                <X size={15} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <ol className="list-inside list-decimal space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <li>Pastikan kelas siswa baru sudah dibuat lewat &ldquo;Kelola Kelas&rdquo;.</li>
                <li>Unduh template, isi data siswa (satu baris = satu siswa), hapus baris contoh.</li>
                <li>Unggah kembali file yang sudah diisi.</li>
              </ol>

              <button type="button" onClick={() => downloadTemplate(toast)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                <Download size={15} /> Unduh Template Excel
              </button>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-[#0082FB]/40 hover:bg-[#0082FB]/5 dark:border-slate-600 dark:bg-slate-700/40">
                <Upload size={16} className="shrink-0 text-[#0082FB]" />
                <div className="min-w-0 flex-1">
                  {file ? (
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-200">{file.name}</p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Klik untuk pilih file .xlsx yang sudah diisi</p>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} className="hidden" />
              </label>

              <button onClick={submit} disabled={!file || uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0082FB] px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? "Memproses…" : "Proses Impor"}
              </button>

              {result && (
                <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                  {result.berhasil.length > 0 && (
                    <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={13} /> {result.berhasil.length} akun berhasil dibuat
                      </p>
                      <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                        {result.berhasil.map((r) => <li key={r.baris}>Baris {r.baris}: {r.nama} (NIS {r.nis})</li>)}
                      </ul>
                    </div>
                  )}
                  {result.gagal.length > 0 && (
                    <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                        <XCircle size={13} /> {result.gagal.length} baris gagal
                      </p>
                      <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-red-700/80 dark:text-red-400/80">
                        {result.gagal.map((r) => <li key={r.baris}>Baris {r.baris} ({r.nama || "—"}): {r.alasan}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
