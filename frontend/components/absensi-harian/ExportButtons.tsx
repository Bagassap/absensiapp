"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, FileSpreadsheet, Loader2, X, Search, User } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { avatarColor, formatTgl, MONTH_NAMES } from "./shared";
import { Avatar } from "@/components/shared/Avatar";
import type { ExportRange, ExportRangeMode } from "./shared";
import type { UseExportRangeResult } from "./useExportRange";
import {
  downloadAbsensiPdf, downloadAbsensiPdfGuru, downloadAbsensiExcel, downloadAbsensiExcelGuru,
} from "./downloadAbsensiPdf";

type GuruBasic = { guruId: string; nama: string; nip: string | null; fotoProfil: string | null };

const RANGE_MODES: { key: ExportRangeMode; label: string }[] = [
  { key: "harian", label: "Per Hari" },
  { key: "mingguan", label: "Per Minggu" },
  { key: "bulanan", label: "Per Bulan" },
];

const selectCls = "rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00C853]";

export function RangeModeToggle({ rangeMode, setRangeMode, weekAnchor, setWeekAnchor, bulan, setBulan, tahun, setTahun, weekRange }: UseExportRangeResult) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="inline-flex shrink-0 gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">
        {RANGE_MODES.map((m) => (
          <button key={m.key} type="button" onClick={() => setRangeMode(m.key)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
              rangeMode === m.key
                ? "bg-[#00C853] text-white shadow-sm"
                : "text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {rangeMode === "mingguan" && (
        <input type="date" value={weekAnchor} onChange={(e) => setWeekAnchor(e.target.value)} className={selectCls}
          title={`Minggu: ${formatTgl(weekRange.start)} – ${formatTgl(weekRange.end)}`} />
      )}

      {rangeMode === "bulanan" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className={selectCls}>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className={selectCls}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

type ExportKind = "pdf-semua" | "pdf-guru" | "excel-semua" | "excel-guru";

function GuruPickerModal({ guruList, title, accent, onPick, onClose }: {
  guruList: GuruBasic[]; title: string; accent: string;
  onPick: (g: GuruBasic) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return guruList;
    return guruList.filter(
      (g) => g.nama.toLowerCase().includes(query) || (g.nip ?? "").toLowerCase().includes(query),
    );
  }, [q, guruList]);

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
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau NIP..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-xs font-semibold text-slate-400">Tidak ada guru ditemukan</p>
          ) : (
            filtered.map((g) => (
              <button key={g.guruId} onClick={() => onPick(g)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                <Avatar
                  src={g.fotoProfil}
                  nama={g.nama}
                  sizePx={36}
                  fallbackBg={avatarColor(g.nama)}
                  textClassName="text-xs font-bold"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{g.nama}</p>
                  <p className="text-[11px] text-slate-400">NIP: {g.nip ?? "-"}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function ExportButtons({ range, guruList }: {
  range: ExportRange; guruList: GuruBasic[];
}) {
  const toast = useToast();
  const [loadingKind, setLoadingKind] = useState<ExportKind | null>(null);
  const [picker, setPicker] = useState<"pdf" | "excel" | null>(null);

  const disabled = guruList.length === 0;

  async function runSemuaExport(kind: "pdf-semua" | "excel-semua") {
    if (disabled || loadingKind) return;
    setLoadingKind(kind);
    try {
      const result = kind === "pdf-semua"
        ? await downloadAbsensiPdf({ range })
        : await downloadAbsensiExcel({ range });
      if (!result.ok) toast.error(kind === "pdf-semua" ? "Gagal membuat PDF" : "Gagal membuat Excel", result.message);
    } finally {
      setLoadingKind(null);
    }
  }

  async function runGuruExport(kind: "pdf-guru" | "excel-guru", g: GuruBasic) {
    setPicker(null);
    setLoadingKind(kind);
    try {
      const result = kind === "pdf-guru"
        ? await downloadAbsensiPdfGuru({ guruId: g.guruId, range, guruNama: g.nama })
        : await downloadAbsensiExcelGuru({ guruId: g.guruId, range, guruNama: g.nama });
      if (!result.ok) toast.error(kind === "pdf-guru" ? "Gagal membuat PDF" : "Gagal membuat Excel", result.message);
    } finally {
      setLoadingKind(null);
    }
  }

  const PDF_STYLE = { backgroundColor: "#FEE9EA", color: "#EF4444", borderColor: "#EF444430" };
  const EXCEL_STYLE = { backgroundColor: "#E3FBF0", color: "#00D67F", borderColor: "#00D67F30" };

  return (
    <>
      <div className="flex flex-nowrap items-center gap-1.5">
        <button type="button" onClick={() => runSemuaExport("pdf-semua")} disabled={disabled || !!loadingKind} title="PDF Semua Guru"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={PDF_STYLE}>
          {loadingKind === "pdf-semua" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileText size={12} className="shrink-0" />}
          <span className="truncate">PDF Semua</span>
        </button>
        <button type="button" onClick={() => setPicker("pdf")} disabled={disabled || !!loadingKind} title="PDF Per Guru"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={PDF_STYLE}>
          {loadingKind === "pdf-guru" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileText size={12} className="shrink-0" />}
          <span className="truncate">PDF Guru</span>
        </button>
        <button type="button" onClick={() => runSemuaExport("excel-semua")} disabled={disabled || !!loadingKind} title="Excel Semua Guru"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={EXCEL_STYLE}>
          {loadingKind === "excel-semua" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileSpreadsheet size={12} className="shrink-0" />}
          <span className="truncate">Excel Semua</span>
        </button>
        <button type="button" onClick={() => setPicker("excel")} disabled={disabled || !!loadingKind} title="Excel Per Guru"
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={EXCEL_STYLE}>
          {loadingKind === "excel-guru" ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <FileSpreadsheet size={12} className="shrink-0" />}
          <span className="truncate">Excel Guru</span>
        </button>
      </div>

      <AnimatePresence>
        {picker && (
          <GuruPickerModal
            guruList={guruList}
            title={picker === "pdf" ? "Pilih Guru — Export PDF" : "Pilih Guru — Export Excel"}
            accent={picker === "pdf" ? "#EF4444" : "#00D67F"}
            onPick={(g) => runGuruExport(picker === "pdf" ? "pdf-guru" : "excel-guru", g)}
            onClose={() => setPicker(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
