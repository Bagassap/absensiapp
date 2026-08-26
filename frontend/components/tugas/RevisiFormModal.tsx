"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type { TugasSubmisiItem } from "./types";

export function RevisiFormModal({
  target, onClose, onSend,
}: {
  target: TugasSubmisiItem | null;
  onClose: () => void;
  onSend: (id: string, pesan: string) => Promise<void>;
}) {
  const [pesan, setPesan] = useState("");
  const [sending, setSending] = useState(false);
  const nama = target?.siswa?.user?.nama || target?.siswa?.nama || "Siswa";

  async function submit() {
    if (!target || !pesan.trim()) return;
    setSending(true);
    await onSend(target.id, pesan.trim());
    setSending(false);
    setPesan("");
  }

  return (
    <AnimatePresence>
      {target && (
        <motion.div key="revisi-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { onClose(); setPesan(""); } }}>
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            <div className="relative px-6 py-5 overflow-hidden" style={{ background: "#C3F84A", color: "#1C2B33" }}>
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#1C2B33]/10 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1C2B33]/15 flex items-center justify-center shrink-0">
                  <AlertCircle size={18} className="text-[#1C2B33]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#1C2B33]/70 uppercase">Kirim Revisi</p>
                  <h3 className="text-base font-extrabold text-[#1C2B33] leading-snug">{nama}</h3>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#F1F5F8] dark:bg-[#C3F84A]/10 border border-[#F1F5F8] dark:border-[#C3F84A]/20">
                <AlertCircle size={15} className="text-[#C3F84A] mt-0.5 shrink-0" />
                <p className="text-xs text-[#1C2B33] dark:text-[#C3F84A] leading-relaxed">
                  Siswa akan menerima notifikasi revisi dan <strong>wajib mengirim ulang</strong> tugas mereka.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                  Pesan Revisi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={pesan}
                  onChange={(e) => setPesan(e.target.value)}
                  rows={4}
                  placeholder="Tuliskan catatan revisi untuk siswa…"
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-[#C3F84A] placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { onClose(); setPesan(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Batal
              </button>
              <button onClick={submit} disabled={!pesan.trim() || sending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:brightness-110"
                style={{ background: "#C3F84A", color: "#1C2B33" }}>
                <span className="flex items-center justify-center gap-2">
                  <AlertCircle size={14} /> {sending ? "Mengirim…" : "Kirim Revisi"}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
