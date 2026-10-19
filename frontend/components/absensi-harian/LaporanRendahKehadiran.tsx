"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, ShieldCheck, Medal, AlertTriangle, CalendarCheck2, Gauge, X, ArrowRight, UserX } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColor, CARD_GRADIENTS } from "./shared";
import { BelumAbsenKegiatanPanel, type AlfaRow, type KegiatanRingkas } from "./BelumAbsenKegiatanPanel";
import type { LaporanRendahKehadiran as LaporanData, PeriodeLaporan } from "./types";

const INLINE_LIMIT = 5;
const GRID_COLS = "36px 40px 2fr 1.4fr 80px 1.2fr";

const RANK_STYLE = [
  { bg: "#EFFEEC", clr: "#00C853" },
  { bg: "#FFF7E4", clr: "#000000" },
  { bg: "#E7EAEC", clr: "#000000" },
];

function RankBadge({ index }: { index: number }) {
  if (index < 3) {
    const style = RANK_STYLE[index];
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: style.bg }}>
        <Medal size={15} style={{ color: style.clr }} />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-400 dark:bg-slate-700 dark:text-slate-500">
      {index + 1}
    </span>
  );
}

function severityColor(pct: number) {
  if (pct < 50) return "#EF4444";
  return "#00C853";
}

function StatPill({
  icon: Icon, gradient, iconColor, value, label, textColor = "#FFFFFF",
}: {
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  value: string;
  label: string;
  textColor?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 shadow-sm" style={{ background: gradient }}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white">
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-black" style={{ color: textColor }}>{value}</p>
        <p className="whitespace-nowrap text-[9px] font-bold" style={{ color: textColor }}>{label}</p>
      </div>
    </div>
  );
}

export function LaporanRendahKehadiran({
  kegiatanHariIni = [], alfaRows = [],
}: {
  kegiatanHariIni?: KegiatanRingkas[];
  alfaRows?: AlfaRow[];
} = {}) {
  const [periode, setPeriode] = useState<PeriodeLaporan>("mingguan");
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ periode });
    fetch(`/api/absensi-harian/laporan-rendah-kehadiran?${qs}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d && Array.isArray(d.guru) ? d : null); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [periode]);

  const rows = data?.guru ?? [];
  const totalBermasalah = rows.length;
  const tidakHadirTertinggi = rows.reduce((m, r) => Math.max(m, r.summary.tidakHadir), 0);
  const rataKehadiran = rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.summary.persentaseKehadiran, 0) / rows.length) * 10) / 10
    : 0;
  const inlineRows = rows.slice(0, INLINE_LIMIT);

  return (
    <>
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {kegiatanHariIni.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#013920" }}>
                <UserX size={15} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Belum Absen Kegiatan</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Kegiatan hari ini yang belum lengkap</p>
              </div>
            </div>
            <BelumAbsenKegiatanPanel kegiatanList={kegiatanHariIni} rows={alfaRows} />
            <div className="my-4 border-t border-slate-100 dark:border-slate-700" />
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#EF4444" }}>
              <TrendingDown size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Kehadiran Rendah</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Jarang absen kegiatan</p>
            </div>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-700/50">
            {([
              { key: "mingguan", label: "7 Hari" },
              { key: "bulanan", label: "30 Hari" },
            ] as { key: PeriodeLaporan; label: string }[]).map((opt) => (
              <button key={opt.key} type="button" onClick={() => setPeriode(opt.key)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  periode === opt.key ? "bg-red-500 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : inlineRows.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
            <ShieldCheck size={22} className="text-emerald-400" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tidak ada guru dengan kehadiran rendah pada periode ini
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {inlineRows.map((r, i) => {
              const bar = severityColor(r.summary.persentaseKehadiran);
              return (
                <div key={r.guruId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                  <RankBadge index={i} />
                  <Avatar src={r.fotoProfil} nama={r.nama ?? "-"} sizePx={32} fallbackBg={avatarColor(r.nama ?? "-")} textClassName="text-[10px] font-extrabold" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{r.nama}</p>
                    <p className="truncate text-[10px] text-slate-400">{r.nip ?? "—"} · Absen {r.summary.hadir}/{r.summary.totalKegiatan} kegiatan</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold" style={{ color: bar }}>{r.summary.persentaseKehadiran}%</span>
                </div>
              );
            })}
          </div>
        )}

        {totalBermasalah > INLINE_LIMIT && (
          <button type="button" onClick={() => setShowModal(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100 dark:bg-red-900/20">
            Lihat semua {totalBermasalah} guru <ArrowRight size={12} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 max-lg:items-end max-lg:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 max-lg:max-w-none max-lg:rounded-b-none max-lg:rounded-t-[32px] max-lg:max-h-[90dvh] max-lg:pb-[env(safe-area-inset-bottom)] max-lg:before:mx-auto max-lg:before:mb-1 max-lg:before:mt-3 max-lg:before:block max-lg:before:h-1.5 max-lg:before:w-10 max-lg:before:shrink-0 max-lg:before:rounded-full max-lg:before:bg-slate-300 max-lg:before:content-['']">

              <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-4" style={{ backgroundColor: "#FEE9EA" }}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800">
                    <TrendingDown size={17} style={{ color: "#EF4444" }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Guru Kehadiran Rendah
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {data ? `${data.totalKegiatan} kegiatan dalam periode ini` : "Memuat..."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <div className="flex rounded-xl bg-white p-1 dark:bg-slate-800">
                    {([
                      { key: "mingguan", label: "7 Hari" },
                      { key: "bulanan", label: "30 Hari" },
                    ] as { key: PeriodeLaporan; label: string }[]).map((opt) => (
                      <button key={opt.key} type="button" onClick={() => setPeriode(opt.key)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                          periode === opt.key
                            ? "bg-[#00C853] text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowModal(false)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 px-5 py-3">
                <StatPill icon={AlertTriangle} gradient={CARD_GRADIENTS[1]} iconColor="#EF4444" value={String(totalBermasalah)} label="Bermasalah" />
                <StatPill icon={CalendarCheck2} gradient={CARD_GRADIENTS[2]} iconColor="#00C853" textColor="#000000" value={`${tidakHadirTertinggi}x`} label="Tidak Hadir Terbanyak" />
                <StatPill icon={Gauge} gradient={CARD_GRADIENTS[0]} iconColor="#00C853" textColor="#000000" value={`${rataKehadiran}%`} label="Rata Hadir" />
              </div>

              {loading ? (
                <div className="flex-1 py-10 text-center text-xs font-semibold text-slate-400">Memuat data...</div>
              ) : rows.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                  <ShieldCheck size={22} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Tidak ada guru dengan kehadiran rendah pada periode ini
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto border-t border-slate-100 dark:border-slate-700">
                  <div className="min-w-150">
                    <div className="grid items-center gap-3 border-b border-slate-100 px-5 py-2.5 dark:border-slate-700"
                      style={{ gridTemplateColumns: GRID_COLS }}>
                      <span />
                      <span />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Guru</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">NIP</span>
                      <span className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Absen</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kehadiran</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {rows.map((r, i) => {
                        const bar = severityColor(r.summary.persentaseKehadiran);
                        return (
                          <div key={r.guruId}
                            className="grid items-center gap-3 px-5 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                            style={{ gridTemplateColumns: GRID_COLS }}>
                            <RankBadge index={i} />
                            <Avatar
                              src={r.fotoProfil}
                              nama={r.nama ?? "-"}
                              sizePx={32}
                              fallbackBg={avatarColor(r.nama ?? "-")}
                              textClassName="text-[10px] font-extrabold"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{r.nama}</p>
                            </div>
                            <p className="truncate text-[11px] text-slate-400">{r.nip ?? "—"}</p>
                            <span className="mx-auto rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-500 dark:bg-red-950">
                              {r.summary.hadir}/{r.summary.totalKegiatan}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <span className="block h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${r.summary.persentaseKehadiran}%`, backgroundColor: bar }} />
                              </span>
                              <span className="w-9 shrink-0 text-right text-[10px] font-bold" style={{ color: bar }}>{r.summary.persentaseKehadiran}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
