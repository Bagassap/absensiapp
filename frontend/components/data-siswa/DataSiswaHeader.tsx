"use client";

import { Users } from "lucide-react";

export type HeaderStat = { icon: React.ComponentType<{ size?: number; className?: string }>; label: string };

export function DataSiswaHeader({ title, eyebrow = "Data Siswa" }: { title: string; eyebrow?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6"
      style={{ background: "#0082FB" }}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
          <Users size={22} className="text-white sm:hidden" />
          <Users size={26} className="hidden text-white sm:block" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{eyebrow}</span>
          <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">{title}</h1>
        </div>
      </div>
    </div>
  );
}
