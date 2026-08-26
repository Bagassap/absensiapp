"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ClipboardList, CalendarClock, AlertCircle, CheckCircle, Download, Code2, ListChecks, PenLine, UserX, RotateCcw, ShieldAlert } from "lucide-react";
import type { TugasItem, TugasSubmisiItem } from "./types";
import { formatTgl, formatTglJam, statusInfo, LOCKDOWN_TIPE, MAKSIMAL_PERCOBAAN } from "./types";
import { TugasPraktikViewerModal } from "./TugasPraktikViewerModal";
import { TugasJawabanViewerModal } from "./TugasJawabanViewerModal";

type BelumSiswa = {
  id: string;
  nama: string | null;
  kelas: { id: string; nama: string } | null;
  user: { id: string; nama: string } | null;
};

export function SubmisiTugasModal({
  tugas, submisi, onClose, onTerima, onRevisi, onSimpanNilai, onResetPercobaan,
}: {
  tugas: TugasItem | null;
  submisi: TugasSubmisiItem[];
  onClose: () => void;
  onTerima: (id: string) => void;
  onRevisi: (s: TugasSubmisiItem) => void;
  onSimpanNilai: (submisiId: string, nilai: number) => Promise<void>;
  onResetPercobaan?: (submisiId: string) => Promise<void>;
}) {
  const [viewCodeTarget, setViewCodeTarget] = useState<TugasSubmisiItem | null>(null);
  const [viewJawabanTarget, setViewJawabanTarget] = useState<TugasSubmisiItem | null>(null);
  const [tab, setTab] = useState<"sudah" | "belum">("sudah");
  const [belumList, setBelumList] = useState<BelumSiswa[]>([]);
  const [belumLoading, setBelumLoading] = useState(false);
  const isPraktik = tugas?.tipe === "PRAKTIK";
  const isSoalBased = tugas?.tipe === "PILIHAN_GANDA" || tugas?.tipe === "ESSAY";
  const isLockdown = !!tugas && LOCKDOWN_TIPE.has(tugas.tipe);

  useEffect(() => {
    if (!tugas) return;
    setTab("sudah");
    setBelumLoading(true);
    fetch(`/api/tugas/${tugas.id}/belum-mengumpulkan`)
      .then((r) => r.json())
      .then((d) => setBelumList(Array.isArray(d) ? d : []))
      .catch(() => setBelumList([]))
      .finally(() => setBelumLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tugas?.id]);
  return (
    <>
    <AnimatePresence>
      {tugas && (() => {
        const rows = submisi.filter((s) => s.tugasId === tugas.id);
        const cntDiterima = rows.filter((s) => s.status === "DITERIMA").length;
        const cntRevisi = rows.filter((s) => s.status === "REVISI").length;
        const cntMenunggu = rows.filter((s) => s.status === "TERKIRIM").length;
        return (
          <motion.div key="submisi-tugas-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden">

              <div className="relative p-6 shrink-0" style={{ background: "#0082FB" }}>
                <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
                <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                  <X size={16} className="text-white" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <ClipboardList size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Rekap Pengumpulan</p>
                    <h3 className="text-lg font-extrabold text-white">{tugas.judul}</h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 text-xs font-semibold text-white">
                    {tugas.mapel}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 text-xs font-semibold text-white">
                    Kelas: {tugas.kelas?.nama ?? "Semua Kelas"}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-semibold text-white">
                    <CalendarClock size={10} /> Deadline {formatTgl(tugas.deadline)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-y-3 shrink-0 border-b border-slate-100 py-3 dark:border-slate-700 sm:grid-cols-5 sm:gap-y-0 sm:py-0">
                {[
                  { label: "Total", val: rows.length, color: "#0082FB" },
                  { label: "Diterima", val: cntDiterima, color: "#00D67F" },
                  { label: "Revisi", val: cntRevisi, color: "#C3F84A" },
                  { label: "Menunggu", val: cntMenunggu, color: "#0082FB" },
                  { label: "Belum Kumpul", val: belumLoading ? "…" : belumList.length, color: "#EF4444" },
                ].map((st, i) => (
                  <div key={i} className="p-2.5 text-center sm:border-r sm:border-slate-100 sm:p-4 sm:last:border-r-0 dark:sm:border-slate-700">
                    <p className="text-xl font-extrabold sm:text-2xl" style={{ color: st.color }}>{st.val}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 sm:text-[11px]">{st.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex shrink-0 gap-1 border-b border-slate-100 px-4 pt-3 dark:border-slate-700">
                <button onClick={() => setTab("sudah")}
                  className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold transition-colors ${
                    tab === "sudah" ? "bg-[#0082FB]/10 text-[#0082FB]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}>
                  <CheckCircle size={13} /> Sudah Mengumpulkan ({rows.length})
                </button>
                <button onClick={() => setTab("belum")}
                  className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2 text-xs font-bold transition-colors ${
                    tab === "belum" ? "bg-red-50 text-red-500 dark:bg-red-900/20" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}>
                  <UserX size={13} /> Belum Mengumpulkan ({belumLoading ? "…" : belumList.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/30">
                {tab === "belum" ? (
                  belumLoading ? (
                    <div className="py-16 text-center">
                      <p className="text-sm font-semibold text-slate-400">Memuat…</p>
                    </div>
                  ) : belumList.length === 0 ? (
                    <div className="py-16 text-center">
                      <CheckCircle size={36} className="mx-auto mb-3 text-emerald-200" />
                      <p className="text-sm font-semibold text-slate-400">Semua siswa sudah mengumpulkan tugas ini</p>
                    </div>
                  ) : belumList.map((s) => {
                    const nama = s.user?.nama || s.nama || "Siswa";
                    return (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-500 dark:bg-red-900/30">
                          {nama[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{nama}</p>
                          {s.kelas && <p className="text-xs text-slate-400">{s.kelas.nama}</p>}
                        </div>
                        <span className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-500 dark:bg-red-900/20">
                          Belum Kumpul
                        </span>
                      </div>
                    );
                  })
                ) : rows.length === 0 ? (
                  <div className="py-16 text-center">
                    <AlertCircle size={36} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-400">Belum ada siswa yang mengumpulkan</p>
                  </div>
                ) : rows.map((s) => {
                  const sc = statusInfo(s.status);
                  const nama = s.siswa?.user?.nama || s.siswa?.nama || "Siswa";
                  const isDone = s.status === "DITERIMA";
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: isDone ? "#00D67F" : sc.color }}>
                        {nama[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{nama}</p>
                        <p className="text-xs text-slate-400 truncate">{formatTglJam(s.submittedAt)}{s.catatan ? ` · ${s.catatan}` : ""}</p>
                      </div>
                      {(tugas.tipe === "PILIHAN_GANDA" || tugas.tipe === "ESSAY") && s.nilai !== null && (
                        <span className="shrink-0 rounded-lg bg-[#F1F5F8] px-2.5 py-1 text-[11px] font-bold text-[#1C2B33] dark:bg-[#1C2B33]/20 dark:text-[#C3F84A]">
                          Nilai {s.nilai}
                        </span>
                      )}
                      {isLockdown && !!s.jumlahPercobaan && (
                        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          s.terkunci ? "bg-red-50 text-red-500 dark:bg-red-900/20" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}>
                          Percobaan {s.jumlahPercobaan}/{MAKSIMAL_PERCOBAAN}
                        </span>
                      )}
                      {s.dipaksaKeluar && (
                        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-500 dark:bg-red-900/20">
                          <ShieldAlert size={11} /> Dipaksa Keluar
                        </span>
                      )}
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {isDone ? "✓ Diterima" : s.status === "REVISI" ? "⚠ Perlu Revisi" : "⏳ Menunggu Review"}
                      </span>
                      {isLockdown && !!s.jumlahPercobaan && onResetPercobaan && (
                        <button onClick={() => onResetPercobaan(s.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                          <RotateCcw size={12} /> Reset Percobaan
                        </button>
                      )}
                      {isPraktik ? (
                        <button onClick={() => setViewCodeTarget(s)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
                          style={{ color: "#0082FB", backgroundColor: "#EAF3FF" }}>
                          <Code2 size={12} /> Lihat Kode
                        </button>
                      ) : isSoalBased ? (
                        <button onClick={() => setViewJawabanTarget(s)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
                          style={{ color: "#0082FB", backgroundColor: "#EAF3FF" }}>
                          {tugas.tipe === "PILIHAN_GANDA" ? <ListChecks size={12} /> : <PenLine size={12} />} Lihat Jawaban
                        </button>
                      ) : s.fileUrl && (
                        <a href={s.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
                          style={{ color: "#0082FB", backgroundColor: "#EAF3FF" }}>
                          <Download size={12} /> File
                        </a>
                      )}
                      {isDone ? (
                        <span className="text-xs font-bold text-emerald-500 shrink-0">Selesai ✓</span>
                      ) : (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => onTerima(s.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white shadow-sm transition-transform hover:scale-105"
                            style={{ background: "#00D67F" }}>
                            <CheckCircle size={12} /> Terima
                          </button>
                          <button onClick={() => onRevisi(s)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-transform hover:scale-105"
                            style={{ background: "#C3F84A", color: "#1C2B33" }}>
                            <AlertCircle size={12} /> Revisi
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 shrink-0 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-[#C3F84A]">Revisi</span> → siswa kirim ulang ·{" "}
                  <span className="font-semibold text-emerald-500">Terima</span> → tugas selesai
                </p>
                <button onClick={onClose}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 shrink-0 transition-colors">
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>
    <TugasPraktikViewerModal
      open={!!viewCodeTarget}
      onClose={() => setViewCodeTarget(null)}
      title={(viewCodeTarget?.siswa?.user?.nama || viewCodeTarget?.siswa?.nama) ?? "Siswa"}
      subtitle={tugas?.judul}
      html={viewCodeTarget?.submittedHtml ?? ""}
      css={viewCodeTarget?.submittedCss ?? ""}
      js={viewCodeTarget?.submittedJs ?? ""}
    />
    <TugasJawabanViewerModal
      open={!!viewJawabanTarget}
      onClose={() => setViewJawabanTarget(null)}
      judul={(viewJawabanTarget?.siswa?.user?.nama || viewJawabanTarget?.siswa?.nama) ?? "Siswa"}
      tipe={tugas?.tipe ?? ""}
      jawaban={viewJawabanTarget?.jawaban ?? []}
      nilai={viewJawabanTarget?.nilai}
      canGrade
      onSaveNilai={async (nilai) => {
        if (!viewJawabanTarget) return;
        await onSimpanNilai(viewJawabanTarget.id, nilai);
        setViewJawabanTarget((prev) => (prev ? { ...prev, nilai, status: "DITERIMA", pesanRevisi: null } : prev));
      }}
    />
    </>
  );
}
