"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, CalendarDays, PieChart,
  Users, TrendingUp, FileText, Download, Bell, Check, CalendarCheck2,
  ChevronRight, X, Settings, TrendingDown,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { useConfirm } from "@/components/shared/ConfirmSheet";
import { DokumenModal } from "@/components/absensi-harian/DokumenModal";
import { ExportButtons } from "@/components/absensi-harian/ExportButtons";
import { useExportRange } from "@/components/absensi-harian/useExportRange";
import { AbsensiHarianTable } from "@/components/absensi-harian/AbsensiHarianTable";
import { LaporanRendahKehadiran } from "@/components/absensi-harian/LaporanRendahKehadiran";
import { KegiatanCard } from "@/components/absensi-harian/KegiatanCard";
import { paginate } from "@/components/shared/PageSizeToggle";
import { LiveClock } from "@/components/shared/LiveClock";
import { MONTH_NAMES, RANGE_MODE_CARDS, reportCardFg, todayJakarta, formatTgl, KEGIATAN_WINDOW_CFG } from "@/components/absensi-harian/shared";
import type { RekapKegiatanHarian, AbsensiKegiatanRow } from "@/components/absensi-harian/types";

type GuruBasic = { guruId: string; nama: string; nip: string | null; npy: string | null; fotoProfil: string | null };

function KirimPengingatCard({ kegiatanId, kegiatanNama, belumCount }: { kegiatanId: string | null; kegiatanNama: string; belumCount: number }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function kirim() {
    if (!kegiatanId || belumCount === 0 || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/absensi-harian/kirim-pengingat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kegiatanId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Gagal mengirim pengingat", data?.message ?? ""); return; }
      setSent(true);
      toast.success("Pengingat terkirim!", `Notifikasi masuk ke ${data.count} guru`);
      setTimeout(() => setSent(false), 2000);
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setSending(false);
    }
  }

  return (
    <button type="button" onClick={kirim} disabled={!kegiatanId || belumCount === 0 || sending}
      className="flex w-full items-center gap-3 rounded-2xl border-2 border-transparent bg-red-50 px-4 py-3 text-left transition-all hover:border-red-200 disabled:cursor-default disabled:opacity-50 dark:bg-red-900/15 dark:hover:border-red-800/60">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EF4444] text-white">
        {sent ? <Check size={16} /> : <Bell size={16} />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-red-700 dark:text-red-400">{sent ? "Terkirim!" : `Kirim Pengingat — ${kegiatanNama}`}</p>
        <p className="truncate text-[11px] font-semibold text-red-400 dark:text-red-500/80">
          {belumCount > 0 ? `${belumCount} guru belum absen` : "Semua sudah absen"}
        </p>
      </div>
    </button>
  );
}

function RingkasanKehadiranPanel({ guruSudahAbsen, totalGuru, hadirPct, segments, totalSlot, kegiatanId, kegiatanNama, belumCount }: {
  guruSudahAbsen: number;
  totalGuru: number;
  hadirPct: number;
  segments: { key: string; value: number; color: string; label: string }[];
  totalSlot: number;
  kegiatanId: string | null;
  kegiatanNama: string;
  belumCount: number;
}) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  return (
    <>
      <div className="flex items-center gap-2.5 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
          <PieChart size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Ringkasan Kehadiran</p>
          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">Distribusi absensi per kegiatan hari ini</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4 pt-0 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-2.5">
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Sudah <span className="font-bold text-slate-700 dark:text-slate-200">{guruSudahAbsen}</span> dari{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{totalGuru}</span> guru absen minimal 1 kegiatan hari ini
            {totalGuru - guruSudahAbsen > 0 ? `, ${totalGuru - guruSudahAbsen} lagi belum sama sekali.` : ", semua guru sudah absen."}
          </p>
          <KirimPengingatCard kegiatanId={kegiatanId} kegiatanNama={kegiatanNama} belumCount={belumCount} />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-6">
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
              <circle cx="50" cy="50" r={r} stroke="#FFF7E4" strokeWidth="12" fill="none" />
              {totalSlot > 0 && segments.filter((s) => s.value > 0).map((s) => {
                const pct = s.value / totalSlot;
                const dash = pct * circumference;
                const offset = circumference * (1 - cumulative);
                cumulative += pct;
                return (
                  <circle key={s.key} cx="50" cy="50" r={r} stroke={s.color} strokeWidth="12" fill="none"
                    strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset} strokeLinecap="round" />
                );
              })}
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{hadirPct}%</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Absen</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {segments.length === 0 ? (
              <p className="text-xs text-slate-400">Belum ada kegiatan</p>
            ) : segments.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-left">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{s.label} <span className="text-slate-700 dark:text-slate-200">{s.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function UnduhLaporanPanel({ exportRange, guruRoster }: {
  exportRange: ReturnType<typeof useExportRange>;
  guruRoster: GuruBasic[];
}) {
  return (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
          <FileText size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">Unduh Laporan</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Ekspor rekap absensi ke PDF/Excel</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {RANGE_MODE_CARDS.map((opt) => {
          const active = exportRange.rangeMode === opt.key;
          const fg = reportCardFg(opt.gradient);
          return (
            <button key={opt.key} type="button" onClick={() => exportRange.setRangeMode(opt.key)}
              className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center shadow-sm transition-all"
              style={{ background: opt.gradient, color: fg, opacity: active ? 1 : 0.55, outline: active ? `2px solid ${fg}` : "2px solid transparent", outlineOffset: active ? "2px" : "0" }}>
              <opt.icon size={16} />
              <span className="text-[11px] font-bold">{opt.label}</span>
              <span className="text-[9px] leading-tight" style={{ color: `${fg}BF` }}>{opt.caption}</span>
            </button>
          );
        })}
      </div>

      {exportRange.rangeMode === "mingguan" && (
        <input type="date" value={exportRange.weekAnchor} onChange={(e) => exportRange.setWeekAnchor(e.target.value)}
          title={`Minggu: ${formatTgl(exportRange.weekRange.start)} – ${formatTgl(exportRange.weekRange.end)}`}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200" />
      )}

      {exportRange.rangeMode === "bulanan" && (
        <div className="mt-2 flex items-center gap-1.5">
          <select value={exportRange.bulan} onChange={(e) => exportRange.setBulan(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={exportRange.tahun} onChange={(e) => exportRange.setTahun(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      <div className="mt-3">
        <ExportButtons range={exportRange.range} guruList={guruRoster} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <Download size={11} className="shrink-0 text-[#000000]" />
        Pilih rentang waktu, lalu klik salah satu tombol ekspor
      </p>
    </>
  );
}

export default function AdminAbsensiHarianPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const tanggalInputRef = useRef<HTMLInputElement>(null);
  const [tanggal, setTanggal] = useState(() => todayJakarta());
  const exportRange = useExportRange(tanggal);
  const [rekap, setRekap] = useState<RekapKegiatanHarian | null>(null);
  const [guruRoster, setGuruRoster] = useState<GuruBasic[]>([]);
  const [exportGuruRoster, setExportGuruRoster] = useState<GuruBasic[]>([]);
  const [loading, setLoading] = useState(false);
  const [dokumenRow, setDokumenRow] = useState<AbsensiKegiatanRow | null>(null);
  const [activeKegiatanFilter, setActiveKegiatanFilter] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState<number>(10);
  const [menuModal, setMenuModal] = useState<"laporan" | "kehadiran-rendah" | "statistik" | null>(null);
  const router = useRouter();

  const handleVerifiedChange = useCallback((id: string, verified: boolean, verifiedAt: string | null, catatan: string | null) => {
    setRekap((prev) => prev && {
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, verified, verifiedAt, catatan } : r)),
    });
  }, []);

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

  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function handleDeleteAbsensi(row: AbsensiKegiatanRow) {
    if (!(await confirm({ title: "Hapus absensi?", message: `Hapus absensi "${row.nama ?? "guru ini"}" untuk kegiatan "${row.kegiatanNama}"? Guru akan kembali berstatus belum absen untuk kegiatan ini.`, confirmLabel: "Hapus" }))) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/absensi-harian/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error("Gagal menghapus absensi", data?.message ?? ""); return; }
      toast.success("Absensi dihapus", data?.message ?? "");
      loadRekap();
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    fetch("/api/users/guru")
      .then((r) => r.json())
      .then((list) => {
        if (!Array.isArray(list)) return;
        setGuruRoster(list.map((g: any) => ({
          guruId: g.guru?.id ?? "",
          nama: g.nama,
          nip: g.guru?.nip ?? null,
          npy: g.loginId ?? null,
          fotoProfil: g.fotoProfil ?? null,
        })).filter((g: GuruBasic) => g.guruId));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/absensi-harian/export-guru-roster")
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setExportGuruRoster(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { setTablePage(0); }, [tanggal, activeKegiatanFilter, tablePageSize]);

  const rows = rekap?.rows ?? [];
  const kegiatanList = rekap?.kegiatan ?? [];
  const totalGuru = guruRoster.length;
  const guruSudahAbsenIds = new Set(rows.filter((r) => r.status !== "ALFA").map((r) => r.guruId));
  const guruSudahAbsen = guruSudahAbsenIds.size;
  const hadirPct = totalGuru > 0 ? Math.round((guruSudahAbsen / totalGuru) * 100) : 0;

  const filteredRows = (!activeKegiatanFilter ? rows : rows.filter((r) => r.kegiatanId === activeKegiatanFilter))
    .slice()
    .sort((a, b) => (a.nama ?? "").localeCompare(b.nama ?? "", "id"));
  const { pageItems: pagedRows, pageCount: tablePageCount, start: tableStart, end: tableEnd } = paginate(filteredRows, tablePage, tablePageSize);

  function toggleFilter(key: string) {
    setActiveKegiatanFilter((prev) => (prev === key ? null : key));
  }

  const segments = kegiatanList.map((k, i) => ({
    key: k.id,
    value: k.jumlahAbsen,
    color: ["#00C853", "#00D67F", "#EF4444"][i % 3],
    label: k.nama,
  }));
  const totalSlot = kegiatanList.reduce((s, k) => s + k.guruTotal, 0);

  const laporanRendahProps = {
    kegiatanHariIni: kegiatanList.map((k) => ({ id: k.id, nama: k.nama, guruTotal: k.guruTotal, jumlahAbsen: k.jumlahAbsen })),
    alfaRows: rows.filter((r) => r.status === "ALFA"),
  };
  const activeKegiatan = kegiatanList.find((k) => k.id === activeKegiatanFilter) ?? null;
  const belumUntukKegiatan = activeKegiatan
    ? rows.filter((r) => r.kegiatanId === activeKegiatan.id && r.status === "ALFA").length
    : kegiatanList.length > 0
      ? rows.filter((r) => r.kegiatanId === kegiatanList[0].id && r.status === "ALFA").length
      : 0;

  return (
    <>
      <div className="hidden space-y-5 p-1 lg:block">
        <div className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "#013920" }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
                <ClipboardCheck size={22} className="text-white sm:hidden" />
                <ClipboardCheck size={26} className="hidden text-white sm:block" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Pemantauan Absensi Kegiatan</span>
                <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Absensi Kegiatan</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
            <div className="flex flex-col gap-5 lg:col-span-2 lg:gap-8">
              <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                <RingkasanKehadiranPanel
                  guruSudahAbsen={guruSudahAbsen} totalGuru={totalGuru} hadirPct={hadirPct}
                  segments={segments} totalSlot={totalSlot}
                  kegiatanId={activeKegiatan?.id ?? kegiatanList[0]?.id ?? null}
                  kegiatanNama={activeKegiatan?.nama ?? kegiatanList[0]?.nama ?? "-"}
                  belumCount={belumUntukKegiatan}
                />
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <UnduhLaporanPanel exportRange={exportRange} guruRoster={exportGuruRoster} />
              </div>
            </div>

            <KegiatanCard tanggal={tanggal} onChanged={loadRekap} />
          </div>
        </div>

        <div id="status-kehadiran-hari-ini" className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col self-start rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Absensi Kegiatan Hari Ini <span className="font-medium text-slate-400">({filteredRows.length})</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatTgl(tanggal)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50 sm:w-full sm:max-w-xs">
                <CalendarDays size={14} className="shrink-0 text-slate-400" />
                <div className="relative w-full min-w-0">
                  <span className="pointer-events-none block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {tanggal.split("-").reverse().join("/")}
                  </span>
                  <input ref={tanggalInputRef} type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                    onClick={() => tanggalInputRef.current?.showPicker?.()}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </div>
              </div>
            </div>

            <div className="mt-6 mb-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-6 pb-2 dark:border-slate-700 sm:gap-2.5">
              <span className="mr-1 text-xs font-semibold text-slate-400">Kegiatan:</span>
              {kegiatanList.map((k, i) => {
                const active = activeKegiatanFilter === k.id;
                const color = ["#00C853", "#00D67F", "#EF4444"][i % 3];
                return (
                  <button key={k.id} type="button" onClick={() => toggleFilter(k.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-5 sm:py-2.5 sm:text-sm"
                    style={active ? { backgroundColor: color, color: "#fff" } : {}}>
                    <span className={`flex items-center gap-1 sm:gap-2 ${active ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"}`}>
                      <CalendarCheck2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {k.nama}
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`}>{k.jumlahAbsen}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-[11px] dark:border-slate-700">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <Users size={12} className="text-[#000000]" />
                Total {totalGuru} guru
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <TrendingUp size={12} className="text-[#000000]" />
                Absen minimal 1x {hadirPct}%
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <CalendarCheck2 size={12} className="text-[#000000]" />
                {kegiatanList.length} kegiatan hari ini
              </span>
            </div>

            <div className="mt-4 -mx-5 -mb-5 overflow-hidden rounded-b-3xl border-t border-slate-100 dark:border-slate-700">
              <AbsensiHarianTable
                loading={loading}
                hasKegiatan={kegiatanList.length > 0}
                filteredRows={filteredRows}
                pagedRows={pagedRows}
                tableStart={tableStart}
                tableEnd={tableEnd}
                tablePage={tablePage}
                setTablePage={setTablePage}
                tablePageCount={tablePageCount}
                tablePageSize={tablePageSize}
                setTablePageSize={setTablePageSize}
                onOpenDokumen={(row) => setDokumenRow(row)}
                onDelete={handleDeleteAbsensi}
                deletingId={deletingId}
              />
            </div>
          </div>

          <div className="flex h-full flex-col gap-4">
            <LaporanRendahKehadiran {...laporanRendahProps} />
          </div>
        </div>
      </div>

      <div className="relative -m-4 lg:hidden">
        <div className="space-y-4 bg-transparent p-4 dark:bg-slate-900">

          <div className="relative overflow-hidden rounded-[28px] px-5 py-7 text-center shadow-[0_18px_36px_-14px_rgba(0,0,0,0.45)]" style={{ background: "#013920" }}>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" style={{ background: "#00C85333" }} />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">{formatTgl(tanggal)}</p>
            <div className="relative mt-2"><LiveClock variant="hero" /></div>
            <p className="relative mt-1 text-[10px] font-bold uppercase tracking-widest text-white/40">WIB</p>
            <p className="relative mt-4 text-xs font-semibold text-white/90">
              {guruSudahAbsen} dari {totalGuru} guru sudah absen minimal 1 kegiatan hari ini
            </p>
            <div className="relative mx-auto mt-3 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full transition-all" style={{ background: "#00C853", width: `${hadirPct}%` }} />
            </div>
          </div>

          <div className="rounded-3xl bg-white px-4 pb-2 dark:bg-slate-800">
            <div className="flex items-center gap-2.5 px-1 pt-4 pb-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
                <CalendarCheck2 size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white">Kegiatan Hari Ini</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Ketuk kegiatan untuk lihat ringkasan kehadiran</p>
              </div>
            </div>
            {kegiatanList.length === 0 ? (
              <p className="py-8 text-center text-xs font-medium text-slate-400">Belum ada kegiatan untuk tanggal ini.</p>
            ) : (
              kegiatanList.map((k) => (
                <AdminKegiatanRow key={k.id} k={k} onOpen={() => router.push(`/admin/absensi-harian/kegiatan-hari-ini/${k.id}`)} />
              ))
            )}
          </div>

          <div className="rounded-3xl bg-white px-4 dark:bg-slate-800">
            <p className="px-1 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Menu Lainnya</p>
            <MenuRow icon={PieChart} label="Statistik Absensi" desc="Grafik & ringkasan kehadiran" onClick={() => setMenuModal("statistik")} />
            <MenuRow icon={Settings} label="Kelola Kegiatan" desc="Tambah, edit, & kegiatan berulang" href="/admin/absensi-harian/kegiatan" />
            <MenuRow icon={CalendarDays} label="Jadwal Dhuha" desc="Atur guru terjadwal shalat dhuha" href="/admin/absensi-harian/dhuha" />
            <MenuRow icon={FileText} label="Unduh Laporan" desc="Ekspor rekap absensi PDF/Excel" onClick={() => setMenuModal("laporan")} />
            <MenuRow icon={TrendingDown} label="Kehadiran Rendah" desc="Guru yang jarang absen kegiatan" onClick={() => setMenuModal("kehadiran-rendah")} last />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuModal === "statistik" && (
          <MobileFeatureSheet key="statistik" title="Statistik Absensi" onClose={() => setMenuModal(null)}>
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
              <RingkasanKehadiranPanel
                guruSudahAbsen={guruSudahAbsen} totalGuru={totalGuru} hadirPct={hadirPct}
                segments={segments} totalSlot={totalSlot}
                kegiatanId={activeKegiatan?.id ?? kegiatanList[0]?.id ?? null}
                kegiatanNama={activeKegiatan?.nama ?? kegiatanList[0]?.nama ?? "-"}
                belumCount={belumUntukKegiatan}
              />
            </div>
          </MobileFeatureSheet>
        )}
        {menuModal === "laporan" && (
          <MobileFeatureSheet key="laporan" title="Unduh Laporan" onClose={() => setMenuModal(null)}>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <UnduhLaporanPanel exportRange={exportRange} guruRoster={exportGuruRoster} />
            </div>
          </MobileFeatureSheet>
        )}
        {menuModal === "kehadiran-rendah" && (
          <MobileFeatureSheet key="kehadiran-rendah" title="Kehadiran Rendah" onClose={() => setMenuModal(null)}>
            <LaporanRendahKehadiran {...laporanRendahProps} />
          </MobileFeatureSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dokumenRow && (
          <DokumenModal row={dokumenRow} tanggal={tanggal} onClose={() => setDokumenRow(null)} onVerifiedChange={handleVerifiedChange} />
        )}
      </AnimatePresence>
    </>
  );
}

function AdminKegiatanRow({ k, onOpen }: {
  k: { id: string; nama: string; jamLabel: string; window: "BELUM_MULAI" | "BUKA" | "TUTUP"; jumlahAbsen: number; guruTotal: number };
  onOpen: () => void;
}) {
  const cfg = KEGIATAN_WINDOW_CFG[k.window];
  const pct = k.guruTotal > 0 ? Math.round((k.jumlahAbsen / k.guruTotal) * 100) : 0;
  return (
    <button type="button" onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-slate-100 py-3.5 text-left last:border-0 dark:border-slate-700/50">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${cfg.clr}1E` }}>
        <CalendarCheck2 size={17} style={{ color: cfg.clr }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{k.nama}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{k.jamLabel}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ background: cfg.clr }}>
          {k.jumlahAbsen}/{k.guruTotal}
        </span>
        <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
      </div>
      <ChevronRight size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
    </button>
  );
}

function MenuRow({ icon: Icon, label, desc, href, onClick, last }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  desc: string;
  href?: string;
  onClick?: () => void;
  last?: boolean;
}) {
  const className = `flex w-full items-center gap-3 py-3.5 text-left ${last ? "" : "border-b border-slate-100 dark:border-slate-700/50"}`;
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "#00C85318" }}>
        <Icon size={17} style={{ color: "#00C853" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-800 dark:text-white">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{desc}</p>
      </div>
      <ChevronRight size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
    </>
  );
  if (href) {
    return <Link href={href} className={className}>{content}</Link>;
  }
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

function MobileFeatureSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl bg-[#F1F5F8] dark:bg-slate-900"
        style={{ maxHeight: "90vh" }}>

        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

