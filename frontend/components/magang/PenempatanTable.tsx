"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, toTitleCase } from "@/components/data-siswa/shared";
import { STATUS_PENEMPATAN_CFG } from "./types";
import type { PenempatanMagang, StatusPenempatan } from "./types";

const PAGE_SIZE = 10;

function fmtTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function PenempatanTable({
  loading, list, busyId, onUbahStatus, onHapus,
}: {
  loading: boolean;
  list: PenempatanMagang[];
  busyId: string | null;
  onUbahStatus: (p: PenempatanMagang, status: StatusPenempatan) => void;
  onHapus: (p: PenempatanMagang) => void;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [list]);

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const pageItems = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const start = list.length ? page * PAGE_SIZE + 1 : 0;
  const end = Math.min((page + 1) * PAGE_SIZE, list.length);

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
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Users size={24} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Tidak ada penempatan yang ditemukan</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-215 text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Siswa</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Tempat &amp; Pembimbing</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Periode</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const nama = toTitleCase(p.siswa.nama ?? p.siswa.user?.nama ?? "—");
                  const cfg = STATUS_PENEMPATAN_CFG[p.status];
                  const busy = busyId === p.id;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={p.siswa.user?.fotoProfil} nama={nama} sizePx={36} fallbackBg={avatarColorFor(nama)} textClassName="text-[10px] font-extrabold" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{nama}</p>
                            <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{p.siswa.nis} · {p.siswa.kelas.nama}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{p.tempatMagang.namaTempat}</p>
                        <p className="text-[11px] text-slate-400">Pembimbing: {toTitleCase(p.guruPembimbing.user.nama)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {fmtTgl(p.tanggalMulai)}{p.tanggalSelesai ? ` – ${fmtTgl(p.tanggalSelesai)}` : ""}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <select value={p.status} disabled={busy} onChange={(e) => onUbahStatus(p, e.target.value as StatusPenempatan)}
                          className="rounded-lg border-0 px-2.5 py-1 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#0082FB]/30"
                          style={{ backgroundColor: cfg.bg, color: cfg.clr }}>
                          <option value="AKTIF">Aktif</option>
                          <option value="SELESAI">Selesai</option>
                          <option value="BATAL">Batal</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button onClick={() => onHapus(p)} disabled={busy}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-40 dark:bg-red-900/20">
                          <Trash2 size={12} /> Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700/40">
              <span className="text-xs text-slate-400 dark:text-slate-500">{start}–{end} dari {list.length}</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{page + 1}/{pageCount}</span>
                <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
