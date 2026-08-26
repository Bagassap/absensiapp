"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Users, Calendar, GraduationCap,
  Bell, AlertCircle, RefreshCw, ChevronRight,
  TrendingUp, Megaphone, Clock, ClipboardCheck,
} from "lucide-react";
import GreetingHero from "@/components/dashboard/GreetingHero";
import StatsCard from "@/components/dashboard/StatsCard";
import { KehadiranAreaChart } from "@/components/dashboard/KehadiranAreaChart";
import { StatisticRainbow } from "@/components/dashboard/StatisticRainbow";
import { timeAgo } from "@/components/dashboard/ActivityList";
import PengumumanDetailModal from "@/components/pengumuman/PengumumanDetailModal";


interface Pengumuman {
  id: string; judul: string; slug: string; kategori: string;
  isPinned: boolean; createdAt: string;
  author: { id: string; nama: string; role: string };
  _count: { komentar: number };
}
interface KelasWali { id: string; nama: string }
interface WeeklyItem { hari: string; hadir: number; total: number }
interface DashboardData {
  kelasWali: KelasWali[]; siswaAmpu: number;
  kehadiran: { hadir: number; izin: number; sakit: number; alpa: number; total: number; persen: number };
  weeklyAbsensi: WeeklyItem[];
  pengumuman: Pengumuman[];
}


const P = "#0082FB";
const R = "#EF4444";
const G = "#00D67F";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/60 ${className}`} />;
}

const KATEGORI_COLOR: Record<string, string> = {
  UMUM: P, AKADEMIK: "#0082FB", EKSKUL: G, DARURAT: R,
};
const kColor = (k: string) => KATEGORI_COLOR[k] ?? P;

function SectionCard({
  title, action, icon: Icon, iconColor = P, children, delay = 0,
  className = "", bodyClass = "",
}: {
  title: string; action?: React.ReactNode; icon?: React.ElementType; iconColor?: string;
  children: React.ReactNode; delay?: number; className?: string; bodyClass?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-700/40">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${iconColor}18` }}>
              <Icon size={14} style={{ color: iconColor }} />
            </div>
          )}
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        {action}
      </div>
      <div className={`flex-1 ${bodyClass}`}>{children}</div>
    </motion.div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-[11px] font-semibold"
      style={{ color: P }}>
      Lihat Semua <ChevronRight size={12} />
    </Link>
  );
}


export default function GuruDashboardPage() {
  const [user, setUser]       = useState<{ nama: string; role: string; id: string } | null>(null);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

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
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-72 xl:col-span-4" />
        <Skeleton className="col-span-12 h-72 xl:col-span-8" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-80 xl:col-span-7" />
        <Skeleton className="col-span-12 h-80 xl:col-span-5" />
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

  const hadirCount = data.kehadiran.hadir;
  const sakit      = data.kehadiran.sakit;
  const izin       = data.kehadiran.izin;
  const alpha      = data.kehadiran.alpa;
  const kelasWali  = data.kelasWali ?? [];

  const CARDS = [
    {
      href: "/guru/absensi-harian",
      label: "Absensi Harian",
      value: data.kehadiran.hadir,
      suffix: " hadir",
      gradient: "#0064E0", // blue
      icon: ClipboardCheck,
    },
    {
      href: "/guru/data-siswa",
      label: "Siswa Diampu",
      value: data.siswaAmpu,
      suffix: " siswa",
      gradient: "#C3F84A", // lime (utama)
      icon: Users,
    },
    {
      href: "/guru/absensi-harian",
      label: "Kelas Wali",
      value: kelasWali.length,
      suffix: " kelas",
      gradient: "#0082FB", // biru terang
      icon: GraduationCap,
    },
    {
      href: "/guru/pengumuman",
      label: "Pengumuman",
      value: data.pengumuman.length,
      suffix: " info",
      gradient: "#EF4444", // pengumuman tidak pakai lime — merah
      icon: Megaphone,
    },
  ] as const;

  return (
    <div className="space-y-5">

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GreetingHero nama={user.nama} role={user.role} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard icon={Users}         label="Siswa Diampu" value={data.siswaAmpu}        sub="Di kelas yang Anda ampu" index={0} delay={0.05} />
        <StatsCard icon={GraduationCap} label="Kelas Wali"   value={kelasWali.length}      sub="Kelas dengan Anda sebagai wali" index={1} delay={0.10} />
        <StatsCard icon={TrendingUp}    label="Kehadiran"    value={data.kehadiran.hadir} suffix="hadir" sub="Siswa hadir hari ini" index={2} delay={0.15} />
        <StatsCard icon={Calendar}      label="% Hadir Hari Ini" value={data.kehadiran.persen} suffix="%" sub="Dari siswa yang diampu" index={3} delay={0.20} />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="col-span-12 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-4"
        >
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Statistik Kehadiran</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Distribusi absensi kelas wali hari ini</p>
          <StatisticRainbow
            hadir={hadirCount} sakit={sakit} izin={izin} alpha={alpha}
            total={data.kehadiran.total}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="col-span-12 flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-8"
        >
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Overview Kehadiran</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tren mingguan kelas wali Anda</p>
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
              Belum ada data kehadiran
            </p>
          ) : (
            <KehadiranAreaChart data={data.weeklyAbsensi} />
          )}
        </motion.div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card, i) => {
          const onDark = card.gradient !== "#C3F84A";
          const fg = onDark ? "#FFFFFF" : "#1C2B33";
          return (
          <motion.div key={card.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.35, delay: 0.4 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link href={card.href}
              className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl p-5"
              style={{ background: card.gradient, color: fg, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ backgroundColor: `${fg}1a` }} />
              <div className="pointer-events-none absolute -bottom-4 right-12 h-20 w-20 rounded-full" style={{ backgroundColor: `${fg}14` }} />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: `${fg}B3` }}>Akses Cepat</p>
                  <p className="mt-0.5 text-sm font-bold">{card.label}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${fg}33` }}>
                  <card.icon size={17} />
                </div>
              </div>
              <div className="relative">
                <p className="text-3xl font-bold tabular-nums">{card.value}{card.suffix}</p>
              </div>
              <div className="relative flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: `${fg}99` }}>TA</p>
                  <p className="text-[11px] font-semibold">2026/2027</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: `${fg}99` }}>Guru</p>
                  <p className="max-w-25 truncate text-[11px] font-semibold">{user.nama}</p>
                </div>
              </div>
            </Link>
          </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">

        <SectionCard title="Kelas Wali Saya" icon={GraduationCap} iconColor={P}
          action={<ViewAll href="/guru/absensi-harian" />}
          delay={0.45} className="col-span-12 xl:col-span-5" bodyClass="px-4 py-2">
          {kelasWali.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Anda belum menjadi wali kelas</p>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {kelasWali.map((k, i) => (
                <motion.li key={k.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
                    style={{ background: "#0082FB" }}>
                    {k.nama.charAt(0)}
                  </div>
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{k.nama}</p>
                </motion.li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Pengumuman Terbaru" icon={Megaphone} iconColor={R}
          action={
            <div className="flex items-center gap-2">
              {data.pengumuman.length > 0 &&
                <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${R}18`, color: R }}>{data.pengumuman.length}</span>
              }
              <ViewAll href="/guru/pengumuman" />
            </div>
          }
          delay={0.5} className="col-span-12 xl:col-span-7" bodyClass="px-0 py-0">
          {data.pengumuman.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada pengumuman</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {data.pengumuman.map((p, i) => (
                <motion.li key={p.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 + i * 0.06 }}
                  onClick={() => setSelectedSlug(p.slug)}
                  className="group relative flex cursor-pointer items-center gap-3 overflow-hidden px-5 py-3.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <div className="absolute inset-y-0 left-0 w-0.5 rounded-r" style={{ backgroundColor: kColor(p.kategori) }} />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${kColor(p.kategori)}18` }}>
                    <Bell size={14} style={{ color: kColor(p.kategori) }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="line-clamp-1 text-[13px] font-semibold text-slate-800 dark:text-white">{p.judul}</p>
                      {p.isPinned && <span className="shrink-0 text-[10px]">📌</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock size={9} />
                      <span>{timeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold"
                    style={{ background: `${kColor(p.kategori)}18`, color: kColor(p.kategori) }}>{p.kategori}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <AnimatePresence>
        {selectedSlug && (
          <PengumumanDetailModal key={selectedSlug} slug={selectedSlug} canManage={false} currentUserId={user.id}
            onClose={() => setSelectedSlug(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
