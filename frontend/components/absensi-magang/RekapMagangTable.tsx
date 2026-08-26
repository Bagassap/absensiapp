"use client";

import { Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, toTitleCase } from "@/components/data-siswa/shared";
import { StatusBadge } from "@/components/absensi-harian/StatusBadge";
import { STATUS_CFG } from "@/components/absensi-harian/shared";
import type { SiswaAbsensi, RangeSiswaRow } from "./types";

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Users size={24} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Tidak ada siswa PKL di tempat ini</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

/** Mode harian — status tunggal per siswa untuk 1 tanggal, sama seperti tabel Absensi. */
export function RekapMagangHarianTable({ loading, siswa }: { loading: boolean; siswa: SiswaAbsensi[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {loading ? <LoadingRows /> : siswa.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Siswa</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Waktu Hadir</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Waktu Pulang</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => {
                const nama = toTitleCase(s.nama);
                return (
                  <tr key={s.siswaId} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={s.fotoProfil} nama={nama} sizePx={34} fallbackBg={avatarColorFor(nama)} textClassName="text-[10px] font-extrabold" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{nama}</p>
                          <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{s.nis ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{s.waktuAbsen ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{s.waktuPulang ?? "—"}</td>
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

/** Mode mingguan/bulanan — rekap H/I/S/A + persentase kehadiran per siswa selama periode. */
export function RekapMagangRangeTable({ loading, siswa }: { loading: boolean; siswa: RangeSiswaRow[] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {loading ? <LoadingRows /> : siswa.length === 0 ? <EmptyState /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-170 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Siswa</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Kehadiran</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Rincian</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => {
                const nama = toTitleCase(s.nama ?? "—");
                const pct = s.summary.persentaseKehadiran;
                const pctColor = pct >= 70 ? STATUS_CFG.HADIR.clr : STATUS_CFG.ALPA.clr;
                return (
                  <tr key={s.siswaId} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={null} nama={nama} sizePx={34} fallbackBg={avatarColorFor(nama)} textClassName="text-[10px] font-extrabold" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{nama}</p>
                          <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{s.nis ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: pctColor }}>{pct}%</span>
                        <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-700">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pctColor }} />
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">{s.summary.totalHariEfektif} hari efektif</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      Hadir {s.summary.HADIR} · Izin {s.summary.IZIN} · Sakit {s.summary.SAKIT} · Alpa {s.summary.ALPA}
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
