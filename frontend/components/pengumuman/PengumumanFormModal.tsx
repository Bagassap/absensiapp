"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, Loader2, Pin } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

export type PengumumanItem = {
  id: string;
  slug: string;
  judul: string;
  konten: string;
  kategori: string;
  isPinned: boolean;
  prioritas: string;
  author: { id: string; nama: string; role: string; fotoProfil?: string | null };
  _count: { komentar: number };
  createdAt: string;
  updatedAt: string;
};

const KATEGORI_OPTIONS = ["Umum", "Akademik", "Magang", "Ujian", "Lainnya"];
const PRIORITAS_OPTIONS = [
  { value: "NORMAL",   label: "Normal",   cls: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
  { value: "PENTING",  label: "Penting",  cls: "bg-[#F1F5F8] text-[#1C2B33] dark:bg-[#1C2B33]/40 dark:text-[#EF4444]" },
  { value: "MENDESAK", label: "Mendesak", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
];

const INPUT_CLS = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-[#0082FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082FB]/15 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#0082FB] dark:focus:bg-slate-700";

export function PengumumanFormModal({
  open,
  pengumuman,
  onClose,
  onSaved,
}: {
  open: boolean;
  pengumuman?: PengumumanItem | null;
  onClose: () => void;
  onSaved: (p: PengumumanItem) => void;
}) {
  const isEdit = !!pengumuman;
  const toast = useToast();
  const [judul,     setJudul]     = useState("");
  const [konten,    setKonten]    = useState("");
  const [kategori,  setKategori]  = useState("Umum");
  const [prioritas, setPrioritas] = useState("NORMAL");
  const [isPinned,  setIsPinned]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (open) {
      setJudul(pengumuman?.judul     ?? "");
      setKonten(pengumuman?.konten   ?? "");
      setKategori(pengumuman?.kategori ?? "Umum");
      setPrioritas(pengumuman?.prioritas ?? "NORMAL");
      setIsPinned(pengumuman?.isPinned ?? false);
      setError("");
    }
  }, [open, pengumuman]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim() || !konten.trim()) {
      setError("Judul dan konten wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url    = isEdit ? `/api/pengumuman/${pengumuman!.id}` : "/api/pengumuman";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, konten, kategori, prioritas, isPinned }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = d.message ?? "Gagal menyimpan pengumuman.";
        setError(msg);
        toast.error("Gagal menyimpan", msg);
        return;
      }
      const saved = await res.json();
      toast.success(
        isEdit ? "Pengumuman diperbarui!" : "Pengumuman dibuat!",
        judul,
      );
      onSaved(saved);
      onClose();
    } catch {
      const msg = "Server tidak dapat dijangkau.";
      setError(msg);
      toast.error("Koneksi bermasalah", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
          >
            <div
              className="relative flex items-center gap-3 overflow-hidden px-6 py-5"
              style={{ background: "#0082FB" }}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Megaphone size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isEdit ? "Edit Pengumuman" : "Buat Pengumuman"}
                </h2>
                <p className="text-xs text-white/60">{isEdit ? "Ubah isi pengumuman" : "Tulis pengumuman baru untuk semua civitas"}</p>
              </div>
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Judul pengumuman yang singkat dan jelas"
                  className={INPUT_CLS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className={INPUT_CLS}
                  >
                    {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Prioritas</label>
                  <div className="flex gap-1.5">
                    {PRIORITAS_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPrioritas(p.value)}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                          prioritas === p.value
                            ? `${p.cls} ring-2 ring-offset-1 ring-[#0082FB]`
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                  Konten <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={konten}
                  onChange={(e) => setKonten(e.target.value)}
                  placeholder="Tulis isi pengumuman secara lengkap dan informatif…"
                  className={INPUT_CLS + " resize-none"}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-[#0082FB]/5 dark:border-slate-600 dark:bg-slate-700/40 dark:hover:bg-[#0064E0]/20">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4 accent-[#0082FB]"
                />
                <Pin size={14} className="text-[#0082FB]" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Sematkan pengumuman ini</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Akan tampil di paling atas dengan penanda khusus</p>
                </div>
              </label>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
                  style={{ background: "#0082FB" }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Publikasikan"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
