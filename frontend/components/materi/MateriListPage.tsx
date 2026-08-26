"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Search, FileText, Download, Pencil, Trash2, Eye,
  AlertCircle, GraduationCap, CalendarDays, Loader2,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { MateriFormModal, type MateriItem } from "./MateriFormModal";

// react-pdf touches browser-only Canvas APIs (DOMMatrix) at module-eval time,
// yang crash saat SSR — muat khusus client, sama seperti di MateriSiswaPage.
const MateriPdfViewerModal = dynamic(
  () => import("./MateriPdfViewerModal").then((m) => m.MateriPdfViewerModal),
  { ssr: false, loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Loader2 size={28} className="animate-spin text-white" />
    </div>
  ) },
);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

const ROW_PALETTES = [
  { bar: "#0082FB", gradient: "#0082FB" },
  { bar: "#00D67F", gradient: "#00D67F" },
  { bar: "#EF4444", gradient: "#EF4444" },
  { bar: "#8A9E1F", gradient: "#C3F84A" }, // lime — bar dipakaikan varian gelap (badge kecil pakai teks putih)
  { bar: "#0064E0", gradient: "#0064E0" },
];
function rowPalette(i: number) { return ROW_PALETTES[i % ROW_PALETTES.length]; }

export function MateriListPage({
  embedded = false, currentUserId, currentUserRole, mapelOptions, canCreate = true,
}: {
  embedded?: boolean;
  // Bila diisi, tombol Edit/Hapus per baris hanya tampil untuk materi milik
  // sendiri (createdBy.id === currentUserId) — ADMIN tetap bebas ke semua.
  currentUserId?: string;
  currentUserRole?: string;
  // Diteruskan ke MateriFormModal — lihat dokumentasi prop di sana.
  mapelOptions?: string[];
  // false = guru belum diampu mapel apa pun (tidak ada di mapel.xlsx) —
  // tombol Tambah disembunyikan dan diganti pesan penjelasan.
  canCreate?: boolean;
} = {}) {
  const toast = useToast();
  const canEdit = (m: MateriItem) => !currentUserRole || currentUserRole === "ADMIN" || m.createdBy.id === currentUserId;
  const [list, setList] = useState<MateriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MateriItem | null>(null);
  const [viewerMateri, setViewerMateri] = useState<MateriItem | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/materi");
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      setError("Gagal memuat materi. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function handleDelete(m: MateriItem) {
    if (!await toast.confirm("Hapus materi?", `"${m.judul}" akan dihapus permanen.`)) return;
    const res = await fetch(`/api/materi/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      setList((prev) => prev.filter((x) => x.id !== m.id));
      toast.success("Materi dihapus", m.judul);
    } else {
      toast.error("Gagal menghapus materi");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) =>
      m.judul.toLowerCase().includes(q) ||
      m.mapel.toLowerCase().includes(q) ||
      m.kelasList.some((k) => k.nama.toLowerCase().includes(q))
    );
  }, [list, search]);

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "#0082FB" }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <BookOpen size={26} className="text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Manajemen Materi</span>
              <h1 className="text-2xl font-extrabold leading-tight text-white">Materi Pembelajaran</h1>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="px-5 pt-5 pb-0" style={{ background: "rgba(0,130,251,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0082FB" }}>
                <BookOpen size={14} className="text-white" />
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">Daftar Materi</p>
              <span className="ml-1 rounded-lg bg-[#0082FB]/10 px-2 py-0.5 text-[10px] font-bold text-[#0082FB]">{filtered.length} materi</span>
            </div>
            {canCreate && (
              <button onClick={() => { setEditItem(null); setModalOpen(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white shadow-sm"
                style={{ background: "#0082FB" }}>
                <Plus size={13} /> Tambah Materi
              </button>
            )}
          </div>
          <div className="relative mb-4">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul materi, mapel, atau kelas..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:focus:ring-blue-900/30" />
          </div>
        </div>

        <AnimatePresence>
          {!canCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-[#F1F5F8] bg-[#F1F5F8] px-4 py-3 text-sm text-[#1C2B33] dark:border-[#1C2B33]/40 dark:bg-[#1C2B33]/20 dark:text-[#C3F84A]">
              <AlertCircle size={14} className="shrink-0" />
              Anda belum terdaftar sebagai pengampu mata pelajaran apa pun, jadi belum bisa menambahkan materi. Hubungi admin bila ini keliru.
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={14} className="shrink-0" />{error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-h-[560px] overflow-auto">
          {loading && <div className="px-5 py-10 text-center text-sm text-slate-400">Memuat data...</div>}
          {!loading && filtered.length === 0 && (
            <div className="px-5 py-14 text-center">
              <BookOpen size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="text-sm text-slate-400 mb-4">{search.trim() ? `Tidak ada materi dengan kata kunci "${search.trim()}"` : "Belum ada materi"}</p>
              {!search.trim() && canCreate && (
                <motion.button
                  onClick={() => { setEditItem(null); setModalOpen(true); }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="mx-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: "#0082FB" }}>
                  <Plus size={14} /> Tambah Materi Pertama
                </motion.button>
              )}
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 backdrop-blur dark:border-slate-700/40 dark:bg-slate-700/60">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Materi</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Mata Pelajaran</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Kelas</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Dibuat Oleh</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tanggal Dibuat</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => {
                  const rp = rowPalette(idx);
                  return (
                    <tr key={m.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: rp.gradient }}>
                            <FileText size={13} style={{ color: rp.gradient === "#C3F84A" ? "#1C2B33" : "#FFFFFF" }} />
                          </div>
                          <p className="max-w-[220px] truncate text-sm font-bold text-slate-800 dark:text-slate-100">{m.judul}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <GraduationCap size={10} /> {m.mapel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        {m.kelasList.length ? (
                          <div className="flex flex-wrap gap-1">
                            {m.kelasList.map((k) => (
                              <span key={k.id} className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {k.nama}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "Semua Kelas"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">{m.createdBy.nama}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1"><CalendarDays size={11} />{formatDate(m.createdAt)}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewerMateri(m)} title="Lihat materi"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20">
                            <Eye size={14} />
                          </button>
                          {m.fileUrl && (
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" title="Unduh file"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-900/20">
                              <Download size={14} />
                            </a>
                          )}
                          {canEdit(m) && (
                            <>
                              <button onClick={() => { setEditItem(m); setModalOpen(true); }} title="Edit"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-[#F1F5F8] hover:text-[#C3F84A] dark:hover:bg-[#1C2B33]/20">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDelete(m)} title="Hapus"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <MateriFormModal
        open={modalOpen}
        materi={editItem}
        mapelOptions={mapelOptions}
        onClose={() => setModalOpen(false)}
        onSaved={(saved) => {
          setList((prev) => {
            const exists = prev.some((x) => x.id === saved.id);
            return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
          });
        }}
      />

      {viewerMateri && <MateriPdfViewerModal materi={viewerMateri} onClose={() => setViewerMateri(null)} />}
    </div>
  );
}
