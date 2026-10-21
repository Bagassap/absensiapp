"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";
import { formatTgl } from "@/components/absensi-harian/shared";

type RiwayatItem = {
  id: string;
  kegiatanNama: string;
  tanggal: string;
  jamLabel: string;
  waktuAbsen: string;
  status: "HADIR" | "IZIN" | "ALFA";
  verified: boolean;
  catatan: string | null;
};

const PAGE_SIZE = 8;

export function RiwayatAbsenCard() {
  const [items, setItems] = useState<RiwayatItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/absensi-harian/saya/riwayat?page=${p}&limit=${PAGE_SIZE}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (res.ok && d) {
        setItems(d.items ?? []);
        setTotalPages(d.totalPages ?? 0);
        setTotal(d.total ?? 0);
        setPage(d.page ?? p);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
          <History size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Riwayat Absen</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{total > 0 ? `${total} kegiatan yang pernah Anda absen` : "Kegiatan yang pernah Anda absen"}</p>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-14 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="py-14 text-center text-xs text-slate-400 dark:text-slate-500">Belum ada riwayat absen</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-700/50">
          {items.map((it) => {
            const izin = it.status === "IZIN";
            return (
              <li key={it.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{it.kegiatanNama}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${izin ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"}`}>
                    {izin ? "Izin" : "Hadir"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatTgl(it.tanggal)} · Absen {it.waktuAbsen}
                  {it.verified ? " · Terverifikasi" : ""}
                </p>
                {it.catatan && <p className="mt-1 truncate text-[11px] text-blue-500">{it.catatan}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700/50">
          <span className="text-xs text-slate-400">Halaman {page} dari {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => load(page - 1)} disabled={page <= 1 || loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              <ChevronLeft size={15} />
            </button>
            <button type="button" onClick={() => load(page + 1)} disabled={page >= totalPages || loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
