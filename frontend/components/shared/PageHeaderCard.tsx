"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type Icon3DTone = "green" | "indigo" | "orange" | "rose" | "amber" | "blue";

const TONES: Record<Icon3DTone, { top: string; bottom: string; edge: string; glow: string }> = {
  green: { top: "#5BE595", bottom: "#00B84A", edge: "#007A33", glow: "0,200,83" },
  indigo: { top: "#A5A3FF", bottom: "#5B5CF0", edge: "#3A3BB0", glow: "91,92,240" },
  orange: { top: "#FFB877", bottom: "#FF6A1F", edge: "#B8440B", glow: "255,106,31" },
  rose: { top: "#FFA3B4", bottom: "#F0436A", edge: "#A52646", glow: "240,67,106" },
  amber: { top: "#FFE17A", bottom: "#FFB020", edge: "#B97A00", glow: "255,176,32" },
  blue: { top: "#8CC4FF", bottom: "#3B82F6", edge: "#1E54B7", glow: "59,130,246" },
};

export function Icon3D({ icon: Icon, tone = "green", size = 64 }: { icon: React.ElementType; tone?: Icon3DTone; size?: number }) {
  const t = TONES[tone];
  return (
    <motion.div
      initial={{ scale: 0, rotate: -18 }}
      animate={{ scale: 1, rotate: -6 }}
      whileHover={{ rotate: 0, y: -2 }}
      transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.05 }}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-[22px]"
        style={{
          background: `linear-gradient(160deg, ${t.top} 0%, ${t.bottom} 100%)`,
          boxShadow: `0 7px 0 ${t.edge}, 0 16px 24px -6px rgba(${t.glow},0.55), inset 0 2px 1px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.18)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-1.5 top-1 h-1/2 rounded-t-[18px] rounded-b-[40px]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon size={Math.round(size * 0.46)} strokeWidth={2.3} className="text-white" style={{ filter: "drop-shadow(0 3px 2px rgba(0,0,0,0.3))" }} />
      </div>
    </motion.div>
  );
}

export function PageHeaderCard({
  icon,
  tone = "green",
  eyebrow,
  title,
  description,
  badge,
  right,
  className = "",
}: {
  icon: LucideIcon;
  tone?: Icon3DTone;
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  badge?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 pb-6 shadow-[0_8px_30px_-14px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between md:px-6 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-5">
        <Icon3D icon={icon} tone={tone} />
        <div className="min-w-0">
          {eyebrow && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </motion.div>
  );
}
