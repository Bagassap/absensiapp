"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, CalendarDays, Briefcase,
  ArrowRight,
  Users, TrendingUp, LogOut, PieChart, FileText, Download,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { DokumenModal } from "@/components/absensi-harian/DokumenModal";
import { BelumAbsenPanel } from "@/components/absensi-harian/BelumAbsenPanel";
import { AbsensiMagangTable } from "@/components/absensi-magang/AbsensiMagangTable";
import { ExportButtons } from "@/components/absensi-magang/ExportButtons";
import { useExportRange } from "@/components/absensi-harian/useExportRange";
import { paginate } from "@/components/shared/PageSizeToggle";
import { STATUS_CFG, PULANG_CFG, MONTH_NAMES, RANGE_MODE_CARDS, reportCardFg, todayJakarta, formatTgl } from "@/components/absensi-harian/shared";
import type { SiswaAbsensi, FilterAbsensi, RekapTempat, TempatMagang } from "@/components/absensi-magang/types";

// Same shape/size as the clickable tempat pill (icon badge + 2-line text),
// but static (a div, not a button) with a muted icon — reads as a stat
// display rather than an action.
function MiniStat({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="flex h-full w-full items-center gap-2 rounded-2xl border-2 border-transparent bg-slate-50 px-3 py-2.5 dark:bg-slate-700/30">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{value}</p>
        <p className="truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function RingkasanKehadiranCard({
  tempatList, selectedId, onSelectTempat, tempatStat, siswaList, rekap, hadirPct, total, pulangCount, belumAbsen, tempatNama,
}: {
  tempatList: TempatMagang[]; selectedId: string; onSelectTempat: (id: string) => void;
  tempatStat: (t: TempatMagang) => { hd: number; tt: number; pct: number };
  siswaList: SiswaAbsensi[];
  rekap: RekapTempat["rekap"]; hadirPct: number; total: number; pulangCount: number; belumAbsen: number; tempatNama?: string;
}) {
  const segments = [
    { key: "HADIR", value: rekap.HADIR, color: STATUS_CFG.HADIR.clr, label: STATUS_CFG.HADIR.label },
    { key: "IZIN", value: rekap.IZIN, color: STATUS_CFG.IZIN.clr, label: STATUS_CFG.IZIN.label },
    { key: "SAKIT", value: rekap.SAKIT, color: STATUS_CFG.SAKIT.clr, label: STATUS_CFG.SAKIT.label },
    { key: "ALPA", value: rekap.ALPA, color: STATUS_CFG.ALPA.clr, label: STATUS_CFG.ALPA.label },
  ];
  const r = 40;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  const sudahAbsen = total - belumAbsen;
  const progresPct = total > 0 ? Math.round((sudahAbsen / total) * 100) : 0;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0082FB" }}>
          <PieChart size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Ringkasan Kehadiran</p>
          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
            Distribusi status siswa bimbingan hari ini{tempatNama ? ` · ${tempatNama}` : ""}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Sudah <span className="font-bold text-slate-700 dark:text-slate-200">{sudahAbsen}</span> dari <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> siswa bimbingan tercatat absen hari ini
        {belumAbsen > 0 ? `, ${belumAbsen} lagi belum absen.` : ", semua siswa sudah absen."}
      </p>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="grid grid-cols-[repeat(auto-fit,140px)] items-stretch justify-start gap-2.5">
            {tempatList.map((t) => {
              const s = tempatStat(t);
              const isSelected = t.id === selectedId;
              return (
                <button type="button" key={t.id} onClick={() => onSelectTempat(t.id)}
                  className={`flex h-full w-full items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? "border-[#0082FB] bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                      : "border-transparent bg-slate-50 hover:border-slate-200 dark:bg-slate-700/40 dark:hover:border-slate-600"
                  }`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isSelected ? "bg-[#0082FB] text-white" : "bg-white text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}>
                    <Briefcase size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${isSelected ? "text-[#0082FB] dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}>
                      {t.namaTempat}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {s.hd}/{s.tt} hadir · {s.pct}%
                    </p>
                  </div>
                </button>
              );
            })}

            <MiniStat icon={ClipboardCheck} value={`${sudahAbsen}/${total}`} label={`Progres absen · ${progresPct}%`} />
            <MiniStat icon={LogOut} value={pulangCount} label="Sudah pulang" />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-6">
          <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
              <circle cx="50" cy="50" r={r} stroke="#F1F5F8" strokeWidth="12" fill="none" />
              {total > 0 && segments.filter((s) => s.value > 0).map((s) => {
                const pct = s.value / total;
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
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Hadir</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {segments.map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-left">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{s.label} <span className="text-slate-700 dark:text-slate-200">{s.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-700">
        <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <Users size={12} className="text-[#0082FB]" />
          Total {total} siswa bimbingan
        </span>
      </div>
    </div>
  );
}

export default function GuruMagangAbsensiPage() {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [tanggal, setTanggal] = useState(() => todayJakarta());
  const exportRange = useExportRange(tanggal);
  const [rekapAll, setRekapAll] = useState<RekapTempat[]>([]);
  const [loading, setLoading] = useState(false);
  const [dokumenSiswa, setDokumenSiswa] = useState<SiswaAbsensi | null>(null);
  const [dokumenSource, setDokumenSource] = useState<"hadir" | "pulang">("hadir");
  const [activeFilter, setActiveFilter] = useState<FilterAbsensi | null>(null);
  const [tablePage, setTablePage] = useState(0);
  const [tablePageSize, setTablePageSize] = useState<number>(10);

  // Guru pembimbing tidak punya endpoint "tempat saya" terpisah — daftar
  // tempat PKL yang relevan diturunkan langsung dari rekap (tiap rekap sudah
  // menyertakan objek tempatMagang lengkap), berbeda dari pola wali kelas di
  // Absensi Harian yang punya /api/kelas/saya tersendiri.
  const loadRekap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/magang/absensi?tanggal=${tanggal}`);
      const list = await res.json().catch(() => []);
      const rekap: RekapTempat[] = Array.isArray(list) ? list : [];
      setRekapAll(rekap);
      if (!selectedId && rekap.length > 0) setSelectedId(rekap[0].tempatMagangId);
    } catch {
      toast.error("Gagal memuat data absensi PKL", "");
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => { loadRekap(); }, [loadRekap]);

  useEffect(() => { setTablePage(0); }, [selectedId, tanggal, activeFilter, tablePageSize]);

  const tempatList = rekapAll.map((r) => r.tempatMagang);
  const selectedTempat = tempatList.find((t) => t.id === selectedId);
  const selected = rekapAll.find((r) => r.tempatMagangId === selectedId) ?? null;
  const siswaList = selected?.siswa ?? [];
  const rekap = selected?.rekap ?? { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
  const pulangCount = selected?.pulangCount ?? 0;
  const total = siswaList.length;
  const sudahAbsen = siswaList.filter((s) => s.status !== null).length;
  const hadirPct = total > 0 ? Math.round((rekap.HADIR / total) * 100) : 0;

  function tempatStat(t: TempatMagang) {
    const r = rekapAll.find((x) => x.tempatMagangId === t.id);
    const hd = r?.rekap.HADIR ?? 0;
    const tt = r?.siswa.length ?? 0;
    return { hd, tt, pct: tt > 0 ? Math.round((hd / tt) * 100) : 0 };
  }

  const filteredSiswa = !activeFilter
    ? siswaList
    : activeFilter === "PULANG"
      ? siswaList.filter((s) => !!s.waktuPulang)
      : siswaList.filter((s) => s.status === activeFilter);
  const { pageItems: pagedSiswa, pageCount: tablePageCount, start: tableStart, end: tableEnd } = paginate(filteredSiswa, tablePage, tablePageSize);

  function toggleFilter(key: FilterAbsensi) {
    setActiveFilter((prev) => (prev === key ? null : key));
  }

  const filterOptions: { key: FilterAbsensi | null; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { key: null, label: "Semua", icon: Users, count: total, color: "#334155" },
    { key: "HADIR", label: "Hadir", icon: STATUS_CFG.HADIR.icon, count: rekap.HADIR, color: STATUS_CFG.HADIR.clr },
    { key: "IZIN", label: "Izin", icon: STATUS_CFG.IZIN.icon, count: rekap.IZIN, color: STATUS_CFG.IZIN.clr },
    { key: "SAKIT", label: "Sakit", icon: STATUS_CFG.SAKIT.icon, count: rekap.SAKIT, color: STATUS_CFG.SAKIT.clr },
    { key: "ALPA", label: "Alpa", icon: STATUS_CFG.ALPA.icon, count: rekap.ALPA, color: STATUS_CFG.ALPA.clr },
    { key: "PULANG", label: "Pulang", icon: PULANG_CFG.icon, count: pulangCount, color: PULANG_CFG.clr },
  ];

  if (!loading && tempatList.length === 0) {
    return (
      <div className="space-y-5 p-1">
        <div className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "#0082FB" }}>
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
              <ClipboardCheck size={22} className="text-white sm:hidden" />
              <ClipboardCheck size={26} className="hidden text-white sm:block" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Absensi PKL</h1>
              <p className="mt-0.5 text-sm text-white/70">Presensi kehadiran siswa PKL bimbingan Anda</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
            <Briefcase size={24} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Anda belum menjadi guru pembimbing PKL siswa manapun</p>
          <p className="max-w-sm text-xs text-slate-400">Hubungi admin untuk ditetapkan sebagai pembimbing saat siswa ditempatkan PKL.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 p-1">
        <div className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: "#0082FB" }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
                <ClipboardCheck size={22} className="text-white sm:hidden" />
                <ClipboardCheck size={26} className="hidden text-white sm:block" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Presensi PKL</span>
                <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Absensi PKL</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <RingkasanKehadiranCard
                tempatList={tempatList} selectedId={selectedId} onSelectTempat={setSelectedId} tempatStat={tempatStat}
                siswaList={siswaList} rekap={rekap} hadirPct={hadirPct} total={total}
                pulangCount={pulangCount} belumAbsen={total - sudahAbsen} tempatNama={selectedTempat?.namaTempat} />
            </div>

            <div className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Keterangan Absensi</p>
                <a href="#status-kehadiran-hari-ini"
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  More <ArrowRight size={12} />
                </a>
              </div>
              <BelumAbsenPanel siswaList={siswaList} />
            </div>
          </div>
        </div>

        <div id="status-kehadiran-hari-ini" className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  Status Kehadiran Hari Ini <span className="font-medium text-slate-400">({total})</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatTgl(tanggal)}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50 sm:w-full sm:max-w-xs">
                <CalendarDays size={14} className="shrink-0 text-slate-400" />
                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none dark:text-slate-200" />
              </div>
            </div>

            <div className="mt-6 mb-2 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-6 pb-2 dark:border-slate-700">
              <span className="mr-1 text-xs font-semibold text-slate-400">Status:</span>
              {filterOptions.map((opt) => {
                const active = activeFilter === opt.key;
                return (
                  <button key={String(opt.key)} type="button"
                    onClick={() => (opt.key === null ? setActiveFilter(null) : toggleFilter(opt.key))}
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                    style={active ? { backgroundColor: opt.color, color: "#fff" } : {}}>
                    <span className={`flex items-center gap-2 ${active ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"}`}>
                      <opt.icon size={16} />
                      {opt.label}
                      <span className={`rounded-md px-2 py-0.5 text-xs ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`}>
                        {opt.count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-[11px] dark:border-slate-700">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <Users size={12} className="text-[#0082FB]" />
                Total {total} siswa
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <TrendingUp size={12} className="text-[#0082FB]" />
                Kehadiran {hadirPct}%
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <LogOut size={12} className="text-[#0082FB]" />
                Sudah pulang {pulangCount} siswa
              </span>
            </div>

            <div className="mt-4 -mx-5 -mb-5 overflow-hidden rounded-b-3xl border-t border-slate-100 dark:border-slate-700">
              <AbsensiMagangTable
                loading={loading}
                hasSiswa={siswaList.length > 0}
                filteredSiswa={filteredSiswa}
                pagedSiswa={pagedSiswa}
                tableStart={tableStart}
                tableEnd={tableEnd}
                activeFilter={activeFilter}
                tablePage={tablePage}
                setTablePage={setTablePage}
                tablePageCount={tablePageCount}
                tablePageSize={tablePageSize}
                setTablePageSize={setTablePageSize}
                onOpenDokumen={(s, source) => { setDokumenSiswa(s); setDokumenSource(source); }}
                tempatMagangId={selectedId}
                tanggal={tanggal}
                onStatusUpdated={loadRekap}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0082FB" }}>
                <FileText size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Unduh Laporan</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Ekspor rekap absensi PKL ke PDF/Excel</p>
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
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0082FB] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200" />
            )}

            {exportRange.rangeMode === "bulanan" && (
              <div className="mt-2 flex items-center gap-1.5">
                <select value={exportRange.bulan} onChange={(e) => exportRange.setBulan(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0082FB] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select value={exportRange.tahun} onChange={(e) => exportRange.setTahun(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0082FB] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200">
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}

            <div className="mt-3">
              <ExportButtons tempatMagangId={selectedId} tempatNama={selectedTempat?.namaTempat ?? "Tempat"} range={exportRange.range} siswaList={siswaList} />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <Download size={11} className="shrink-0 text-[#0082FB]" />
              Pilih rentang waktu, lalu klik salah satu tombol ekspor
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {dokumenSiswa && (
          <DokumenModal siswa={dokumenSiswa} tanggal={tanggal} kelas={selectedTempat?.namaTempat ?? ""} source={dokumenSource} onClose={() => setDokumenSiswa(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
