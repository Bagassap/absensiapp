"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CheckCheck, ClipboardCheck, Info, Loader2, Trash2 } from "lucide-react";
import { timeAgo } from "@/components/dashboard/ActivityList";
import { PushToggle } from "@/components/shared/PushToggle";
import { PageHeaderCard } from "@/components/shared/PageHeaderCard";
import { useToast } from "@/components/shared/ToastSystem";

type ApiNotifType = "ABSENSI" | "SISTEM";

type ApiNotification = {
  id: string;
  title: string;
  message: string;
  type: ApiNotifType;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

type Filter = "SEMUA" | "BELUM";

const PAGE_SIZE = 15;

const TYPE_CFG: Record<ApiNotifType, { color: string; icon: React.ComponentType<{ size?: number }> }> = {
  ABSENSI: { color: "#00C853", icon: ClipboardCheck },
  SISTEM: { color: "#3B82F6", icon: Info },
};

export function NotifikasiPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("SEMUA");
  const [busyAll, setBusyAll] = useState(false);

  const fetchPage = useCallback(async (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${p}&limit=${PAGE_SIZE}`, { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Gagal memuat notifikasi");
      const data = await res.json();
      setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []));
      setPage(data.page ?? p);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      toast.error("Gagal memuat notifikasi", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const unreadCount = items.filter((n) => !n.isRead).length;
  const visible = filter === "BELUM" ? items.filter((n) => !n.isRead) : items;

  async function open(n: ApiNotification) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    setBusyAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setBusyAll(false);
    }
  }

  async function remove(n: ApiNotification) {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    try {
      const res = await fetch(`/api/notifications/${n.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => [n, ...prev].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      toast.error("Gagal menghapus notifikasi", "Coba lagi");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeaderCard className="hidden lg:flex" icon={Bell} tone="rose" eyebrow="Pemberitahuan" title="Notifikasi" description="Pengingat absen dan informasi terbaru untuk Anda" />

      <div className="rounded-3xl bg-white dark:bg-slate-800">
        <PushToggle />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex flex-1 rounded-full bg-white p-1 shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:bg-slate-800">
          <motion.div
            className="absolute inset-y-1 rounded-full bg-[#00C853]"
            style={{ width: "calc(50% - 4px)" }}
            animate={{ x: filter === "SEMUA" ? 0 : "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          />
          {(["SEMUA", "BELUM"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`relative z-10 flex-1 rounded-full py-2 text-xs font-bold transition-colors ${filter === f ? "text-white" : "text-slate-500 dark:text-slate-300"}`}
            >
              {f === "SEMUA" ? "Semua" : `Belum dibaca${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={busyAll || unreadCount === 0}
          aria-label="Tandai semua dibaca"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#00A844] shadow-[0_2px_6px_rgba(0,0,0,0.06)] disabled:opacity-40 dark:bg-slate-800"
        >
          {busyAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={17} />}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-white dark:bg-slate-800" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center dark:bg-slate-800">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700">
            {filter === "BELUM" ? <BellOff size={24} /> : <Bell size={24} />}
          </span>
          <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
            {filter === "BELUM" ? "Tidak ada yang belum dibaca" : "Belum ada notifikasi"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Pemberitahuan baru akan muncul di sini.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((n) => {
              const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.SISTEM;
              const Icon = cfg.icon;
              return (
                <motion.li
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className={`flex items-start gap-3 rounded-3xl border p-4 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.18)] ${
                    n.isRead
                      ? "border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800"
                      : "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  }`}
                >
                  <button type="button" onClick={() => open(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${cfg.color}1F`, color: cfg.color }}>
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-sm ${n.isRead ? "font-semibold text-slate-600 dark:text-slate-300" : "font-bold text-slate-900 dark:text-white"}`}>
                          {n.title}
                        </span>
                        {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.color }} />}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{n.message}</span>
                      <span className="mt-1.5 block text-[11px] font-medium text-slate-400">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(n)}
                    aria-label="Hapus notifikasi"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 active:bg-red-50 active:text-red-500 dark:bg-slate-700"
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {!loading && page < totalPages && (
        <button
          type="button"
          onClick={() => fetchPage(page + 1, true)}
          disabled={loadingMore}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-slate-600 shadow-[0_2px_6px_rgba(0,0,0,0.06)] disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
        >
          {loadingMore && <Loader2 size={15} className="animate-spin" />}
          Muat lebih banyak
        </button>
      )}
    </div>
  );
}
