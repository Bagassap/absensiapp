"use client";

import { motion } from "framer-motion";

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: "Admin",  cls: "bg-white/20 text-white" },
  GURU:  { label: "Guru",   cls: "bg-white/20 text-white" },
  SISWA: { label: "Siswa",  cls: "bg-white/20 text-white" },
};

// Dibaca eksplisit sebagai jam WIB (Asia/Jakarta) via Intl, bukan getHours()
// lokal — komponen ini render duluan di server saat SSR, dan server
// berjalan di UTC, jadi getter lokal biasa akan salah beberapa jam.
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
  const firstName   = getFirstName(nama);
  const badge       = ROLE_BADGE[role] ?? ROLE_BADGE.SISWA;

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-7 md:px-8 md:py-8"
      style={{ background: "#0082FB" }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-14 right-28 h-52 w-52 rounded-full bg-white/6" />
      <div className="pointer-events-none absolute top-3 left-[45%] h-24 w-24 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.05 }}
              className="select-none text-2xl sm:text-3xl"
            >
              {emoji}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-wrap items-baseline gap-2"
            >
              <h1 className="text-lg font-extrabold leading-tight text-white sm:text-xl md:text-2xl">
                {text},{" "}
                <span className="text-white/90">{firstName}!</span>
              </h1>
              <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                {badge.label}
              </span>
              {kelas && (
                <span className="rounded-lg bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white/80">
                  {kelas}
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
