"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { KeyRound, Loader2, X, Eye, EyeOff, Check } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 transition-all focus:border-[#00C853] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

function PasswordField({
  label, value, onChange, show, onToggleShow, placeholder, autoFocus,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggleShow: () => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="relative">
        <input type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus} className={`${INPUT} pr-10`} />
        <button type="button" onClick={onToggleShow} tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

export function GantiPasswordModal({ onClose, gradient }: { onClose: () => void; gradient: string }) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Password baru tidak boleh sama dengan password lama");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Gagal mengubah password");
        return;
      }
      toast.success("Password berhasil diubah", "Gunakan password baru saat login berikutnya");
      onClose();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-110 flex items-center justify-center p-4 max-lg:items-end max-lg:p-0"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={saving ? undefined : onClose} />
        <motion.div
          className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 max-lg:max-w-none max-lg:rounded-b-none max-lg:rounded-t-[32px] max-lg:max-h-[90dvh] max-lg:pb-[env(safe-area-inset-bottom)] max-lg:before:mx-auto max-lg:before:mb-1 max-lg:before:mt-3 max-lg:before:block max-lg:before:h-1.5 max-lg:before:w-10 max-lg:before:shrink-0 max-lg:before:rounded-full max-lg:before:bg-slate-300 max-lg:before:content-['']"
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 48 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ background: gradient }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                <KeyRound size={15} className="text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Ganti Password</h2>
            </div>
            <button onClick={onClose} disabled={saving}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 disabled:opacity-50">
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-6 py-5">
            <PasswordField label="Password Saat Ini" value={currentPassword} onChange={setCurrentPassword}
              show={showCurrent} onToggleShow={() => setShowCurrent((v) => !v)} autoFocus />
            <PasswordField label="Password Baru" value={newPassword} onChange={setNewPassword}
              show={showNew} onToggleShow={() => setShowNew((v) => !v)} placeholder="Minimal 8 karakter" />
            <PasswordField label="Konfirmasi Password Baru" value={confirmPassword} onChange={setConfirmPassword}
              show={showNew} onToggleShow={() => setShowNew((v) => !v)} />

            {error && <p className="text-xs font-medium text-red-500">{error}</p>}

            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5">
                Batal
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: gradient }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Simpan
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
