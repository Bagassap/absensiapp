"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const THEMES = [
  { icon: "#0082FB", iconBg: "#EAF3FF" },
  { icon: "#00D67F", iconBg: "#E3FBF0" },
  { icon: "#EF4444", iconBg: "#FEE9EA" },
  { icon: "#C3F84A", iconBg: "#F1F5F8" },
] as const;

function useCountUp(target: number, duration = 1200) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const ctrl = animate(mv, target, { duration: duration / 1000, ease: [0.16, 1, 0.3, 1] });
    return () => ctrl.stop();
  }, [mv, target, duration]);
  return rounded;
}

export interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  sub?: string;
  delay?: number;
  index?: number;
  from?: string;
  to?: string;
  compact?: boolean;
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  sub,
  delay = 0,
  index = 0,
}: StatsCardProps) {
  const count = useCountUp(value);
  const theme = THEMES[index % THEMES.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.10)" }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] cursor-default"
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: theme.iconBg }}
      >
        <Icon size={26} style={{ color: theme.icon }} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1">
          <motion.span className="text-3xl font-bold text-slate-800 tabular-nums dark:text-white">
            {count}
          </motion.span>
          {suffix && <span className="text-base font-semibold text-slate-400">{suffix}</span>}
        </div>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {sub && <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </motion.div>
  );
}
