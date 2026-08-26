"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Loader2, Upload, File as FileIcon, Check } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

export type MateriItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  mapel: string;
  kelasList: { id: string; nama: string }[];
  fileUrl: string | null;
  fileName: string | null;
  createdBy: { id: string; nama: string; role: string };
  createdAt: string;
  updatedAt: string;
};

type KelasOption = { id: string; nama: string };

const INPUT_CLS = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-[#0082FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082FB]/15 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-700";

export function MateriFormModal({
  open, materi, onClose, onSaved, mapelOptions,
}: {
  open: boolean;
  materi?: MateriItem | null;
  onClose: () => void;
  onSaved: (m: MateriItem) => void;
  // Bila diisi, field Mata Pelajaran jadi dropdown terbatas pada daftar ini
  // (dipakai di halaman Guru — mapel yang benar-benar diampu, dari mapel.xlsx).
  // Kosongkan/undefined untuk tetap pakai input teks bebas (halaman Admin).
  mapelOptions?: string[];
}) {
  const isEdit = !!materi;
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [mapel, setMapel] = useState("");
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]);
  const [kelasOptions, setKelasOptions] = useState<KelasOption[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setJudul(materi?.judul ?? "");
      setDeskripsi(materi?.deskripsi ?? "");
      setMapel(materi?.mapel ?? "");
      setSelectedKelasIds(materi?.kelasList?.map((k) => k.id) ?? []);
      setFile(null);
      setError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetch("/api/kelas").then((r) => r.json()).then((d) => setKelasOptions(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [open, materi]);

  function toggleKelas(id: string) {
    setSelectedKelasIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim() || !mapel.trim()) {
      setError("Judul dan mata pelajaran wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("judul", judul);
      fd.append("deskripsi", deskripsi);
      fd.append("mapel", mapel);
      fd.append("kelasIds", JSON.stringify(selectedKelasIds));
      if (file) fd.append("file", file);

      const url = isEdit ? `/api/materi/${materi!.id}` : "/api/materi";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = d.message ?? "Gagal menyimpan materi.";
        setError(msg);
        toast.error("Gagal menyimpan", msg);
        return;
      }
      const saved = await res.json();
      toast.success(isEdit ? "Materi diperbarui!" : "Materi ditambahkan!", judul);
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
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
          >
            <div
              className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-[#0082FB] px-6 py-5"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <BookOpen size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isEdit ? "Edit Materi" : "Tambah Materi"}
                </h2>
                <p className="text-xs text-white/60">{isEdit ? "Ubah detail materi pembelajaran" : "Unggah modul pembelajaran baru"}</p>
              </div>
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Judul <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={judul} onChange={(e) => setJudul(e.target.value)}
                    placeholder="Contoh: Modul Dasar Pemrograman Web" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  {mapelOptions ? (
                    <select value={mapel} onChange={(e) => setMapel(e.target.value)} className={INPUT_CLS}>
                      <option value="">Pilih mata pelajaran…</option>
                      {(mapel && !mapelOptions.includes(mapel) ? [mapel, ...mapelOptions] : mapelOptions).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={mapel} onChange={(e) => setMapel(e.target.value)}
                      placeholder="Contoh: Pemrograman Web" className={INPUT_CLS} />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                  Kelas Target
                  <span className="ml-1.5 font-normal text-gray-400">
                    {selectedKelasIds.length === 0 ? "(Semua Kelas)" : `(${selectedKelasIds.length} kelas dipilih)`}
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-700/40">
                  {kelasOptions.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-slate-500">Memuat daftar kelas…</p>
                  )}
                  {kelasOptions.map((k) => {
                    const active = selectedKelasIds.includes(k.id);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => toggleKelas(k.id)}
                        className={
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors " +
                          (active
                            ? "border-[#0082FB] bg-[#0082FB] text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-[#0082FB]/40 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300")
                        }
                      >
                        {active && <Check size={12} />}
                        {k.nama}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-slate-500">
                  Tidak memilih kelas berarti materi ini terlihat oleh semua kelas.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Deskripsi</label>
                <textarea rows={3} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Ringkasan singkat isi materi ini…" className={INPUT_CLS + " resize-none"} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                  File Modul <span className="text-red-500">*</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-[#0082FB]/40 hover:bg-[#0082FB]/5 dark:border-slate-600 dark:bg-slate-700/40">
                  <Upload size={16} className="shrink-0 text-[#0082FB]" />
                  <div className="min-w-0 flex-1">
                    {file ? (
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-800 dark:text-slate-200">
                        <FileIcon size={13} className="shrink-0" /> {file.name}
                      </p>
                    ) : materi?.fileName ? (
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-200">{materi.fileName} <span className="font-normal text-gray-400">(file saat ini, pilih untuk ganti)</span></p>
                    ) : (
                      <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Klik untuk unggah PDF, PPT, atau ZIP (maks. 20MB)</p>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx,.zip,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </p>
              )}
            </form>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 p-6 pt-4 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#0082FB] px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Materi"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
