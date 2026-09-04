"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, CalendarDays, PieChart,
  Users, TrendingUp, FileText, Download, Bell, Check, CalendarCheck2,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { DokumenModal } from "@/components/absensi-harian/DokumenModal";
import { ExportButtons } from "@/components/absensi-harian/ExportButtons";
import { useExportRange } from "@/components/absensi-harian/useExportRange";
import { AbsensiHarianTable } from "@/components/absensi-harian/AbsensiHarianTable";
import { LaporanRendahKehadiran } from "@/components/absensi-harian/LaporanRendahKehadiran";
import { KegiatanCard } from "@/components/absensi-harian/KegiatanCard";
import { paginate } from "@/components/shared/PageSizeToggle";
import { MONTH_NAMES, RANGE_MODE_CARDS, reportCardFg, todayJakarta, formatTgl } from "@/components/absensi-harian/shared";
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

export default function AdminAbsensiHarianPage() {
  const toast = useToast();
  const tanggalInputRef = useRef<HTMLInputElement>(null);
  const [tanggal, setTanggal] = useState(() => todayJakarta());
  const exportRange = useExportRange(tanggal);
  const [rekap, setRekap] = useState<RekapKegiatanHarian | null>(null);
  const [guruRoster, setGuruRoster] = useState<GuruBasic[]>([]);
  const [loading, setLoading] = useState(false);
  const [dokumenRow, setDokumenRow] = useState<AbsensiKegiatanRow | null>(null);
  const [activeKegiatanFilter, setActiveKegiatanFilter] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState<number>(10);

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
    if (!confirm(`Hapus absensi "${row.nama ?? "guru ini"}" untuk kegiatan "${row.kegiatanNama}"? Guru akan kembali berstatus belum absen untuk kegiatan ini.`)) return;
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

  useEffect(() => { setTablePage(0); }, [tanggal, activeKegiatanFilter, tablePageSize]);

  const rows = rekap?.rows ?? [];
  const kegiatanList = rekap?.kegiatan ?? [];
  const totalGuru = guruRoster.length;
  const guruSudahAbsenIds = new Set(rows.map((r) => r.guruId));
  const guruSudahAbsen = guruSudahAbsenIds.size;
  const hadirPct = totalGuru > 0 ? Math.round((guruSudahAbsen / totalGuru) * 100) : 0;

  const filteredRows = !activeKegiatanFilter ? rows : rows.filter((r) => r.kegiatanId === activeKegiatanFilter);
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
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  const activeKegiatan = kegiatanList.find((k) => k.id === activeKegiatanFilter) ?? null;
  const belumUntukKegiatan = activeKegiatan
    ? guruRoster.filter((g) => !rows.some((r2) => r2.kegiatanId === activeKegiatan.id && r2.guruId === g.guruId)).length
    : kegiatanList.length > 0
      ? guruRoster.filter((g) => !rows.some((r2) => r2.kegiatanId === kegiatanList[0].id && r2.guruId === g.guruId)).length
      : 0;

  return (
    <>
      <div className="space-y-5 p-1">
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
            <div className="lg:col-span-2 flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
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
                  <KirimPengingatCard
                    kegiatanId={activeKegiatan?.id ?? kegiatanList[0]?.id ?? null}
                    kegiatanNama={activeKegiatan?.nama ?? kegiatanList[0]?.nama ?? "-"}
                    belumCount={belumUntukKegiatan}
                  />
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
                {/* Native date input tampilannya ikut locale browser/OS (bisa
                    jadi MM/DD/YYYY), bukan locale halaman — jadi teksnya
                    disembunyikan dan diganti label formatTgl (format
                    Indonesia) yang menumpuk di atasnya; input aslinya tetap
                    berfungsi penuh (klik/keyboard) untuk buka date picker. */}
                <div className="relative w-full min-w-0">
                  <span className="pointer-events-none block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {tanggal.split("-").reverse().join("/")}
                  </span>
                  <input ref={tanggalInputRef} type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                    // Desktop Chrome/Edge cuma membuka date picker kalau klik
                    // tepat di ikon kalender bawaan browser — karena input ini
                    // dibuat opacity-0 & di-stretch penuh (supaya formatnya
                    // konsisten Indonesia, bukan ikut locale OS), ikon bawaan
                    // itu jadi tidak kelihatan/tidak ketebak posisinya, jadi
                    // klik di mana saja pada area ini tidak membuka apa-apa.
                    // Mobile tidak kena masalah ini karena tap di mana saja
                    // pada input date langsung membuka date picker native OS.
                    // showPicker() dipanggil manual supaya klik di mana saja
                    // pada area ini tetap membuka date picker di desktop juga.
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
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
            </div>

            <LaporanRendahKehadiran
              kegiatanHariIni={kegiatanList.map((k) => ({ id: k.id, nama: k.nama, guruTotal: k.guruTotal, jumlahAbsen: k.jumlahAbsen }))}
              guruRoster={guruRoster}
              absensiHariIni={rows}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dokumenRow && (
          <DokumenModal row={dokumenRow} tanggal={tanggal} onClose={() => setDokumenRow(null)} onVerifiedChange={handleVerifiedChange} />
        )}
      </AnimatePresence>
    </>
  );
}
