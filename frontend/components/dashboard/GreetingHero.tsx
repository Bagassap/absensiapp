"use client";

import { LayoutDashboard } from "lucide-react";
import { PageHeaderCard } from "@/components/shared/PageHeaderCard";

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: "Admin", cls: "bg-[#00C853]/12 text-[#00A844]" },
  GURU:  { label: "Guru",  cls: "bg-[#00C853]/12 text-[#00A844]" },
};

function jakartaHour(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
}

function getGreeting(): { emoji: string; text: string } {
  const h = jakartaHour();
  if (h < 5)  return { emoji: "🌙", text: "Selamat Malam" };
  if (h < 11) return { emoji: "☀️", text: "Selamat Pagi" };
  if (h < 15) return { emoji: "🌤️", text: "Selamat Siang" };
  if (h < 18) return { emoji: "🌅", text: "Selamat Sore" };
  return { emoji: "🌙", text: "Selamat Malam" };
}

function getFirstName(nama: string) {
  return nama.trim().split(/\s+/)[0] ?? nama;
}

export default function GreetingHero({
  nama,
  role,
  kelas,
}: {
  nama: string;
  role: string;
  kelas?: string;
}) {
  const { emoji, text } = getGreeting();
  const firstName = getFirstName(nama);
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.GURU;

  return (
    <PageHeaderCard
      icon={LayoutDashboard}
      tone="indigo"
      eyebrow={text}
      title={<>{firstName} <span className="select-none">{emoji}</span></>}
      description="Ringkasan kehadiran guru hari ini"
      badge={
        <>
          <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
          {kelas && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">{kelas}</span>
          )}
        </>
      }
    />
  );
}
