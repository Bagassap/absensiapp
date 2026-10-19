"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserX, Search, X, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { PageSizeToggle, paginate } from "@/components/shared/PageSizeToggle";
import { avatarColor, CARD_GRADIENTS } from "./shared";

export type GuruRosterItem = { guruId: string; nama: string; npy: string | null; fotoProfil: string | null };
export type KegiatanRingkas = { id: string; nama: string; guruTotal: number; jumlahAbsen: number };
export type AlfaRow = { guruId: string; kegiatanId: string; nama: string | null; npy: string | null; fotoProfil: string | null; status: string };

function DetailModal({
  kegiatan, belumList, color, onClose,
}: { kegiatan: KegiatanRingkas; belumList: GuruRosterItem[]; color: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const filtered = belumList.filter((g) =>
    query === "" || g.nama.toLowerCase().includes(query.toLowerCase()) || (g.npy ?? "").toLowerCase().includes(query.toLowerCase())
  );
  const { pageItems, pageCount, start, end } = paginate(filtered, page, pageSize);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 max-lg:items-end max-lg:p-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="relative z-10 flex max-h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 max-lg:max-w-none max-lg:rounded-b-none max-lg:rounded-t-[32px] max-lg:max-h-[90dvh] max-lg:pb-[env(safe-area-inset-bottom)] max-lg:before:mx-auto max-lg:before:mb-1 max-lg:before:mt-3 max-lg:before:block max-lg:before:h-1.5 max-lg:before:w-10 max-lg:before:shrink-0 max-lg:before:rounded-full max-lg:before:bg-slate-300 max-lg:before:content-['']">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-6 py-4" style={{ backgroundColor: `${color}18` }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <UserX size={17} style={{ color }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">Belum Absen — {kegiatan.nama}</p>
              <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {belumList.length} dari {kegiatan.guruTotal} guru belum absen kegiatan ini
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / NPY..." autoFocus
                className="w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                style={{ "--tw-ring-color": color } as React.CSSProperties} />
            </div>
            <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-100">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-700 sm:hidden">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / NPY..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              style={{ "--tw-ring-color": color } as React.CSSProperties} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
            {belumList.length === 0 && <PartyPopper size={22} style={{ color }} />}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {belumList.length === 0 ? "Semua guru sudah absen kegiatan ini!" : `Tidak ada yang cocok dengan "${query}"`}
            </p>
          </div>
        ) : (
          <ul className="thin-scrollbar flex-1 divide-y divide-slate-50 overflow-y-auto dark:divide-slate-700/30">
            {pageItems.map((g) => (
              <li key={g.guruId} className="flex items-center gap-3 px-5 py-3">
                <Avatar src={g.fotoProfil} nama={g.nama} sizePx={32} fallbackBg={avatarColor(g.nama)} textClassName="text-[10px] font-extrabold" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{g.nama}</p>
                  <p className="truncate text-[11px] text-slate-400">{g.npy ?? "—"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-700">
            <span className="text-xs text-slate-400 dark:text-slate-500">{start}–{end} dari {filtered.length}</span>
            <div className="flex items-center gap-2.5">
              <PageSizeToggle value={pageSize} onChange={(n) => { setPageSize(n); setPage(0); }} options={[10, 20, Infinity]} />
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-1 text-xs font-semibold text-slate-500">{page + 1}/{pageCount}</span>
                  <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function BelumAbsenKegiatanPanel({
  kegiatanList, rows,
}: {
  kegiatanList: KegiatanRingkas[];
  rows: AlfaRow[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  if (kegiatanList.length === 0) return null;

  const activeIndex = kegiatanList.findIndex((k) => k.id === activeId);
  const active = activeIndex >= 0 ? kegiatanList[activeIndex] : null;
  const belumList: GuruRosterItem[] = active
    ? rows
        .filter((r) => r.status === "ALFA" && r.kegiatanId === active.id)
        .map((r) => ({ guruId: r.guruId, nama: r.nama ?? "-", npy: r.npy, fotoProfil: r.fotoProfil }))
    : [];

  return (
    <>
      <div className="space-y-1.5">
        {kegiatanList.map((k, i) => {
          const belumCount = Math.max(0, k.guruTotal - k.jumlahAbsen);
          const color = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
          return (
            <button key={k.id} type="button" onClick={() => setActiveId(k.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: color }}>
                <UserX size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">Belum Absen — {k.nama}</p>
                <p className="truncate text-[10px] text-slate-400">{belumCount} dari {k.guruTotal} guru</p>
              </div>
              <span className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-extrabold" style={{ backgroundColor: `${color}18`, color }}>
                {belumCount}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {active && (
          <DetailModal
            kegiatan={active}
            belumList={belumList}
            color={CARD_GRADIENTS[activeIndex % CARD_GRADIENTS.length]}
            onClose={() => setActiveId(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
