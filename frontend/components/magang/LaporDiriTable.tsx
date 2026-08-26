"use client";

import { Users, Download, CheckCircle2, XCircle } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, toTitleCase } from "@/components/data-siswa/shared";
import type { LaporDiriRow } from "./lapor-diri-types";

function fmtTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function LaporDiriTable({ loading, rows, showPembimbing = false }: {
  loading: boolean; rows: LaporDiriRow[]; showPembimbing?: boolean;
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
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Siswa</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Tempat PKL{showPembimbing ? " & Pembimbing" : ""}</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">File</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const nama = toTitleCase(r.siswa.nama ?? "—");
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
                      {r.sudahLapor ? (
                        <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: "#E3FBF0", color: "#00D67F" }}>
                          <CheckCircle2 size={10} /> Sudah Lapor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500 dark:bg-red-900/20">
                          <XCircle size={10} /> Belum Lapor
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.laporDiri ? (
                        <a href={`/api/uploads${r.laporDiri.fileUrl}`} target="_blank" rel="noopener noreferrer"
                          className="flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:brightness-105"
                          style={{ background: "#0082FB" }}>
                          <Download size={11} /> {r.laporDiri.fileName.length > 20 ? `${r.laporDiri.fileName.slice(0, 20)}…` : r.laporDiri.fileName}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      )}
                      {r.laporDiri && (
                        <p className="mt-1 text-[10px] text-slate-400">{fmtTgl(r.laporDiri.createdAt)}</p>
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
