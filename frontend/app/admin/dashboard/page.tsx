"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users, Calendar,
  AlertCircle, RefreshCw, ChevronRight,
  Activity, ClipboardCheck, UserX,
} from "lucide-react";
import GreetingHero from "@/components/dashboard/GreetingHero";
import StatsCard from "@/components/dashboard/StatsCard";
import { KehadiranAreaChart } from "@/components/dashboard/KehadiranAreaChart";
import { StatisticRainbow } from "@/components/dashboard/StatisticRainbow";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/absensi-harian/StatusBadge";
import { avatarColor } from "@/components/absensi-harian/shared";

const P = "#0082FB";
const R = "#EF4444";
const G = "#00D67F";

interface WeeklyItem { hari: string; date: string; hadir: number; total: number }
interface StatusGuruRow {
  guruId: string; nama: string; nip: string | null; fotoProfil: string | null;
  status: "HADIR" | "IZIN" | "SAKIT" | "ALPA" | null;
  waktuAbsen: string | null; waktuPulang: string | null;
}
interface DashboardData {
  totalGuru: number;
  kehadiran: { hadir: number; izin: number; sakit: number; belumAbsen: number; total: number; persen: number };
  weeklyAbsensi: WeeklyItem[];
  statusGuru: StatusGuruRow[];
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-slate-100 dark:bg-[#1C2B33] ${className}`} />;
}

export default function AdminDashboardPage() {
  const [user, setUser]       = useState<{ nama: string; role: string; id: string } | null>(null);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [meRes, dashRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/dashboard/admin")]);
      if (!meRes.ok || !dashRes.ok) throw new Error("Gagal memuat data");
      const [me, dash] = await Promise.all([meRes.json(), dashRes.json()]);
      setUser({ nama: me.nama ?? "", role: me.role ?? "ADMIN", id: me.id ?? "" });
      setData(dash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-28" />
      <div className="grid grid-cols-12 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="col-span-6 h-28 xl:col-span-3" />)}
      </div>
      <div className="grid grid-cols-12 gap-4 md:gap-6 2xl:gap-7.5">
        <Skeleton className="col-span-12 h-96 xl:col-span-4" />
        <Skeleton className="col-span-12 h-96 xl:col-span-8" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertCircle size={40} style={{ color: R }} />
      <p className="text-sm text-slate-500">{error}</p>
      <button onClick={load} className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: P }}>
        <RefreshCw size={14} /> Coba lagi
      </button>
    </div>
  );

  if (!data || !user) return null;

  const { hadir, izin, sakit, belumAbsen } = data.kehadiran;

  return (
    <div className="space-y-5">

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GreetingHero nama={user.nama} role={user.role} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard icon={Users}          label="Total Guru"       value={data.totalGuru}            sub="Guru terdaftar"        index={0} delay={0.05} />
        <StatsCard icon={Calendar}       label="% Hadir Hari Ini" value={data.kehadiran.persen}      suffix="%" sub="Dari total guru" index={1} delay={0.10} />
        <StatsCard icon={Activity}       label="Sudah Absen"      value={hadir + izin + sakit}       sub="Guru tercatat hari ini" index={2} delay={0.15} />
        <StatsCard icon={UserX}          label="Belum Absen"      value={belumAbsen}                 sub="Guru belum tercatat"   index={3} delay={0.20} />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="col-span-12 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-4"
        >
          <div className="mb-1">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Statistik Kehadiran</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Distribusi kehadiran guru hari ini</p>
          </div>
          <StatisticRainbow
            hadir={hadir} sakit={sakit} izin={izin} alpha={0}
            total={data.kehadiran.total}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="col-span-12 flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-8"
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Overview Kehadiran</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tren mingguan — hadir vs total guru</p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-1.5 text-[11px] dark:border-slate-700/40">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: P }} />Hadir
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#C3F84A" }} />Total
              </span>
            </div>
          </div>
          {data.weeklyAbsensi.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
              Belum ada data mingguan
            </p>
          ) : (
            <KehadiranAreaChart data={data.weeklyAbsensi} />
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${P}18` }}>
              <ClipboardCheck size={15} style={{ color: P }} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Status Kehadiran Guru</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Ringkasan absensi hari ini</p>
            </div>
          </div>
          <Link href="/admin/absensi-harian" className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: P }}>
            Lihat Semua <ChevronRight size={12} />
          </Link>
        </div>
        {data.statusGuru.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada guru terdaftar</p>
        ) : (
          <ul className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {data.statusGuru.slice(0, 8).map((g, i) => (
              <motion.li key={g.guruId}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                className="flex items-center gap-3 px-6 py-3">
                <Avatar src={g.fotoProfil} nama={g.nama} sizePx={32} fallbackBg={avatarColor(g.nama)} textClassName="text-[10px] font-extrabold" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{g.nama}</p>
                  <p className="truncate text-[11px] text-slate-400">{g.nip ?? "—"}</p>
                </div>
                <span className="hidden text-[11px] font-semibold tabular-nums text-slate-400 sm:block">{g.waktuAbsen ?? "—"}</span>
                <StatusBadge status={g.status} />
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
