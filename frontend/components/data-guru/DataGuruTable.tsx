"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Users, MessageCircle, CheckCircle2, XCircle, Power, Loader2, Pencil, KeyRound } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColor } from "@/components/absensi-harian/shared";
import { PageSizeToggle, paginate } from "@/components/shared/PageSizeToggle";

export type GuruRow = {
  id: string;
  nama: string;
  loginId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  fotoProfil: string | null;
  guru: { id: string; nip: string | null; noWa: string | null } | null;
};

const TH = "whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";
const TD = "whitespace-nowrap px-4 py-3";
const TEXT = "text-sm font-medium text-slate-800 dark:text-white";

function waLink(noWa: string) {
  const digits = noWa.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function TableHead() {
  return (
    <tr>
      <th className={TH}>Nama Guru</th>
      <th className={TH}>NPY</th>
      <th className={TH}>Status Password</th>
      <th className={TH}>No. WA</th>
      <th className={TH}>Status Akun</th>
      <th className={TH}>Aksi</th>
    </tr>
  );
}

function TableRow({ g, index, onToggleActive, togglingId, onEdit, onResetPassword, isSuperAdmin }: {
  g: GuruRow;
  index: number;
  onToggleActive: (g: GuruRow) => void;
  togglingId: string | null;
  onEdit: (g: GuruRow) => void;
  onResetPassword: (g: GuruRow) => void;
  isSuperAdmin: boolean;
}) {
  const sudahGanti = g.mustChangePassword === false;
  const toggling = togglingId === g.id;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (index % 15) * 0.02 }}
      className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20"
    >
      <td className={TD}>
        <div className="flex items-center gap-2.5">
          <Avatar src={g.fotoProfil} nama={g.nama} sizePx={36} fallbackBg={avatarColor(g.nama)} textClassName="text-[10px] font-extrabold" />
          <p className={TEXT} title={g.nama}>{g.nama}</p>
        </div>
      </td>

      <td className={TD}>
        <span className={TEXT}>{g.loginId ?? "—"}</span>
      </td>

      <td className={TD}>
        {sudahGanti ? (
          <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: "#00D67F26", color: "#00D67F" }}>
            <CheckCircle2 size={12} /> Sudah Ganti
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <XCircle size={12} /> Masih Default
          </span>
        )}
      </td>

      <td className={TD}>
        {g.guru?.noWa ? (
          <a href={waLink(g.guru.noWa)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            title="Kirim pesan WhatsApp"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300">
            <MessageCircle size={13} className="shrink-0" />
            {g.guru.noWa}
          </a>
        ) : (
          <span className={TEXT}>—</span>
        )}
      </td>

      <td className={TD}>
        {g.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: "#00C85326", color: "#00C853" }}>
            <CheckCircle2 size={12} /> Aktif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500 dark:bg-red-900/20">
            <XCircle size={12} /> Nonaktif
          </span>
        )}
      </td>

      <td className={TD}>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
            onClick={() => onEdit(g)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: "#3B82F6" }}
          >
            <Pencil size={12} />
            Edit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
            onClick={() => onToggleActive(g)}
            disabled={toggling}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-sm transition-colors hover:brightness-95 disabled:opacity-60"
            style={{ backgroundColor: g.isActive ? "#EF4444" : "#00C853", color: "#FFFFFF" }}
          >
            {toggling ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
            {g.isActive ? "Nonaktifkan" : "Aktifkan"}
          </motion.button>
          {isSuperAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
              onClick={() => onResetPassword(g)}
              title="Reset Password"
              className="flex items-center justify-center rounded-lg p-1.5 text-white shadow-sm transition-colors hover:brightness-95"
              style={{ backgroundColor: "#EF4444" }}
            >
              <KeyRound size={14} />
            </motion.button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
          <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
        <Users size={24} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}

export function DataGuruTable({
  loading, guruList, onToggleActive, togglingId, onEdit, onResetPassword, isSuperAdmin = false, resetPageKey,
}: {
  loading: boolean;
  guruList: GuruRow[];
  onToggleActive: (g: GuruRow) => void;
  togglingId: string | null;
  onEdit: (g: GuruRow) => void;
  onResetPassword?: (g: GuruRow) => void;
  isSuperAdmin?: boolean;
  resetPageKey?: string | number;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  useEffect(() => setPage(0), [resetPageKey]);

  const { pageItems, pageCount, start, end } = paginate(guruList, page, pageSize);

  const content = (() => {
    if (loading) return <LoadingSkeleton />;
    if (guruList.length === 0) return <EmptyState message="Tidak ada guru yang ditemukan" />;

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-170 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
              <TableHead />
            </thead>
            <motion.tbody initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.02 } } }}>
              {pageItems.map((g, i) => (
                <TableRow key={g.id} g={g} index={start - 1 + i} onToggleActive={onToggleActive} togglingId={togglingId} onEdit={onEdit}
                  onResetPassword={onResetPassword ?? (() => {})} isSuperAdmin={isSuperAdmin} />
              ))}
            </motion.tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-700/40">
          <span className="text-xs text-slate-400 dark:text-slate-500">{start}–{end} dari {guruList.length}</span>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Tampilkan:</span>
            <PageSizeToggle value={pageSize} onChange={(n) => { setPageSize(n); setPage(0); }} />
            {pageCount > 1 && (
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
            )}
          </div>
        </div>
      </>
    );
  })();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {content}
    </div>
  );
}
