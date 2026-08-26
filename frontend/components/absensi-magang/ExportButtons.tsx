"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FileSpreadsheet, Loader2, X, Search, User } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { avatarColor } from "@/components/absensi-harian/shared";
import { Avatar } from "@/components/shared/Avatar";
import type { ExportRange } from "@/components/absensi-harian/shared";
import {
  downloadAbsensiMagangPdf, downloadAbsensiMagangPdfSiswa, downloadAbsensiMagangExcel, downloadAbsensiMagangExcelSiswa,
} from "./downloadAbsensiMagang";
import type { SiswaAbsensi } from "./types";

type ExportKind = "pdf-tempat" | "pdf-siswa" | "excel-tempat" | "excel-siswa";

function SiswaPickerModal({ siswaList, title, accent, onPick, onClose }: {
  siswaList: SiswaAbsensi[]; title: string; accent: string;
  onPick: (s: SiswaAbsensi) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return siswaList;
    return siswaList.filter(
      (s) => s.nama.toLowerCase().includes(query) || (s.nis ?? "").toLowerCase().includes(query),
    );
  }, [q, siswaList]);

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="relative z-10 flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}20` }}>
              <User size={16} style={{ color: accent }} />
            </div>
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-700/50">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIS..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-xs font-semibold text-slate-400">Tidak ada siswa ditemukan</p>
          ) : (
            filtered.map((s) => (
              <button key={s.siswaId} onClick={() => onPick(s)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                <Avatar
                  src={s.fotoProfil}
                  nama={s.nama}
                  sizePx={36}
                  fallbackBg={avatarColor(s.nama)}
                  textClassName="text-xs font-bold"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{s.nama}</p>
                  <p className="text-[11px] text-slate-400">NIS: {s.nis ?? "-"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function ExportButtons({ tempatMagangId, tempatNama, range, siswaList }: {
  tempatMagangId: string; tempatNama: string; range: ExportRange; siswaList: SiswaAbsensi[];
}) {
  const toast = useToast();
  const [loadingKind, setLoadingKind] = useState<ExportKind | null>(null);
  const [picker, setPicker] = useState<"pdf" | "excel" | null>(null);

  const disabled = !tempatMagangId || siswaList.length === 0;

  async function runTempatExport(kind: "pdf-tempat" | "excel-tempat") {
    if (disabled || loadingKind) return;
    setLoadingKind(kind);
    try {
      const result = kind === "pdf-tempat"
        ? await downloadAbsensiMagangPdf({ tempatMagangId, range, tempatNama })
        : await downloadAbsensiMagangExcel({ tempatMagangId, range, tempatNama });
      if (!result.ok) toast.error(kind === "pdf-tempat" ? "Gagal membuat PDF" : "Gagal membuat Excel", result.message);
    } finally {
      setLoadingKind(null);
    }
  }

  async function runSiswaExport(kind: "pdf-siswa" | "excel-siswa", s: SiswaAbsensi) {
    setPicker(null);
    setLoadingKind(kind);
    try {
      const result = kind === "pdf-siswa"
        ? await downloadAbsensiMagangPdfSiswa({ siswaId: s.siswaId, range, siswaNama: s.nama })
        : await downloadAbsensiMagangExcelSiswa({ siswaId: s.siswaId, range, siswaNama: s.nama });
      if (!result.ok) toast.error(kind === "pdf-siswa" ? "Gagal membuat PDF" : "Gagal membuat Excel", result.message);
    } finally {
      setLoadingKind(null);
    }
  }

  const PDF_STYLE = { backgroundColor: "#FEE9EA", color: "#EF4444", borderColor: "#EF444430" };
  const EXCEL_STYLE = { backgroundColor: "#E3FBF0", color: "#00D67F", borderColor: "#00D67F30" };

  return (
    <>
      <div className="flex flex-nowrap items-center gap-1.5">
        <button type="button" onClick={() => runTempatExport("pdf-tempat")} disabled={disabled || !!loadingKind} title="PDF Per Tempat"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={PDF_STYLE}>
          {loadingKind === "pdf-tempat" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileText size={12} className="shrink-0" />}
          <span className="truncate">PDF Tempat</span>
        </button>
        <button type="button" onClick={() => setPicker("pdf")} disabled={disabled || !!loadingKind} title="PDF Per Siswa"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={PDF_STYLE}>
          {loadingKind === "pdf-siswa" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileText size={12} className="shrink-0" />}
          <span className="truncate">PDF Siswa</span>
        </button>
        <button type="button" onClick={() => runTempatExport("excel-tempat")} disabled={disabled || !!loadingKind} title="Excel Per Tempat"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={EXCEL_STYLE}>
          {loadingKind === "excel-tempat" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileSpreadsheet size={12} className="shrink-0" />}
          <span className="truncate">Excel Tempat</span>
        </button>
        <button type="button" onClick={() => setPicker("excel")} disabled={disabled || !!loadingKind} title="Excel Per Siswa"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={EXCEL_STYLE}>
          {loadingKind === "excel-siswa" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileSpreadsheet size={12} className="shrink-0" />}
          <span className="truncate">Excel Siswa</span>
        </button>
      </div>

      <AnimatePresence>
        {picker && (
          <SiswaPickerModal
            siswaList={siswaList}
            title={picker === "pdf" ? "Pilih Siswa — Export PDF" : "Pilih Siswa — Export Excel"}
            accent={picker === "pdf" ? "#EF4444" : "#00D67F"}
            onPick={(s) => runSiswaExport(picker === "pdf" ? "pdf-siswa" : "excel-siswa", s)}
            onClose={() => setPicker(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
