"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, KeyRound, CheckCircle2, XCircle, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";

const PAGE_SIZE = 10;
const REF_PRIMARY = "#0082FB";
const REF_SUCCESS = "#00D67F";

export type SiswaPasswordItem = {
  id: string;
  nis: string;
  nama: string;
  user: { id: string; mustChangePassword: boolean; updatedAt: string; fotoProfil?: string | null } | null;
};

function toTitleCase(str: string): string {
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
function belumGantiLabel(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return "Belum ganti hari ini";
  if (d === 1) return "Belum ganti 1 hari";
  return `Belum ganti ${d} hari`;
}

export function SiswaPasswordTable({
  loading, siswas, onReset,
}: {
  loading: boolean;
  siswas: SiswaPasswordItem[];
  onReset: (s: SiswaPasswordItem) => void;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [siswas]);

  const pageCount = Math.max(1, Math.ceil(siswas.length / PAGE_SIZE));
  const pageItems = siswas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const start = siswas.length ? page * PAGE_SIZE + 1 : 0;
  const end = Math.min((page + 1) * PAGE_SIZE, siswas.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
      ) : siswas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Users size={24} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Tidak ada siswa yang ditemukan</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-170 text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Nama Siswa</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Status Password</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => {
                  const displayNama = toTitleCase(s.nama);
                  const mustChange = s.user?.mustChangePassword ?? null;
                  return (
                    <tr key={s.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={s.user?.fotoProfil} nama={displayNama} sizePx={36} fallbackBg="#0082FB" textClassName="text-[10px] font-extrabold" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{displayNama}</p>
                            <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{s.nis}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {mustChange === null ? (
                          <span className="text-xs text-slate-300 dark:text-slate-600">Belum ada akun</span>
                        ) : mustChange ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex w-fit items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                              <XCircle size={11} /> Belum Ganti
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{belumGantiLabel(s.user!.updatedAt)}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${REF_SUCCESS}26`, color: REF_SUCCESS }}>
                            <CheckCircle2 size={12} /> Sudah Ganti
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {s.user ? (
                          <button onClick={() => onReset(s)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-95"
                            style={{ backgroundColor: REF_PRIMARY }}>
                            <KeyRound size={12} /> Reset Password
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
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700/40">
              <span className="text-xs text-slate-400 dark:text-slate-500">{start}–{end} dari {siswas.length}</span>
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
