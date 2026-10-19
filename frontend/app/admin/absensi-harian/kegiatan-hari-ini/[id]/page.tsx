"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Check, MoreHorizontal, Eye, BadgeCheck, Trash2, Loader2, Users,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { useConfirm } from "@/components/shared/ConfirmSheet";
import { DokumenModal } from "@/components/absensi-harian/DokumenModal";
import { Avatar } from "@/components/shared/Avatar";
import { paginate } from "@/components/shared/PageSizeToggle";
import { todayJakarta, formatTgl, avatarColor } from "@/components/absensi-harian/shared";
import type { RekapKegiatanHarian, AbsensiKegiatanRow } from "@/components/absensi-harian/types";

const STATUS_CFG = {
  HADIR: { label: "Hadir", clr: "#00C853" },
  IZIN: { label: "Izin", clr: "#F59E0B" },
  ALFA: { label: "Alfa", clr: "#94A3B8" },
} as const;

export default function KegiatanHariIniDetailPage() {
  const params = useParams<{ id: string }>();
  const kegiatanId = params.id;
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [tanggal] = useState(() => todayJakarta());
  const [rekap, setRekap] = useState<RekapKegiatanHarian | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"HADIR" | "IZIN" | "ALFA" | null>(null);
  const [page, setPage] = useState(0);
  const [aksiRow, setAksiRow] = useState<AbsensiKegiatanRow | null>(null);
  const [dokumenRow, setDokumenRow] = useState<AbsensiKegiatanRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRekap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/absensi-harian?tanggal=${tanggal}`);
      const data = await res.json().catch(() => null);
      setRekap(data && Array.isArray(data.rows) ? data : null);
    } catch {
      toast.error("Gagal memuat data absensi", "");
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => { loadRekap(); }, [loadRekap]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const kegiatan = rekap?.kegiatan.find((k) => k.id === kegiatanId) ?? null;
  const allRows = (rekap?.rows ?? []).filter((r) => r.kegiatanId === kegiatanId);
  const hadir = allRows.filter((r) => r.status === "HADIR");
  const izin = allRows.filter((r) => r.status === "IZIN");
  const alfa = allRows.filter((r) => r.status === "ALFA");

  const filteredRows = (statusFilter ? allRows.filter((r) => r.status === statusFilter) : allRows)
    .slice()
    .sort((a, b) => (a.nama ?? "").localeCompare(b.nama ?? "", "id"));
  const { pageItems, pageCount, start, end } = paginate(filteredRows, page, 15);

  function handleVerifiedChange(id: string, verified: boolean, verifiedAt: string | null, catatan: string | null) {
    setRekap((prev) => prev && {
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, verified, verifiedAt, catatan } : r)),
    });
  }

  async function handleToggleVerifikasi(row: AbsensiKegiatanRow) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/absensi-harian/${row.id}/verifikasi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Gagal memverifikasi absensi", d?.message ?? ""); return; }
      handleVerifiedChange(row.id, d.verified, d.verifiedAt ?? null, d.catatan ?? null);
      toast.success(d.verified ? "Absensi diverifikasi" : "Verifikasi dibatalkan", row.nama ?? "");
      setAksiRow(null);
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteAbsensi(row: AbsensiKegiatanRow) {
    if (!(await confirm({ title: "Hapus absensi?", message: `Hapus absensi "${row.nama ?? "guru ini"}" untuk kegiatan "${row.kegiatanNama}"? Guru akan kembali berstatus belum absen untuk kegiatan ini.`, confirmLabel: "Hapus" }))) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/absensi-harian/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Gagal menghapus absensi", data?.message ?? ""); return; }
      toast.success("Absensi dihapus", data?.message ?? "");
      setAksiRow(null);
      loadRekap();
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative isolate -m-4">
      <div className="relative flex items-center px-4 pb-3 pt-4">
        <button type="button" onClick={() => router.push("/admin/absensi-harian")}
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm active:bg-slate-100 dark:bg-slate-800 dark:text-slate-200">
          <ChevronLeft size={18} />
        </button>
        <div className="absolute inset-x-14 text-center">
          <h1 className="truncate text-base font-bold text-slate-800 dark:text-white">{kegiatan?.nama ?? "Kegiatan"}</h1>
          {kegiatan && <p className="text-[11px] font-semibold text-slate-500">{kegiatan.jamLabel} · {formatTgl(tanggal)}</p>}
        </div>
      </div>

      <div className="space-y-4 bg-transparent p-4 pb-8 dark:bg-slate-900">
        {loading ? (
          <div className="space-y-3 rounded-3xl bg-white p-5 dark:bg-slate-800">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
                <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        ) : !kegiatan ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white py-16 text-center dark:bg-slate-800">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
              <Users size={24} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Kegiatan tidak ditemukan untuk hari ini.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard label="Hadir" value={hadir.length} color="#00C853" active={statusFilter === "HADIR"} onClick={() => setStatusFilter((p) => (p === "HADIR" ? null : "HADIR"))} />
              <StatCard label="Izin" value={izin.length} color="#F59E0B" active={statusFilter === "IZIN"} onClick={() => setStatusFilter((p) => (p === "IZIN" ? null : "IZIN"))} />
              <StatCard label="Alfa" value={alfa.length} color="#94A3B8" active={statusFilter === "ALFA"} onClick={() => setStatusFilter((p) => (p === "ALFA" ? null : "ALFA"))} />
            </div>

            <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {statusFilter ? STATUS_CFG[statusFilter].label : "Semua Guru"} ({filteredRows.length})
                </p>
                {statusFilter && (
                  <button type="button" onClick={() => setStatusFilter(null)} className="text-[11px] font-bold" style={{ color: "#00C853" }}>
                    Reset
                  </button>
                )}
              </div>

              {filteredRows.length === 0 ? (
                <p className="py-10 text-center text-xs font-medium text-slate-400">Tidak ada guru di kategori ini.</p>
              ) : (
                <div className="divide-y divide-slate-100 px-4 dark:divide-slate-700/50">
                  {pageItems.map((r) => (
                    <GuruRow key={r.id} row={r} onAksi={() => setAksiRow(r)} />
                  ))}
                </div>
              )}

              {filteredRows.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 text-[11px] font-semibold text-slate-400">
                  <span>{start}–{end} dari {filteredRows.length}</span>
                  {pageCount > 1 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                        className="rounded-full bg-slate-100 px-3 py-1 disabled:opacity-30 dark:bg-slate-700">Prev</button>
                      <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                        className="rounded-full bg-slate-100 px-3 py-1 disabled:opacity-30 dark:bg-slate-700">Next</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {aksiRow && (
          <AksiActionSheet
            row={aksiRow}
            busy={busyId === aksiRow.id}
            onClose={() => setAksiRow(null)}
            onLihatDetail={() => { setDokumenRow(aksiRow); setAksiRow(null); }}
            onToggleVerifikasi={() => handleToggleVerifikasi(aksiRow)}
            onHapus={() => handleDeleteAbsensi(aksiRow)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dokumenRow && (
          <DokumenModal row={dokumenRow} tanggal={tanggal} onClose={() => setDokumenRow(null)} onVerifiedChange={handleVerifiedChange} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, color, active, onClick }: { label: string; value: number; color: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-2xl p-3 text-center transition-all"
      style={{ background: `${color}12`, outline: active ? `2px solid ${color}` : "2px solid transparent", outlineOffset: active ? "-2px" : "0" }}>
      <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
      <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</p>
    </button>
  );
}

function GuruRow({ row, onAksi }: { row: AbsensiKegiatanRow; onAksi: () => void }) {
  const isAlfa = row.status === "ALFA";
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar src={row.fotoProfil} nama={row.nama ?? "-"} sizePx={34} fallbackBg={avatarColor(row.nama ?? "-")} textClassName="text-[10px] font-extrabold" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-800 dark:text-white">
          <span className="truncate">{row.nama ?? "-"}</span>
          {row.verified && (
            <span title="Terverifikasi" className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: "#3B82F6" }}>
              <Check size={11} className="text-white" strokeWidth={3.5} />
            </span>
          )}
        </p>
        <p className="text-xs font-semibold text-slate-400">{isAlfa ? "Belum absen" : row.waktuAbsen}</p>
        {row.keterangan && (
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">{row.keterangan}</p>
        )}
      </div>
      {isAlfa ? (
        <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600">—</span>
      ) : (
        <button type="button" onClick={onAksi}
          className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          Aksi <MoreHorizontal size={13} />
        </button>
      )}
    </div>
  );
}

function AksiActionSheet({ row, busy, onClose, onLihatDetail, onToggleVerifikasi, onHapus }: {
  row: AbsensiKegiatanRow;
  busy: boolean;
  onClose: () => void;
  onLihatDetail: () => void;
  onToggleVerifikasi: () => void;
  onHapus: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        className="relative z-10 w-full max-w-md space-y-2">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
          <div className="px-4 py-3 text-center">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{row.nama ?? "-"}</p>
            <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{row.kegiatanNama} · {row.waktuAbsen}</p>
          </div>
          <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-700/50 dark:border-slate-700/50">
            <button type="button" onClick={onLihatDetail}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold text-slate-700 dark:text-slate-200">
              <Eye size={16} /> Lihat Detail
            </button>
            <button type="button" onClick={onToggleVerifikasi} disabled={busy}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold disabled:opacity-50"
              style={{ color: row.verified ? "#EF4444" : "#3B82F6" }}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
              {row.verified ? "Batalkan Verifikasi" : "Verifikasi Absensi"}
            </button>
            <button type="button" onClick={onHapus} disabled={busy}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-[15px] font-semibold text-red-600 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Hapus Absensi
            </button>
          </div>
        </div>
        <button type="button" onClick={onClose}
          className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-bold text-slate-800 shadow-2xl dark:bg-slate-800 dark:text-white">
          Batal
        </button>
      </motion.div>
    </div>,
    document.body
  );
}
