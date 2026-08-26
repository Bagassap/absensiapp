"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Mail, IdCard, Camera, Loader2, User } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { ChangeFotoProfilModal } from "@/components/shared/ChangeFotoProfilModal";

type MeResponse = {
  id: string;
  nama: string;
  email: string | null;
  loginId: string | null;
  role: "ADMIN" | "GURU" | "SISWA";
  fotoProfil: string | null;
  guru: { id: string; nip: string | null } | null;
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrator", GURU: "Guru", SISWA: "Siswa" };
const GRADIENT = "#0082FB";

export function ProfilSayaModal({ onClose }: { onClose: () => void }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChangeFoto, setShowChangeFoto] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setMe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const modal = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-100 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2B33]"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="relative overflow-hidden px-6 pb-6 pt-5" style={{ background: GRADIENT }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/8" />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <X size={15} />
            </button>

            <div className="relative flex items-center gap-2">
              <User size={14} className="text-white/70" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Profil Saya</span>
            </div>

            {loading || !me ? (
              <div className="relative mt-4 flex items-center gap-3">
                <div className="h-16 w-16 animate-pulse rounded-full bg-white/20" />
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
                  <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
                </div>
              </div>
            ) : (
              <div className="relative mt-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="rounded-full ring-4 ring-white/25">
                    <Avatar
                      src={me.fotoProfil}
                      nama={me.nama}
                      sizePx={64}
                      fallbackBg="rgba(255,255,255,0.22)"
                      textClassName="text-lg font-extrabold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangeFoto(true)}
                    title="Ganti foto profil"
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#0064E0] text-white shadow-md transition hover:brightness-90"
                  >
                    <Camera size={11} />
                  </button>
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold leading-tight text-white">{me.nama}</h2>
                  <span className="mt-1 inline-flex items-center rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {ROLE_LABEL[me.role] ?? me.role}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!loading && me && (
            <div className="space-y-3 px-6 py-5">
              {me.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <Mail size={15} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Email</p>
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{me.email}</p>
                  </div>
                </div>
              )}
              {me.loginId && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0082FB] dark:bg-[#0064E0]/20">
                    <IdCard size={15} className="text-[#0082FB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Login ID</p>
                    <p className="truncate font-mono text-sm font-semibold text-slate-800 dark:text-white">{me.loginId}</p>
                  </div>
                </div>
              )}
              {me.guru?.nip && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <IdCard size={15} className="text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">NIP</p>
                    <p className="truncate font-mono text-sm font-semibold text-slate-800 dark:text-white">{me.guru.nip}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center px-6 py-10">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-700/50">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </motion.div>

      {showChangeFoto && (
        <ChangeFotoProfilModal gradient={GRADIENT} onClose={() => setShowChangeFoto(false)} />
      )}
    </AnimatePresence>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
