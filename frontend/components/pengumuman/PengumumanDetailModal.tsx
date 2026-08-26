"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X, Pin, AlertCircle, Calendar, Clock,
  Megaphone, Pencil, Trash2, RotateCcw, Loader2,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { PengumumanFormModal } from "./PengumumanFormModal";
import { KomentarSection }     from "./KomentarSection";
import type { PengumumanItem } from "./PengumumanFormModal";
import type { KomentarItem }   from "./KomentarSection";
import { Avatar } from "@/components/shared/Avatar";

type PengumumanDetail = PengumumanItem & { komentar: KomentarItem[] };

// Pengumuman sengaja tidak memakai lime (beda dari dashboard/absensi/PKL)
// — lime diganti merah di sini, termasuk untuk badge prioritas & sematkan.
const KATEGORI_WARNA: Record<string, string> = {
  Umum:     "#0064E0",
  Akademik: "#0082FB",
  Magang:   "#0082FB",
  Ujian:    "#EF4444",
  Lainnya:  "#EF4444",
};

const PRIORITAS_BADGE: Record<string, { cls: string; label: string }> = {
  PENTING:  { cls: "bg-[#F1F5F8] text-[#1C2B33] dark:bg-[#1C2B33]/40 dark:text-[#EF4444]",   label: "Penting"  },
  MENDESAK: { cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",           label: "Mendesak" },
};

function formatDate(iso: string) {
  const formatted = new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
  return `${formatted} WIB`;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "baru saja";
  if (diff < 3600)  return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function PengumumanDetailModal({
  slug,
  canManage,
  currentUserId,
  onClose,
  onDeleted,
  onPinChanged,
}: {
  slug: string;
  canManage: boolean;
  currentUserId: string;
  onClose: () => void;
  onDeleted?: (id: string) => void;
  onPinChanged?: (id: string, isPinned: boolean) => void;
}) {
  const toast = useToast();
  const [pengumuman, setPengumuman] = useState<PengumumanDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [pinning,    setPinning]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/pengumuman/${slug}`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      setPengumuman(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleDelete() {
    if (!pengumuman || !await toast.confirm(`Hapus pengumuman?`, `"${pengumuman.judul}" akan dihapus permanen.`)) return;
    setDeleting(true);
    await fetch(`/api/pengumuman/${pengumuman.id}`, { method: "DELETE" });
    onDeleted?.(pengumuman.id);
    onClose();
  }

  async function handleTogglePin() {
    if (!pengumuman) return;
    setPinning(true);
    const res = await fetch(`/api/pengumuman/${pengumuman.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !pengumuman.isPinned }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPengumuman((p) => p ? { ...p, isPinned: updated.isPinned } : p);
      onPinChanged?.(pengumuman.id, updated.isPinned);
    }
    setPinning(false);
  }

  const grad    = pengumuman ? (KATEGORI_WARNA[pengumuman.kategori] ?? KATEGORI_WARNA.Umum) : KATEGORI_WARNA.Umum;
  const pb      = pengumuman ? PRIORITAS_BADGE[pengumuman.prioritas] : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">

        <motion.div
          key="pengumuman-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          key="pengumuman-detail-panel"
          initial={{ opacity: 0, scale: 0.93, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 340 }}
          className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl"
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >

          {loading && (
            <div className="space-y-3 p-5">
              <div className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-slate-800" />
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
            </div>
          )}

          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Megaphone size={36} className="mb-4 text-gray-300 dark:text-slate-600" />
              <p className="font-bold text-gray-600 dark:text-slate-400">Pengumuman tidak ditemukan</p>
              <button onClick={onClose} className="mt-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <X size={13} />Tutup
              </button>
            </div>
          )}

          {!loading && pengumuman && (
            <div className="flex flex-1 flex-col overflow-y-auto">

              <div
                className="relative shrink-0 overflow-hidden px-5 py-4 sm:px-6 sm:py-5"
                style={{ background: grad }}
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/8" />
                <div className="pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full bg-white/6" />
                <Megaphone size={160} strokeWidth={0.7} className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 text-white/[0.07]" />

                <div className="relative">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/55">
                      <Megaphone size={10} />
                      <span>Pengumuman</span>
                      <span>›</span>
                      <span className="text-white/85">{pengumuman.kategori}</span>
                    </div>
                    <button
                      onClick={onClose}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white/80 transition-colors hover:bg-white/30 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    {pengumuman.isPinned && (
                      <span className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white">
                        <Pin size={9} />Disematkan
                      </span>
                    )}
                    <span className="rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white">
                      {pengumuman.kategori}
                    </span>
                    {pb && (
                      <span className={`flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white ${pengumuman.prioritas === "MENDESAK" ? "animate-pulse" : ""}`}>
                        <AlertCircle size={9} />{pb.label}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-extrabold leading-tight text-white sm:text-xl">
                    {pengumuman.judul}
                  </h2>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        src={pengumuman.author.fotoProfil}
                        nama={pengumuman.author.nama}
                        sizePx={20}
                        fallbackBg="rgba(255,255,255,0.25)"
                        textClassName="text-[8px] font-bold"
                      />
                      <span className="font-semibold text-white/85">{pengumuman.author.nama}</span>
                      <span className="rounded-lg bg-white/15 px-1.5 py-0.5 text-[8px] font-bold text-white">
                        {pengumuman.author.role === "ADMIN" ? "Admin" : "Guru"}
                      </span>
                    </div>
                    <span className="flex items-center gap-1"><Calendar size={10} />{timeAgo(pengumuman.createdAt)}</span>
                    {pengumuman.updatedAt !== pengumuman.createdAt && (
                      <span className="flex items-center gap-1"><Clock size={10} />Diperbarui {timeAgo(pengumuman.updatedAt)}</span>
                    )}
                  </div>

                  {canManage && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <motion.button
                        onClick={() => setEditOpen(true)}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                      >
                        <Pencil size={12} />Edit
                      </motion.button>
                      <motion.button
                        onClick={handleTogglePin}
                        disabled={pinning}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition-colors ${
                          pengumuman.isPinned ? "bg-[#EF4444]/30 hover:bg-[#EF4444]/40" : "bg-white/15 hover:bg-white/25"
                        }`}
                      >
                        {pinning ? <Loader2 size={12} className="animate-spin" /> : <Pin size={12} />}
                        {pengumuman.isPinned ? "Lepas Sematkan" : "Sematkan"}
                      </motion.button>
                      <motion.button
                        onClick={handleDelete}
                        disabled={deleting}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 rounded-xl bg-red-500/25 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-red-500/40"
                      >
                        {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Hapus
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-slate-700">
                  <RotateCcw size={12} className="text-[#0064E0]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Isi Pengumuman</span>
                  <span className="ml-auto text-[10px] font-normal text-gray-400 dark:text-slate-500">{formatDate(pengumuman.createdAt)}</span>
                </div>
                <div className="px-5 py-5">
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-200" style={{ whiteSpace: "pre-wrap" }}>
                    {pengumuman.konten}
                  </p>
                </div>
              </div>

              <div className="px-5 py-5">
                <KomentarSection
                  initialKomentar={pengumuman.komentar}
                  pengumumanId={pengumuman.id}
                  currentUserId={currentUserId}
                  canManage={canManage}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <PengumumanFormModal
        open={editOpen}
        pengumuman={pengumuman}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          setPengumuman((p) => p ? { ...p, ...saved } : p);
          setEditOpen(false);
        }}
      />
    </>
  );
}
