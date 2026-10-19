"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, Loader2, Eye, EyeOff, Dices, Check } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import type { GuruRow } from "./DataGuruTable";

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 transition-all focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function ResetPasswordModal({ guru, onClose, onSaved }: { guru: GuruRow; onClose: () => void; onSaved?: () => void }) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [show, setShow] = useState(true);
  const [bypassIdentity, setBypassIdentity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${guru.id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, bypassIdentityVerification: bypassIdentity }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal mereset password");
      toast.success("Password direset", `Sampaikan password baru ini ke ${guru.nama} secara langsung/pribadi`);
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mereset password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={saving ? undefined : onClose}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm max-lg:items-end max-lg:p-0">
        <motion.div initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800 max-lg:max-h-[90dvh] max-lg:max-w-none max-lg:overflow-y-auto max-lg:rounded-b-none max-lg:rounded-t-[32px] max-lg:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-lg:before:mx-auto max-lg:before:mb-1 max-lg:before:mt-3 max-lg:before:block max-lg:before:h-1.5 max-lg:before:w-10 max-lg:before:shrink-0 max-lg:before:rounded-full max-lg:before:bg-slate-300 max-lg:before:content-['']">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#EF4444" }}>
                <KeyRound size={16} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Reset Password</h2>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">{guru.nama}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} disabled={saving}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700">
              <X size={16} />
            </button>
          </div>

          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            Guru ini akan diminta ganti password sendiri saat login berikutnya. Sampaikan password baru di bawah ini secara langsung — jangan lewat pesan yang bisa dibaca orang lain.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className={LABEL}>Password Baru</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input type={show ? "text" : "password"} required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter"
                    className={`${INPUT} pr-10`} autoFocus />
                  <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button type="button" onClick={() => setNewPassword(generatePassword())} title="Buat password acak"
                  className="flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50">
                  <Dices size={16} />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <input type="checkbox" checked={bypassIdentity} onChange={(e) => setBypassIdentity(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]" />
              Lewati verifikasi nama saat guru ganti password (dipakai kalau data nama di sistem tidak akurat)
            </label>

            {error && <p className="text-xs font-medium text-red-500">{error}</p>}

            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={saving}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300">
                Batal
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                style={{ backgroundColor: "#EF4444" }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Reset Password
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
