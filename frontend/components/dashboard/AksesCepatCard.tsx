"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type CardTone = "green" | "success" | "red" | "blue" | "amber";

const TONE_HEX: Record<CardTone, string> = {
  green: "#00C853",
  success: "#00D67F",
  red: "#EF4444",
  blue: "#3B82F6",
  amber: "#F59E0B",
};

const TONE_FG: Record<CardTone, string> = {
  green: "#FFFFFF",
  success: "#FFFFFF",
  red: "#FFFFFF",
  blue: "#FFFFFF",
  amber: "#FFFFFF",
};

export interface AksesCepatCardProps {
  eyebrow?: string;
  label: string;
  value: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  icon: LucideIcon;
  tone: CardTone;
  footerLeftLabel?: string;
  footerLeftValue?: string;
  footerRightLabel?: string;
  footerRightValue?: string;
  delay?: number;
  onClick?: () => void;
}

export function AksesCepatCard({
  eyebrow = "Ringkasan",
  label,
  value,
  valuePrefix = "",
  valueSuffix = "",
  icon: Icon,
  tone,
  footerLeftLabel,
  footerLeftValue,
  footerRightLabel,
  footerRightValue,
  delay = 0,
  onClick,
}: AksesCepatCardProps) {
  const bg = TONE_HEX[tone];
  const fg = TONE_FG[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl p-3 sm:h-44 sm:p-5 ${onClick ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: bg, color: fg, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ backgroundColor: `${fg}1a` }} />
      <div className="pointer-events-none absolute -bottom-4 right-12 h-20 w-20 rounded-full" style={{ backgroundColor: `${fg}14` }} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="hidden text-[10px] font-medium uppercase tracking-widest sm:block" style={{ color: `${fg}B3` }}>{eyebrow}</p>
          <p className="text-xs font-bold sm:mt-0.5 sm:text-sm">{label}</p>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9" style={{ backgroundColor: `${fg}33` }}>
          <Icon size={14} className="sm:hidden" />
          <Icon size={17} className="hidden sm:block" />
        </div>
      </div>

      <div className="relative">
        <p className="text-xl font-bold tabular-nums sm:text-3xl">{valuePrefix}{value}{valueSuffix}</p>
      </div>

      {(footerLeftLabel || footerRightLabel) && (
        <div className="relative flex items-end justify-between">
          <div>
            {footerLeftLabel && (
              <>
                <p className="hidden text-[9px] font-medium uppercase tracking-wider sm:block" style={{ color: `${fg}99` }}>{footerLeftLabel}</p>
                <p className="text-[10px] font-semibold sm:text-[11px]">{footerLeftValue}</p>
              </>
            )}
          </div>
          <div className="text-right">
            {footerRightLabel && (
              <>
                <p className="hidden text-[9px] font-medium uppercase tracking-wider sm:block" style={{ color: `${fg}99` }}>{footerRightLabel}</p>
                <p className="text-[10px] font-semibold sm:text-[11px]">{footerRightValue}</p>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
