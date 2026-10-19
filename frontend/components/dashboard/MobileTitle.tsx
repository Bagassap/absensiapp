"use client";

import { usePathname } from "next/navigation";
import type { UserPayload } from "@/lib/auth";

const TITLES: Record<string, [string, string]> = {
  "absensi-harian": ["Absensi Kegiatan", "Presensi kehadiran per kegiatan"],
  "absensi-saya": ["Absensi Saya", "Catat kehadiran Anda hari ini"],
  "data-guru": ["Data Guru", "Kelola akun dan status guru"],
};

const HOME_KEY: Record<string, string> = { ADMIN: "dashboard", GURU: "absensi-harian" };

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  if (h < 5) return "Selamat Malam";
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function isMobileSubPage(pathname: string): boolean {
  return pathname.split("/").filter(Boolean).length > 2;
}

export function MobileTitle({ user }: { user: UserPayload }) {
  const pathname = usePathname();
  if (isMobileSubPage(pathname)) return null;

  const key = pathname.split("/").filter(Boolean)[1] ?? "";
  const isHome = key === HOME_KEY[user.role];
  const firstName = user.nama.trim().split(/\s+/)[0] ?? user.nama;
  const info = TITLES[key];

  return (
    <div className="px-4 pb-2 pt-3 lg:hidden">
      {isHome ? (
        <>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {greeting()}
          </h1>
          <p className="text-[28px] font-medium leading-tight tracking-tight text-slate-700 dark:text-slate-300">{firstName}</p>
          <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            {user.role === "ADMIN" ? "Ringkasan kehadiran guru hari ini" : "Catat kehadiran kegiatan Anda hari ini"}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            {info?.[0] ?? key}
          </h1>
          {info && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{info[1]}</p>}
        </>
      )}
    </div>
  );
}
