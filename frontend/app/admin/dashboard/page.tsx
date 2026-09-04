"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Users, Calendar,
  AlertCircle, RefreshCw, ChevronRight, ChevronLeft,
  Activity, ClipboardCheck, UserX, X, Search,
} from "lucide-react";
import GreetingHero from "@/components/dashboard/GreetingHero";
import { AksesCepatCard } from "@/components/dashboard/AksesCepatCard";
import { KehadiranAreaChart } from "@/components/dashboard/KehadiranAreaChart";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/absensi-harian/StatusBadge";
import { avatarColor } from "@/components/absensi-harian/shared";
import { PageSizeToggle, paginate } from "@/components/shared/PageSizeToggle";

const MODAL_PAGE_SIZE_OPTIONS = [10, 20, Infinity] as const;

const P = "#00C853";
const R = "#EF4444";

interface WeeklyItem { hari: string; date: string; kegiatan: number; guruHadir: number; persen: number }
interface StatusGuruRow {
  guruId: string; nama: string; nip: string | null; fotoProfil: string | null;
  kegiatanDiabsen: number; totalKegiatanHariIni: number; sudahAbsen: boolean;
}
interface DashboardData {
  totalGuru: number;
  kehadiranHariIni: { kegiatanHariIni: number; guruSudahAbsen: number; guruBelumAbsen: number; persen: number };
  weeklyKegiatan: WeeklyItem[];
  statusGuru: StatusGuruRow[];
}

type ModalKind = "total" | "persen" | "sudah" | "belum" | null;

function GuruListModal({
  kind, icon: Icon, title, subtitle, color, rows, onClose,
}: {
  kind: ModalKind;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  rows: StatusGuruRow[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const filtered = rows.filter((g) =>
    query === "" || g.nama.toLowerCase().includes(query.toLowerCase()) || (g.nip ?? "").toLowerCase().includes(query.toLowerCase())
  );
  const { pageItems: pagedRows, pageCount, start, end } = paginate(filtered, page, pageSize);

  useEffect(() => { setPage(0); }, [query, kind]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div key={kind} initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="relative z-10 flex max-h-[75vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4" style={{ backgroundColor: `${color}18` }}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <Icon size={17} style={{ color }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">{title}</p>
              <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden sm:block">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / NIP..." autoFocus
                className="w-48 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                style={{ "--tw-ring-color": color } as React.CSSProperties} />
            </div>
            <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-100">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-2.5 dark:border-slate-700 sm:hidden">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama / NIP..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              style={{ "--tw-ring-color": color } as React.CSSProperties} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {rows.length === 0 ? "Tidak ada guru pada kategori ini" : `Tidak ada yang cocok dengan “${query}”`}
          </p>
        ) : (
          <ul className="thin-scrollbar flex-1 divide-y divide-slate-50 overflow-y-auto dark:divide-slate-700/30">
            {pagedRows.map((g) => (
              <li key={g.guruId} className="flex items-center gap-3 px-5 py-3">
                <Avatar src={g.fotoProfil} nama={g.nama} sizePx={32} fallbackBg={avatarColor(g.nama)} textClassName="text-[10px] font-extrabold" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{g.nama}</p>
                  <p className="truncate text-[11px] text-slate-400">{g.nip ?? "—"}</p>
                </div>
                <span className="hidden text-[11px] font-semibold tabular-nums text-slate-400 sm:block">{g.kegiatanDiabsen}/{g.totalKegiatanHariIni}</span>
                <StatusBadge sudahAbsen={g.sudahAbsen} />
              </li>
            ))}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {start}–{end} dari {filtered.length}
            </span>
            <div className="flex items-center gap-2.5">
              <PageSizeToggle value={pageSize} onChange={setPageSize} options={MODAL_PAGE_SIZE_OPTIONS} />
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: pageCount }, (_, i) => i)
                    .filter((i) => i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1)
                    .map((i, idx, arr) => (
                      <span key={i} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== i - 1 && (
                          <span className="px-1 text-xs font-semibold text-slate-300 dark:text-slate-600">…</span>
                        )}
                        <button onClick={() => setPage(i)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            i === page
                              ? "bg-[#00C853] text-white shadow-sm"
                              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                          }`}>
                          {i + 1}
                        </button>
                      </span>
                    ))}
                  <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-slate-700">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-slate-100 dark:bg-slate-700/60 ${className}`} />;
}

export default function AdminDashboardPage() {
  const [user, setUser]       = useState<{ nama: string; role: string; id: string } | null>(null);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [modalKind, setModalKind] = useState<ModalKind>(null);

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
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-44" />)}
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

  const { kegiatanHariIni, guruSudahAbsen, guruBelumAbsen, persen } = data.kehadiranHariIni;
  const chartData = data.weeklyKegiatan.map((d) => ({ hari: d.hari, date: d.date, hadir: d.guruHadir, total: d.kegiatan > 0 ? data.totalGuru : 0 }));

  return (
    <div className="space-y-5">

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GreetingHero nama={user.nama} role={user.role} />
      </motion.div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <AksesCepatCard
          icon={Users} label="Total Guru" value={data.totalGuru} tone="blue" delay={0.05}
          footerLeftLabel="Kegiatan" footerLeftValue={String(kegiatanHariIni)}
          footerRightLabel="Sudah Absen" footerRightValue={String(guruSudahAbsen)}
          onClick={() => setModalKind("total")}
        />
        <AksesCepatCard
          icon={Calendar} label="% Absen Hari Ini" value={persen} valueSuffix="%" tone="green" delay={0.10}
          footerLeftLabel="Sudah" footerLeftValue={String(guruSudahAbsen)}
          footerRightLabel="Belum" footerRightValue={String(guruBelumAbsen)}
          onClick={() => setModalKind("persen")}
        />
        <AksesCepatCard
          icon={Activity} label="Sudah Absen" value={guruSudahAbsen} tone="amber" delay={0.15}
          footerLeftLabel="Dari Total" footerLeftValue={String(data.totalGuru)}
          footerRightLabel="Kegiatan" footerRightValue={String(kegiatanHariIni)}
          onClick={() => setModalKind("sudah")}
        />
        <AksesCepatCard
          icon={UserX} label="Belum Absen" value={guruBelumAbsen} tone="red" delay={0.20}
          footerLeftLabel="Dari Total" footerLeftValue={String(data.totalGuru)}
          footerRightLabel="Persentase" footerRightValue={`${100 - persen}%`}
          onClick={() => setModalKind("belum")}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-5">

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="col-span-12 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-slate-800 xl:col-span-4"
        >
          <div className="mb-1 self-start">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">Kehadiran Hari Ini</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{kegiatanHariIni} kegiatan terjadwal</p>
          </div>
          <div className="relative flex h-40 w-40 items-center justify-center">
            <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90">
              <circle cx="50" cy="50" r="40" stroke="#FFF7E4" strokeWidth="12" fill="none" />
              <circle cx="50" cy="50" r="40" stroke={P} strokeWidth="12" fill="none" strokeLinecap="round"
                strokeDasharray={`${(persen / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`} />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{persen}%</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Absen</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-extrabold text-slate-800 dark:text-white">{kegiatanHariIni}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Kegiatan</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-x border-slate-100 dark:border-slate-700/50">
              <span className="text-lg font-extrabold" style={{ color: "#00C853" }}>{guruSudahAbsen}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Sudah Absen</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-extrabold" style={{ color: R }}>{guruBelumAbsen}</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Belum Absen</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="col-span-12 flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-slate-800 xl:col-span-8"
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Overview Kehadiran</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tren mingguan — guru absen vs total guru</p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-1.5 text-[11px] dark:border-slate-700/40">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: P }} />Absen
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#3B82F6" }} />Total Guru
              </span>
            </div>
          </div>
          {data.weeklyKegiatan.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
              Belum ada data mingguan
            </p>
          ) : (
            <KehadiranAreaChart data={chartData} />
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-slate-800"
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
                <span className="hidden text-[11px] font-semibold tabular-nums text-slate-400 sm:block">{g.kegiatanDiabsen}/{g.totalKegiatanHariIni}</span>
                <StatusBadge sudahAbsen={g.sudahAbsen} />
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>

      <AnimatePresence>
        {modalKind && (() => {
          const cfg = {
            total:  { icon: Users,          title: "Total Guru",         subtitle: `${data.totalGuru} guru terdaftar`,                    color: "#3B82F6", rows: data.statusGuru },
            persen: { icon: Calendar,       title: "% Absen Hari Ini",   subtitle: `${persen}% dari ${data.totalGuru} guru sudah absen`,   color: "#00C853", rows: data.statusGuru },
            sudah:  { icon: Activity,       title: "Sudah Absen",        subtitle: `${guruSudahAbsen} guru sudah absen hari ini`,          color: "#F59E0B", rows: data.statusGuru.filter((g) => g.sudahAbsen) },
            belum:  { icon: UserX,          title: "Belum Absen",        subtitle: `${guruBelumAbsen} guru belum absen hari ini`,          color: R,         rows: data.statusGuru.filter((g) => !g.sudahAbsen) },
          }[modalKind];
          return (
            <GuruListModal
              kind={modalKind}
              icon={cfg.icon}
              title={cfg.title}
              subtitle={cfg.subtitle}
              color={cfg.color}
              rows={cfg.rows}
              onClose={() => setModalKind(null)}
            />
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
