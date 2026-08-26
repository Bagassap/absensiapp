"use client";

import { motion } from "framer-motion";
import type { ComponentType } from "react";

type Tone = "blue" | "navy" | "green" | "lime" | "red" | "ink";

// Sama persis dengan desain kartu "Akses Cepat" di dashboard (lihat CARDS di
// app/admin/dashboard/page.tsx) — kartu wallet h-44 dengan dekorasi lingkaran
// blur, badge ikon di kanan atas, angka besar di tengah, dan baris footer
// dua kolom. Hanya 5 warna utama palet (+ tinta netral #1C2B33) — solid,
// tidak ada gradient.
const TONE_HEX: Record<Tone, string> = {
  blue: "#0082FB",   // biru terang
  navy: "#0064E0",   // blue
  green: "#00D67F",
  lime: "#C3F84A",   // utama
  red: "#EF4444",
  ink: "#1C2B33",
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
};

export function GradientStatCard({
  eyebrow = "Statistik", label, value, valuePrefix = "", valueSuffix = "",
  icon: Icon, tone,
  footerLeftLabel, footerLeftValue, footerRightLabel, footerRightValue,
}: {
  eyebrow?: string;
  label: string;
  value: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone: Tone;
  footerLeftLabel?: string; footerLeftValue?: string;
  footerRightLabel?: string; footerRightValue?: string;
}) {
  const fg = tone === "lime" ? "#1C2B33" : "#FFFFFF";

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.35 }}
      className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl p-5"
      style={{ background: TONE_HEX[tone], color: fg, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ backgroundColor: `${fg}1a` }} />
      <div className="pointer-events-none absolute -bottom-4 right-12 h-20 w-20 rounded-full" style={{ backgroundColor: `${fg}14` }} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: `${fg}B3` }}>{eyebrow}</p>
          <p className="mt-0.5 text-sm font-bold">{label}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${fg}33` }}>
          <Icon size={17} />
        </div>
      </div>

      <div className="relative">
        <p className="text-3xl font-bold tabular-nums">{valuePrefix}{value}{valueSuffix}</p>
      </div>

      {(footerLeftLabel || footerRightLabel) && (
        <div className="relative flex items-end justify-between">
          <div>
            {footerLeftLabel && (
              <>
                <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: `${fg}99` }}>{footerLeftLabel}</p>
                <p className="text-[11px] font-semibold">{footerLeftValue}</p>
              </>
            )}
          </div>
          <div className="text-right">
            {footerRightLabel && (
              <>
                <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: `${fg}99` }}>{footerRightLabel}</p>
                <p className="text-[11px] font-semibold">{footerRightValue}</p>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
