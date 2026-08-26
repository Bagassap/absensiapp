"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, ShieldCheck, Medal, AlertTriangle, Flame, Gauge, X, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor } from "@/components/data-siswa/shared";
import { formatTgl, CARD_GRADIENTS, DASHBOARD_ACCENT, DASHBOARD_PASTEL } from "./shared";
import type { LaporanSeringTidakHadir as LaporanData, PeriodeLaporan } from "./types";

const INLINE_LIMIT = 5;

const GRID_COLS = "36px 40px 2fr 1.4fr 80px 1.2fr";

const RANK_STYLE = [
  { bg: "#F4FFD9", clr: "#8A9E1F" }, // gold (lime)
  { bg: "#DCEBFF", clr: "#0064E0" }, // silver (navy)
  { bg: "#E7EAEC", clr: "#1C2B33" }, // bronze (ink)
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

// Bar color varies with how bad the attendance actually is — red under 50%,
// amber under 75%, blue otherwise.
function severityColor(pct: number) {
  if (pct < 50) return "#EF4444";
  if (pct < 75) return "#8A9E1F"; // lime — varian gelap supaya kontras sebagai warna teks
  return "#0082FB";
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

export function LaporanSeringTidakHadir({ kelasId, kelasNama }: { kelasId: string; kelasNama?: string }) {
  const [periode, setPeriode] = useState<PeriodeLaporan>("mingguan");
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!kelasId) { setData(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ periode, kelasId });
    fetch(`/api/absensi-harian/laporan-sering-tidak-hadir?${qs}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d && Array.isArray(d.siswa) ? d : null); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [periode, kelasId]);

  const rows = data?.siswa ?? [];
  const totalBermasalah = rows.length;
  const alpaTertinggi = rows.reduce((m, r) => Math.max(m, r.summary.ALPA), 0);
  const rataKehadiran = rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.summary.persentaseKehadiran, 0) / rows.length) * 10) / 10
    : 0;
  const inlineRows = rows.slice(0, INLINE_LIMIT);

  return (
    <>
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#EF4444" }}>
              <TrendingDown size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Siswa Bermasalah</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Jarang absen{kelasNama ? ` di ${kelasNama}` : ""}</p>
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
              Tidak ada siswa dengan catatan alpa pada periode ini
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {inlineRows.map((r, i) => {
              const bar = severityColor(r.summary.persentaseKehadiran);
              return (
                <div key={r.siswaId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
                  <RankBadge index={i} />
                  <Avatar src={r.fotoProfil} nama={r.nama ?? "-"} sizePx={32} fallbackBg={avatarColorFor(r.nama ?? "-")} textClassName="text-[10px] font-extrabold" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{r.nama}</p>
                    <p className="truncate text-[10px] text-slate-400">{r.nis ?? "—"} · Alpa {r.summary.ALPA}x</p>
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
            Lihat semua {totalBermasalah} siswa <ArrowRight size={12} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">

              <div className="flex shrink-0 flex-wrap items-center gap-3 px-5 py-4" style={{ backgroundColor: DASHBOARD_PASTEL[2] }}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800">
                    <TrendingDown size={17} style={{ color: DASHBOARD_ACCENT[2] }} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Siswa Sering Tidak Hadir{kelasNama ? ` · ${kelasNama}` : ""}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {data ? `${formatTgl(data.tanggalMulai)} – ${formatTgl(data.tanggalSelesai)}` : "Memuat..."}
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
                            ? "bg-[#0082FB] text-white shadow-sm"
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
                <StatPill icon={Flame} gradient={CARD_GRADIENTS[2]} iconColor="#8A9E1F" textColor="#1C2B33" value={`${alpaTertinggi}x`} label="Alpa Terbanyak" />
                <StatPill icon={Gauge} gradient={CARD_GRADIENTS[0]} iconColor="#0082FB" value={`${rataKehadiran}%`} label="Rata Hadir" />
              </div>

              {loading ? (
                <div className="flex-1 py-10 text-center text-xs font-semibold text-slate-400">Memuat data...</div>
              ) : rows.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                  <ShieldCheck size={22} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Tidak ada siswa dengan catatan alpa pada periode ini
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto border-t border-slate-100 dark:border-slate-700">
                  <div className="min-w-150">
                    <div className="grid items-center gap-3 border-b border-slate-100 px-5 py-2.5 dark:border-slate-700"
                      style={{ gridTemplateColumns: GRID_COLS }}>
                      <span />
                      <span />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Siswa</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kelas</span>
                      <span className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Alpa</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kehadiran</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {rows.map((r, i) => {
                        const bar = severityColor(r.summary.persentaseKehadiran);
                        return (
                          <div key={r.siswaId}
                            className="grid items-center gap-3 px-5 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
                            style={{ gridTemplateColumns: GRID_COLS }}>
                            <RankBadge index={i} />
                            <Avatar
                              src={r.fotoProfil}
                              nama={r.nama ?? "-"}
                              sizePx={32}
                              fallbackBg={avatarColorFor(r.nama ?? "-")}
                              textClassName="text-[10px] font-extrabold"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{r.nama}</p>
                            </div>
                            <p className="truncate text-[11px] text-slate-400">{r.kelasNama} · {r.nis ?? "—"}</p>
                            <span className="mx-auto rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-500 dark:bg-red-950">
                              {r.summary.ALPA}x
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
