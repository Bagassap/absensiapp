"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all focus:border-[#00C853] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

export function AddGuruModal({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [nama, setNama] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [nip, setNip] = useState("");
  const [noWa, setNoWa] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !loginId.trim() || password.trim().length < 4) {
      toast.error("Data belum lengkap", "Nama, NPY, dan password (minimal 4 karakter) wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "GURU",
          nama: nama.trim(),
          loginId: loginId.trim(),
          password: password.trim(),
          nip: nip.trim() || undefined,
          noWa: noWa.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menambah guru");
      toast.success("Guru berhasil ditambahkan", data?.message ?? "");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Gagal menambah guru", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
                <UserPlus size={18} className="text-white" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tambah Guru</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Buat akun guru baru</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className={LABEL}>Nama</label>
              <input type="text" required value={nama} onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Abdul Kasda, M.Pd" className={INPUT} />
            </div>

            <div>
              <label className={LABEL}>NPY (Login ID)</label>
              <input type="text" required value={loginId} onChange={(e) => setLoginId(e.target.value)}
                placeholder="Contoh: 15072013035" className={INPUT} />
            </div>

            <div>
              <label className={LABEL}>Password Awal</label>
              <input type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 4 karakter" className={INPUT} />
              <p className="mt-1 text-[11px] text-slate-400">Guru akan diminta mengganti password ini saat login pertama kali.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={LABEL}>NIP</label>
                <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>No. WA</label>
                <input type="text" value={noWa} onChange={(e) => setNoWa(e.target.value)} placeholder="Opsional" className={INPUT} />
              </div>
            </div>

            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                Batal
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                style={{ backgroundColor: "#00C853" }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Menyimpan..." : "Tambah Guru"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
