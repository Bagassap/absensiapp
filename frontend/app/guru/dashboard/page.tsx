"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar, AlertCircle, RefreshCw, TrendingUp, ClipboardCheck,
} from "lucide-react";
import GreetingHero from "@/components/dashboard/GreetingHero";
import StatsCard from "@/components/dashboard/StatsCard";
import { StatisticRainbow } from "@/components/dashboard/StatisticRainbow";
import { STATUS_CFG } from "@/components/absensi-harian/shared";

interface WeeklyItem { hari: string; date: string; status: "HADIR" | "IZIN" | "SAKIT" | "ALPA" | null }
interface DashboardData {
  kehadiran: { hadir: number; izin: number; sakit: number; total: number; persen: number };
  weeklyAbsensi: WeeklyItem[];
}

const P = "#0082FB";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/60 ${className}`} />;
}

export default function GuruDashboardPage() {
  const [user, setUser]       = useState<{ nama: string; role: string; id: string } | null>(null);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [meRes, dashRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/dashboard/guru")]);
      if (!meRes.ok || !dashRes.ok) throw new Error("Gagal memuat data");
      const [me, dash] = await Promise.all([meRes.json(), dashRes.json()]);
      if (dash.error) throw new Error(dash.error);
      setUser({ nama: me.nama ?? "", role: me.role ?? "GURU", id: me.id ?? "" });
      setData(dash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="space-y-5">
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{[0,1,2].map(i => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-72 xl:col-span-4" />
        <Skeleton className="col-span-12 h-72 xl:col-span-8" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
      <button onClick={load} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: P }}>
        <RefreshCw size={14} /> Coba lagi
      </button>
    </div>
  );

  if (!data || !user) return null;

  const { hadir, izin, sakit, total, persen } = data.kehadiran;

  return (
    <div className="space-y-5">

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GreetingHero nama={user.nama} role={user.role} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatsCard icon={TrendingUp} label="Hadir"           value={hadir}  sub="Total hari hadir tercatat" index={0} delay={0.05} />
        <StatsCard icon={Calendar}   label="% Hadir"         value={persen} suffix="%" sub={`Dari ${total} hari tercatat`} index={1} delay={0.10} />
        <StatsCard icon={ClipboardCheck} label="Izin / Sakit" value={izin + sakit} sub="Total izin & sakit" index={2} delay={0.15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33]"
      >
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Statistik Absensi Saya</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Rekap kehadiran keseluruhan</p>
        <StatisticRainbow hadir={hadir} sakit={sakit} izin={izin} alpha={0} total={total} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Kehadiran Minggu Ini</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Senin – Jumat</p>
          </div>
          <Link href="/guru/absensi-harian" className="rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: P }}>
            Absen Sekarang
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {data.weeklyAbsensi.map((d) => {
            const cfg = d.status ? STATUS_CFG[d.status] : null;
            return (
              <div key={d.date}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 py-3 dark:border-slate-700/50">
                <span className="text-[10px] font-bold uppercase text-slate-400">{d.hari}</span>
                {cfg ? (
                  <span className="rounded-lg px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: cfg.bg, color: cfg.clr }}>
                    {cfg.label}
                  </span>
                ) : (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-700">—</span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
