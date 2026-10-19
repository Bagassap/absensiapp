"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export type GradientTone = "indigo" | "orange" | "amber" | "green" | "rose";

const GRADIENTS: Record<GradientTone, [string, string]> = {
  indigo: ["#8E8CFF", "#5B5CF0"],
  orange: ["#FFA24D", "#FF6A1F"],
  amber: ["#FFD24D", "#FFB020"],
  green: ["#3DDC84", "#00A844"],
  rose: ["#FF8DA1", "#F0436A"],
};

export type GradientStat = {
  key: string;
  label: string;
  value: number | string;
  suffix?: string;
  caption?: string;
  tone: GradientTone;
  onClick?: () => void;
};

export function GradientStatScroller({ items }: { items: GradientStat[] }) {
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-6 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((it, i) => {
        const [from, to] = GRADIENTS[it.tone];
        return (
          <motion.div
            key={it.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.06 }}
            whileTap={it.onClick ? { scale: 0.97 } : undefined}
            onClick={it.onClick}
            role={it.onClick ? "button" : undefined}
            className="relative h-36 w-[8.5rem] shrink-0 snap-start overflow-hidden rounded-[28px] p-4 text-white"
            style={{
              background: `linear-gradient(150deg, ${from}, ${to})`,
              boxShadow: `0 16px 28px -12px ${to}b3`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/75">{it.label}</span>
              <span className="text-xs font-bold tracking-widest text-white/80">••</span>
            </div>
            <p className="mt-3 text-[34px] font-semibold leading-none tabular-nums">
              {it.value}
              {it.suffix && <span className="text-2xl">{it.suffix}</span>}
            </p>
            {it.caption && <p className="mt-1.5 text-[11px] font-medium text-white/80">{it.caption}</p>}
          </motion.div>
        );
      })}
    </div>
  );
}

export function SectionHeading({ title, action, onAction, href }: { title: string; action?: string; onAction?: () => void; href?: string }) {
  const actionCls = "text-sm font-medium text-slate-400";
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      {action && href && (
        <Link href={href} className={actionCls}>{action}</Link>
      )}
      {action && !href && (
        <button type="button" onClick={onAction} className={actionCls}>{action}</button>
      )}
    </div>
  );
}
