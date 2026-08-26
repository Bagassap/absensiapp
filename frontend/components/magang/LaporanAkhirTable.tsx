"use client";

import { Users, Eye, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, toTitleCase } from "@/components/data-siswa/shared";
import type { LaporanAkhirRow } from "./laporan-akhir-types";

const STATUS_CFG: Record<string, { label: string; bg: string; clr: string; icon: typeof Clock }> = {
  TERKIRIM: { label: "Menunggu Review", bg: "#EAF3FF", clr: "#0082FB", icon: Clock },
  DITERIMA: { label: "Diterima", bg: "#E3FBF0", clr: "#00D67F", icon: CheckCircle2 },
  REVISI: { label: "Perlu Revisi", bg: "#F1F5F8", clr: "#8A9E1F", icon: AlertTriangle },
};

export function LaporanAkhirTable({ loading, rows, showPembimbing = false, onOpen }: {
  loading: boolean; rows: LaporanAkhirRow[]; showPembimbing?: boolean; onOpen: (row: LaporanAkhirRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {loading ? (
        <div className="space-y-3 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Users size={24} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Tidak ada penempatan PKL aktif yang ditemukan</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Siswa</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Tempat PKL{showPembimbing ? " & Pembimbing" : ""}</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const nama = toTitleCase(r.siswa.nama ?? "—");
                const cfg = r.laporan ? STATUS_CFG[r.laporan.status] : null;
                return (
                  <tr key={r.penempatanId} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={r.siswa.fotoProfil} nama={nama} sizePx={36} fallbackBg={avatarColorFor(nama)} textClassName="text-[10px] font-extrabold" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{nama}</p>
                          <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.siswa.nis}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.tempatMagang.namaTempat}</p>
                      {showPembimbing && (
                        <p className="text-[11px] text-slate-400">Pembimbing: {r.guruPembimbing.nama ? toTitleCase(r.guruPembimbing.nama) : "—"}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {cfg ? (
                        <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.clr }}>
                          <cfg.icon size={10} /> {cfg.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                          Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.laporan ? (
                        <button onClick={() => onOpen(r)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:brightness-105"
                          style={{ background: "#0082FB" }}>
                          <Eye size={11} /> Lihat
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
