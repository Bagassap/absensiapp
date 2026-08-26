"use client";

import { useEffect, useState } from "react";
import { Briefcase, MapPin, Phone, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, toTitleCase } from "@/components/data-siswa/shared";
import { STATUS_PENEMPATAN_CFG } from "@/components/magang/types";
import type { PenempatanMagang } from "@/components/magang/types";

function fmtTgl(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export default function GuruMagangPenempatanPage() {
  const [list, setList] = useState<PenempatanMagang[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/magang/penempatan/bimbingan", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 p-1">
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: "#0082FB" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
            <Briefcase size={22} className="text-white sm:hidden" />
            <Briefcase size={26} className="hidden text-white sm:block" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">PKL</span>
            <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Siswa Bimbingan PKL</h1>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
              <Users size={24} className="text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Belum ada siswa bimbingan PKL</p>
            <p className="max-w-sm text-xs text-slate-400">Admin akan menetapkan Anda sebagai pembimbing saat menempatkan siswa ke tempat magang.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {list.map((p) => {
              const nama = toTitleCase(p.siswa.nama ?? p.siswa.user?.nama ?? "—");
              const cfg = STATUS_PENEMPATAN_CFG[p.status];
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Avatar src={p.siswa.user?.fotoProfil} nama={nama} sizePx={38} fallbackBg={avatarColorFor(nama)} textClassName="text-xs font-extrabold" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{nama}</p>
                      <span className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: cfg.bg, color: cfg.clr }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-400">{p.siswa.nis} · {p.siswa.kelas.nama}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      <MapPin size={11} className="shrink-0 text-[#0082FB]" /> {p.tempatMagang.namaTempat}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{p.tempatMagang.alamat}</p>
                  </div>
                  {p.tempatMagang.kontak && (
                    <p className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                      <Phone size={11} /> {p.tempatMagang.kontak}
                    </p>
                  )}
                  <p className="w-40 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                    {fmtTgl(p.tanggalMulai)}
                    {p.tanggalSelesai ? ` – ${fmtTgl(p.tanggalSelesai)}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
