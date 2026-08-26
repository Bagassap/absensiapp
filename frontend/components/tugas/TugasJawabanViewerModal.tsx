"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ListChecks, PenLine, CheckCircle, XCircle, Save } from "lucide-react";
import type { TugasJawabanItem } from "./types";
import { nilaiPilihanGanda } from "./types";

export function TugasJawabanViewerModal({
  open, onClose, judul, tipe, jawaban, nilai, canGrade, onSaveNilai,
}: {
  open: boolean;
  onClose: () => void;
  judul: string;
  tipe: string;
  jawaban: TugasJawabanItem[];
  nilai?: number | null;
  canGrade?: boolean;
  onSaveNilai?: (nilai: number) => Promise<void>;
}) {
  const isPg = tipe === "PILIHAN_GANDA";
  const warna = isPg ? "#C3F84A" : "#0064E0";
  const sorted = [...jawaban].sort((a, b) => (a.soal?.urutan ?? 0) - (b.soal?.urutan ?? 0));
  const benar = sorted.filter((j) => j.soal?.jawabanBenar && j.jawabanPilihan === j.soal.jawabanBenar).length;
  const nilaiAkhir = isPg ? nilaiPilihanGanda({ nilai, jawaban: sorted }) : null;

  const [nilaiInput, setNilaiInput] = useState(nilai != null ? String(nilai) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNilaiInput(nilai != null ? String(nilai) : "");
  }, [open, nilai]);

  async function handleSaveNilai() {
    const parsed = Math.round(Number(nilaiInput));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return;
    setSaving(true);
    try {
      await onSaveNilai?.(parsed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="relative flex h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-6 py-4" style={{ background: warna, color: isPg ? "#1C2B33" : "#FFFFFF" }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: isPg ? "#1C2B331A" : "#FFFFFF1A" }} />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: isPg ? "#1C2B3326" : "#FFFFFF26" }}>
                {isPg ? <ListChecks size={18} /> : <PenLine size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold">{judul}</h2>
                <p className="text-xs" style={{ opacity: 0.75 }}>
                  {isPg ? `${benar}/${sorted.length} benar` : `${sorted.length} soal esai`}
                </p>
              </div>
              {isPg && nilaiAkhir !== null && (
                <div className="shrink-0 rounded-xl px-3 py-1.5 text-center" style={{ backgroundColor: "#1C2B3326" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ opacity: 0.65 }}>Nilai</p>
                  <p className="text-lg font-black leading-none">{nilaiAkhir}</p>
                </div>
              )}
              {!isPg && nilai != null && (
                <div className="shrink-0 rounded-xl bg-white/15 px-3 py-1.5 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Nilai</p>
                  <p className="text-lg font-black leading-none text-white">{nilai}</p>
                </div>
              )}
              <button onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-80"
                style={{ backgroundColor: isPg ? "#1C2B3326" : "#FFFFFF26" }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {sorted.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">Belum ada jawaban.</p>
              ) : (
                <div className="space-y-4">
                  {sorted.map((j, idx) => {
                    const soal = j.soal;
                    const isCorrect = isPg && !!soal?.jawabanBenar && j.jawabanPilihan === soal.jawabanBenar;
                    const isWrong = isPg && !!soal?.jawabanBenar && !!j.jawabanPilihan && j.jawabanPilihan !== soal.jawabanBenar;
                    return (
                      <div key={j.id} className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10" : isWrong ? "border-red-200 bg-red-50/50 dark:bg-red-900/10" : "border-slate-100 dark:border-slate-700"}`}>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{idx + 1}. {soal?.pertanyaan}</p>
                          {isPg && soal?.jawabanBenar && (
                            isCorrect ? <CheckCircle size={16} className="shrink-0 text-emerald-500" /> : <XCircle size={16} className="shrink-0 text-red-500" />
                          )}
                        </div>
                        {isPg ? (
                          <div className="space-y-1.5">
                            {(["A", "B", "C", "D"] as const).map((huruf) => {
                              const teks = soal?.[`pilihan${huruf}` as "pilihanA" | "pilihanB" | "pilihanC" | "pilihanD"];
                              if (!teks) return null;
                              const isSelected = j.jawabanPilihan === huruf;
                              const isKey = soal?.jawabanBenar === huruf;
                              return (
                                <div key={huruf}
                                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                                    isKey ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                                    : isSelected ? "border-red-300 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-100 dark:border-slate-700"
                                  }`}>
                                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    isKey ? "bg-emerald-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                                  }`}>{huruf}</span>
                                  <span className="text-slate-700 dark:text-slate-200">{teks}</span>
                                  {isSelected && <span className="ml-auto text-[10px] font-bold text-slate-400">Dipilih siswa</span>}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <p className="mb-1 text-[11px] font-bold text-slate-400">Jawaban Siswa</p>
                              <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
                                {j.jawabanEssay || <span className="text-slate-400">(belum dijawab)</span>}
                              </p>
                            </div>
                            {soal?.jawabanBenar && (
                              <div>
                                <p className="mb-1 text-[11px] font-bold text-emerald-500">Kunci Jawaban</p>
                                <p className="whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5 text-sm text-slate-700 dark:border-emerald-800 dark:bg-emerald-900/10 dark:text-slate-200">
                                  {soal.jawabanBenar}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!isPg && canGrade && (
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-700">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nilai (0–100)</label>
                <input type="number" min={0} max={100} step={1} value={nilaiInput}
                  onChange={(e) => setNilaiInput(e.target.value)}
                  placeholder="0-100"
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                <button onClick={handleSaveNilai} disabled={saving || nilaiInput === ""}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                  style={{ background: "#0082FB" }}>
                  <Save size={13} /> {saving ? "Menyimpan…" : "Simpan Nilai"}
                </button>
                {nilai != null && <span className="text-[11px] text-slate-400">Nilai tersimpan: {nilai}</span>}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
