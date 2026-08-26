"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Users, School, BookOpen } from "lucide-react";
import { kelasShort } from "./shared";
import { reportCardFg } from "@/components/absensi-harian/shared";
import { DataSiswaExportButtons } from "./DataSiswaExportButtons";

type Scope = "semua" | "kelas" | "jurusan";

const SCOPE_CARDS: { key: Scope; label: string; caption: string; icon: React.ElementType; gradient: string }[] = [
  { key: "semua", label: "Semua Siswa", caption: "Seluruh data", icon: Users, gradient: "#0064E0" },
  { key: "kelas", label: "Kelas Ini", caption: "Kelas terpilih", icon: School, gradient: "#C3F84A" },
  { key: "jurusan", label: "Jurusan Ini", caption: "Satu jurusan", icon: BookOpen, gradient: "#EF4444" },
];

export function UnduhDataSiswaCard({
  kelasId, kelasNama, jurusan,
}: {
  kelasId?: string; kelasNama?: string; jurusan?: string;
}) {
  const [scope, setScope] = useState<Scope>("semua");

  // Kalau filter kelas/jurusan yang jadi acuan scope aktif dikosongkan dari
  // FilterBar, scope ini otomatis jatuh balik ke "semua" - mencegah tombol
  // ekspor diam-diam mengunduh berdasarkan cakupan yang sudah tidak ada.
  useEffect(() => {
    if (scope === "kelas" && !kelasId) setScope("semua");
    if (scope === "jurusan" && !jurusan) setScope("semua");
  }, [kelasId, jurusan, scope]);

  const caption =
    scope === "kelas" && kelasNama
      ? kelasShort(kelasNama)
      : scope === "jurusan" && jurusan
        ? jurusan
        : "Semua kelas";

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0082FB" }}>
          <FileText size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">Unduh Laporan</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Ekspor data siswa ke PDF/Excel</p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-3 content-center gap-3">
        {SCOPE_CARDS.map((opt) => {
          const disabled = (opt.key === "kelas" && !kelasId) || (opt.key === "jurusan" && !jurusan);
          const active = scope === opt.key;
          const fg = reportCardFg(opt.gradient);
          return (
            <button
              key={opt.key}
              type="button"
              disabled={disabled}
              onClick={() => setScope(opt.key)}
              title={disabled ? "Pilih kelas/jurusan di filter dahulu" : undefined}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-5 text-center shadow-sm transition-all disabled:cursor-not-allowed"
              style={{
                background: opt.gradient,
                color: fg,
                opacity: disabled ? 0.25 : active ? 1 : 0.55,
                outline: active ? `2px solid ${fg}` : "2px solid transparent",
                outlineOffset: active ? "2px" : "0",
              }}
            >
              <opt.icon size={20} />
              <span className="text-xs font-bold">{opt.label}</span>
              <span className="text-[10px] leading-tight" style={{ color: `${fg}BF` }}>{opt.caption}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-300">
        <School size={12} className="shrink-0 text-[#0082FB]" />
        {caption}
      </p>

      <div className="mt-3">
        <DataSiswaExportButtons
          kelasId={scope === "kelas" ? kelasId : undefined}
          kelasNama={scope === "kelas" ? kelasNama : undefined}
          jurusan={scope === "jurusan" ? jurusan : undefined}
        />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
        <Download size={11} className="shrink-0 text-[#0082FB]" />
        Pilih cakupan, lalu klik salah satu tombol ekspor
      </p>
    </div>
  );
}
