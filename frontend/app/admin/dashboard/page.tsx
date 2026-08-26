"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Users, GraduationCap, School, Calendar,
  Bell, AlertCircle, RefreshCw, ChevronRight,
  Megaphone, Activity, Clock, BookOpen,
  Briefcase, FileText,
} from "lucide-react";
import GreetingHero from "@/components/dashboard/GreetingHero";
import StatsCard from "@/components/dashboard/StatsCard";
import { timeAgo } from "@/components/dashboard/ActivityList";
import PengumumanDetailModal from "@/components/pengumuman/PengumumanDetailModal";
import { KehadiranAreaChart } from "@/components/dashboard/KehadiranAreaChart";
import { KehadiranBarChart } from "@/components/dashboard/KehadiranBarChart";
import { StatisticRainbow } from "@/components/dashboard/StatisticRainbow";
const P = "#0082FB";   
const R = "#EF4444";   
const B = "#0082FB";   
const G = "#00D67F";   


interface Pengumuman {
  id: string; judul: string; slug: string; kategori: string;
  isPinned: boolean; createdAt: string;
  author: { id: string; nama: string; role: string };
  _count: { komentar: number };
}
interface WeeklyItem { hari: string; hadir: number; total: number }
interface KehadiranKelas {
  kelas: string; totalSiswa: number; hadir: number; tidakHadir: number; persentase: number;
}
interface DashboardData {
  totalSiswa: number; totalGuru: number; totalKelas: number;
  kehadiran: { hadir: number; izin: number; sakit: number; alpa: number; total: number; persen: number };
  weeklyAbsensi: WeeklyItem[];
  pengumuman: Pengumuman[];
  kehadiranPerKelas: KehadiranKelas[];
}


function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-slate-100 dark:bg-[#1C2B33] ${className}`} />;
}

const KATEGORI_COLOR: Record<string, string> = {
  UMUM: P, AKADEMIK: B, EKSKUL: G, DARURAT: R,
};
const kColor = (k: string) => KATEGORI_COLOR[k] ?? B;

function SectionCard({
  title, action, icon: Icon, iconColor = P, children, delay = 0,
  className = "", bodyClass = "", style,
}: {
  title: string; action?: React.ReactNode; icon?: React.ElementType; iconColor?: string;
  children: React.ReactNode; delay?: number; className?: string; bodyClass?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:bg-[#1C2B33] ${className}`}
      style={style}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-7.5 py-4 dark:border-slate-700/40">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${iconColor}20` }}>
              <Icon size={14} style={{ color: iconColor }} />
            </div>
          )}
          <span className="text-sm font-semibold text-slate-800 dark:text-white">{title}</span>
        </div>
        {action}
      </div>
      <div className={`flex-1 ${bodyClass}`}>{children}</div>
    </motion.div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: P }}>
      Lihat Semua <ChevronRight size={12} />
    </Link>
  );
}


export default function AdminDashboardPage() {
  const [user, setUser]       = useState<{ nama: string; role: string; id: string } | null>(null);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

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
        <Skeleton className="col-span-12 h-96 xl:col-span-8" />
        <Skeleton className="col-span-12 h-96 xl:col-span-4" />
      </div>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <Skeleton className="col-span-12 h-96 xl:col-span-7" />
        <Skeleton className="col-span-12 h-96 xl:col-span-5" />
      </div>
      <Skeleton className="h-52" />
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

  const hadirCount = data.kehadiran.hadir;
  const kelasData  = data.kehadiranPerKelas ?? [];
  const sakit      = data.kehadiran.sakit;
  const izin       = data.kehadiran.izin;
  const alpha      = data.kehadiran.alpa;

  const CARDS = [
    {
      href: "/admin/absensi-harian",
      label: "Absensi Harian",
      value: data.kehadiran.hadir,
      prefix: "",
      suffix: " hadir",
      validThru: "2026/2027",
      holder: "Admin PPLG",
      gradient: "#0064E0", // blue
      icon: Calendar,
    },
    {
      href: "/admin/pengumuman",
      label: "Pengumuman",
      value: data.pengumuman.length,
      prefix: "",
      suffix: " item",
      validThru: "2026/2027",
      holder: "Admin PPLG",
      gradient: "#EF4444", // pengumuman tidak pakai lime — merah
      icon: Megaphone,
    },
    {
      href: "/admin/magang",
      label: "PKL",
      value: data.totalSiswa,
      prefix: "",
      suffix: " siswa",
      validThru: "2026/2027",
      holder: "Admin PPLG",
      gradient: "#C3F84A", // lime (utama)
      icon: Briefcase,
    },
    {
      href: "/admin/ujian-ukk",
      label: "UKK",
      value: data.totalKelas,
      prefix: "",
      suffix: " kelas",
      validThru: "2026/2027",
      holder: "Admin PPLG",
      gradient: "#0082FB", // biru terang
      icon: FileText,
    },
  ] as const;

  return (
    <div className="space-y-5">

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GreetingHero nama={user.nama} role={user.role} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <StatsCard icon={Users}         label="Total Siswa"  value={data.totalSiswa}           sub="Siswa aktif terdaftar" index={0} delay={0.05} />
        <StatsCard icon={GraduationCap} label="Total Guru"   value={data.totalGuru}            sub="Termasuk wali kelas" index={1} delay={0.10} />
        <StatsCard icon={School}        label="Total Kelas"  value={data.totalKelas}           sub="X, XI, XII PPLG" index={2} delay={0.15} />
        <StatsCard icon={Calendar}      label="% Hadir Hari Ini" value={data.kehadiran.persen} suffix="%" sub="Dari total siswa" index={3} delay={0.20} />
        <StatsCard icon={Activity}      label="Kehadiran"    value={data.kehadiran.hadir} suffix="hadir" sub="Siswa tercatat hadir" index={0} delay={0.25} />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="col-span-12 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-4"
        >
          <div className="mb-1">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Statistik Kehadiran</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Distribusi kehadiran hari ini</p>
          </div>
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
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Overview Kehadiran</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tren mingguan — hadir vs total siswa</p>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card, i) => {
          const onDark = card.gradient !== "#C3F84A"; // lime butuh teks gelap, sisanya teks putih
          const fg = onDark ? "#FFFFFF" : "#1C2B33";
          return (
          <motion.div key={card.href}
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
                <p className="text-3xl font-bold tabular-nums">
                  {card.prefix}{card.value}{card.suffix}
                </p>
              </div>

              <div className="relative flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: `${fg}99` }}>TA</p>
                  <p className="text-[11px] font-semibold">{card.validThru}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: `${fg}99` }}>Pengelola</p>
                  <p className="text-[11px] font-semibold">{card.holder}</p>
                </div>
              </div>
            </Link>
          </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">

        <SectionCard title="Pengumuman Terbaru" icon={Megaphone} iconColor={R}
          action={
            <div className="flex items-center gap-2">
              {data.pengumuman.length > 0 &&
                <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: R + "18", color: R }}>{data.pengumuman.length}</span>
              }
              <ViewAll href="/admin/pengumuman" />
            </div>
          }
          delay={0.55} className="col-span-12" bodyClass="px-0 py-0">
          {data.pengumuman.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada pengumuman</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {data.pengumuman.slice(0, 5).map((p, i) => (
                <motion.li key={p.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  onClick={() => setSelectedSlug(p.slug)}
                  className="group flex cursor-pointer items-center gap-3 px-6 py-3.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: kColor(p.kategori) + "18" }}>
                    <Bell size={14} style={{ color: kColor(p.kategori) }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="line-clamp-1 text-[13px] font-semibold text-slate-800 dark:text-white">{p.judul}</p>
                      {p.isPinned && <span className="shrink-0 text-[10px]">📌</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock size={9} />
                      <span>{p.author.nama} · {timeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold"
                    style={{ background: kColor(p.kategori) + "18", color: kColor(p.kategori) }}>{p.kategori}</span>
                </motion.li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="col-span-12 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-7"
        >
          <h2 className="mb-1 text-base font-bold text-slate-800 dark:text-white">Kehadiran Per Kelas</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Hadir vs tidak hadir per kelas</p>
          {kelasData.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada data absensi</p>
          ) : (
            <KehadiranBarChart data={kelasData.map((k) => ({ kelas: k.kelas, hadir: k.hadir, tidakHadir: k.tidakHadir }))} />
          )}
        </motion.div>

        <SectionCard title="Detail Per Kelas" icon={BookOpen} iconColor={B}
          action={
            <div className="flex items-center gap-2">
              <span className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                style={{ background: B + "18", color: B }}>{kelasData.length} kelas</span>
              <ViewAll href="/admin/magang/absensi" />
            </div>
          }
          delay={0.65} className="col-span-12 xl:col-span-5">
          {kelasData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400 dark:border-slate-700/40 dark:text-slate-500">
                    <th className="py-3 pl-7.5 text-left">Kelas</th>
                    <th className="py-3 text-center">Hadir</th>
                    <th className="py-3 text-center" style={{ color: G }}>%</th>
                    <th className="py-3 pr-7.5 text-center" style={{ color: R }}>Tidak</th>
                  </tr>
                </thead>
                <tbody>
                  {kelasData.map((row, i) => (
                    <motion.tr key={row.kelas}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 + i * 0.04 }}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-700/40">
                      <td className="py-3 pl-7.5 font-semibold text-slate-800 dark:text-white">{row.kelas}</td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-300">{row.hadir}</td>
                      <td className="py-3 text-center">
                        <span className="font-bold" style={{ color: row.persentase >= 75 ? G : R }}>
                          {row.persentase}%
                        </span>
                      </td>
                      <td className="py-3 pr-7.5 text-center font-medium" style={{ color: R }}>{row.tidakHadir}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <AnimatePresence>
        {selectedSlug && (
          <PengumumanDetailModal key={selectedSlug} slug={selectedSlug} canManage currentUserId={user.id}
            onClose={() => setSelectedSlug(null)}
            onDeleted={() => { setSelectedSlug(null); load(); }}
            onPinChanged={() => load()} />
        )}
      </AnimatePresence>
    </div>
  );
}
