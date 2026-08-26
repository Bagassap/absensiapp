"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Inbox, Clock, History, CheckCircle2, XCircle, KeyRound,
  MessageSquareText, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { timeAgo } from "@/components/dashboard/ActivityList";
import { Avatar } from "@/components/shared/Avatar";

export type PasswordResetRequest = {
  id: string;
  namaPengaju: string;
  loginIdDiajukan: string;
  keterangan: string | null;
  status: "PENDING" | "SELESAI";
  createdAt: string;
  processedAt: string | null;
  processedBy: { id: string; nama: string } | null;
  user: {
    id: string;
    nama: string;
    role: "SISWA" | "GURU" | "ADMIN";
    fotoProfil?: string | null;
    siswa: { nis: string; kelas: { nama: string } } | null;
    guru: { nip: string | null } | null;
  } | null;
};

const RIWAYAT_PAGE_SIZE = 8;

function formatWaktu(iso: string): string {
  const formatted = new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return `${formatted} WIB`;
}
// Dibandingkan sebagai tanggal WIB (Asia/Jakarta), bukan getter lokal — server
// berjalan di UTC sehingga getDate()/getMonth() biasa bisa salah hari.
function jakartaYMD(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}
function isToday(iso: string): boolean {
  return jakartaYMD(new Date(iso)) === jakartaYMD(new Date());
}
function requesterSub(r: PasswordResetRequest): string {
  if (!r.user) return "Akun tidak ditemukan di sistem";
  return r.user.role === "SISWA"
    ? [r.user.siswa?.nis, r.user.siswa?.kelas?.nama].filter(Boolean).join(" · ")
    : (r.user.guru?.nip ? `NIP: ${r.user.guru.nip}` : "Guru");
}

export function PermintaanPasswordCard({
  pending, riwayat, loading, busyId, onProcess, onAbaikan,
}: {
  pending: PasswordResetRequest[];
  riwayat: PasswordResetRequest[];
  loading: boolean;
  busyId: string | null;
  onProcess: (r: PasswordResetRequest) => void;
  onAbaikan: (id: string) => void;
}) {
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayatPage, setRiwayatPage] = useState(0);
  const selesaiHariIni = riwayat.filter((r) => r.processedAt && isToday(r.processedAt)).length;
  const riwayatPageCount = Math.max(1, Math.ceil(riwayat.length / RIWAYAT_PAGE_SIZE));
  const pagedRiwayat = riwayat.slice(riwayatPage * RIWAYAT_PAGE_SIZE, (riwayatPage + 1) * RIWAYAT_PAGE_SIZE);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0082FB" }}>
          <Inbox size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">Permintaan Password</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Kelola permintaan lupa password</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-700/50">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <Clock size={11} className="text-[#C3F84A]" /> Pending
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{loading ? "—" : pending.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-700/50">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <CheckCircle2 size={11} className="text-emerald-500" /> Selesai Hari Ini
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{loading ? "—" : selesaiHariIni}</p>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto border-t border-slate-100 pt-3 dark:border-slate-700/50" style={{ maxHeight: 280 }}>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0082FB] border-t-violet-500" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Tidak ada permintaan pending</p>
          </div>
        ) : (
          pending.map((r) => (
            <div key={r.id} className="rounded-xl border-l-4 border-[#C3F84A] bg-[#F1F5F8]/50 p-2.5 dark:bg-[#1C2B33]/10">
              <div className="flex items-start gap-2">
                <Avatar
                  src={r.user?.fotoProfil}
                  nama={r.namaPengaju}
                  sizePx={30}
                  fallbackBg={r.user ? (r.user.role === "SISWA" ? "#0082FB" : "#0082FB") : "#94a3b8"}
                  textClassName="text-[10px] font-bold"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-white">{r.namaPengaju}</p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{requesterSub(r)}</p>
                  {r.keterangan && (
                    <p className="mt-0.5 flex items-start gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <MessageSquareText size={10} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{r.keterangan}</span>
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(r.createdAt)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {r.user && (
                  <button onClick={() => onProcess(r)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:brightness-95"
                    style={{ background: "#0064E0" }}>
                    <KeyRound size={11} /> Proses
                  </button>
                )}
                <button onClick={() => onAbaikan(r.id)} disabled={busyId === r.id}
                  className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700">
                  <XCircle size={11} /> Abaikan
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button type="button" onClick={() => setShowRiwayat(true)}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
        <History size={13} /> Lihat Riwayat ({riwayat.length})
      </button>

      <AnimatePresence>
        {showRiwayat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowRiwayat(false)}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Riwayat Permintaan</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{riwayat.length} permintaan sudah diselesaikan</p>
                </div>
                <button type="button" onClick={() => setShowRiwayat(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X size={16} />
                </button>
              </div>

              {riwayat.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <History size={22} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Belum ada permintaan yang diselesaikan</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {pagedRiwayat.map((r) => (
                      <div key={r.id} className="flex flex-col gap-2 rounded-xl border-l-4 border-emerald-400 bg-slate-50 p-3 dark:bg-slate-700/30 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar src={r.user?.fotoProfil} nama={r.namaPengaju} sizePx={32} fallbackBg="#94a3b8" textClassName="text-xs font-bold" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">{r.namaPengaju}</p>
                              <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-300">{r.loginIdDiajukan}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                              Diajukan {formatWaktu(r.createdAt)}
                              {r.processedAt && <> · Diproses {formatWaktu(r.processedAt)}{r.processedBy ? ` oleh ${r.processedBy.nama}` : ""}</>}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {riwayatPageCount > 1 && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700/50">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {riwayatPage * RIWAYAT_PAGE_SIZE + 1}–{Math.min((riwayatPage + 1) * RIWAYAT_PAGE_SIZE, riwayat.length)} dari {riwayat.length}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setRiwayatPage((p) => Math.max(0, p - 1))} disabled={riwayatPage === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{riwayatPage + 1}/{riwayatPageCount}</span>
                        <button onClick={() => setRiwayatPage((p) => Math.min(riwayatPageCount - 1, p + 1))} disabled={riwayatPage >= riwayatPageCount - 1}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
