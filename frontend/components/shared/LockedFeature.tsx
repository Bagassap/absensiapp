"use client";

import { motion } from "framer-motion";
import {
  Briefcase, FileText as FileTextIcon, Lock, MapPin, CalendarCheck, BarChart3,
  FileText, Clock, Sparkles, Trophy,
} from "lucide-react";

type FeatureType = "magang" | "ujian-ukk";

const BRAND_GRADIENT = "#0082FB";

const CONFIG: Record<FeatureType, {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  features: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }[];
  subtitle: (isGuru: boolean) => string;
  info: (isGuru: boolean) => string;
  footerHint: (isGuru: boolean) => string;
}> = {
  magang: {
    icon: Briefcase,
    title: "PKL",
    features: [
      { icon: MapPin,        label: "Penempatan" },
      { icon: CalendarCheck, label: "Absensi" },
      { icon: BarChart3,     label: "Monitoring" },
      { icon: FileText,      label: "Rekap" },
    ],
    subtitle: (isGuru) => isGuru
      ? "Menu ini akan aktif ketika program PKL siswa resmi dimulai"
      : "Menu ini akan aktif ketika jadwal PKL kamu telah dimulai",
    info: (isGuru) => isGuru
      ? "Semua fitur pemantauan, absensi, dan rekap siswa akan tersedia setelah program PKL resmi dibuka oleh admin."
      : "Fitur penempatan, absensi harian, monitoring progres, dan rekap laporan akan terbuka setelah PKL kamu resmi dimulai.",
    footerHint: (isGuru) => `Pantau pengumuman dari ${isGuru ? "koordinator PKL" : "pembimbing PKL"} Anda`,
  },
  "ujian-ukk": {
    icon: FileTextIcon,
    title: "UKK",
    features: [
      { icon: CalendarCheck, label: "Jadwal" },
      { icon: FileText,      label: "Absensi" },
      { icon: Trophy,        label: "Nilai" },
      { icon: BarChart3,     label: "Progres" },
    ],
    subtitle: () => "Menu ini akan aktif ketika jadwal UKK kamu telah dimulai",
    info: () => "Fitur jadwal & soal, absensi ujian, dan nilai akan terbuka setelah periode UKK resmi dibuka oleh admin.",
    footerHint: () => "Pantau pengumuman dari panitia UKK",
  },
};

interface Props { role?: "guru" | "siswa"; type?: FeatureType; }

export default function LockedFeature({ role = "siswa", type = "magang" }: Props) {
  const isGuru = role === "guru";
  const cfg = CONFIG[type];

  return (
    <div className="w-full flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="relative overflow-hidden rounded-3xl shadow-xl">
          <div className="absolute inset-0" style={{ background: BRAND_GRADIENT }} />
          <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/6" />
          <div className="pointer-events-none absolute top-10 left-[55%] h-20 w-20 rounded-full bg-white/5" />

          <div className="relative flex flex-col items-center gap-5 px-7 py-10 text-center sm:px-9">

            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-white/20"
              />
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm"
              >
                <cfg.icon size={24} className="text-white" strokeWidth={1.8} />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 backdrop-blur-sm"
            >
              <Lock size={10} className="text-white/90" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Belum Aktif</span>
            </motion.div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                Program {cfg.title}
              </h1>
              <p className="text-sm text-white/70">{cfg.subtitle(isGuru)}</p>
            </div>

            <div className="grid w-full grid-cols-4 gap-2">
              {cfg.features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 px-2 py-3 backdrop-blur-sm"
                >
                  <f.icon size={16} className="text-white/85" />
                  <p className="text-[10px] font-semibold text-white/80">{f.label}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex items-start gap-2.5 rounded-xl bg-white/10 px-4 py-3.5 text-left backdrop-blur-sm"
            >
              <Clock size={14} className="mt-0.5 shrink-0 text-white/80" />
              <p className="text-xs leading-relaxed text-white/80">{cfg.info(isGuru)}</p>
            </motion.div>

            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="flex items-center gap-2"
            >
              <Sparkles size={12} className="text-white/70" />
              <span className="text-xs text-white/70">{cfg.footerHint(isGuru)}</span>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
