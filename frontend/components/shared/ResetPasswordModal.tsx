"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, X, Eye, EyeOff, ShieldAlert, CheckCircle2, UserCheck, Copy, CheckCheck, Printer } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:bg-slate-800";

// Kartu slip dicetak di jendela terpisah (bukan window.print() pada modal
// itu sendiri) supaya CSS/layout aplikasi tidak ikut ke kertas — slip ini
// satu-satunya tempat password baru pernah terlihat, jadi tidak disimpan
// di state React setelah modal ditutup ataupun dikirim ke server manapun.
function printSlip(opts: { nama: string; loginId?: string; password: string }) {
  const w = window.open("", "_blank", "width=420,height=600");
  if (!w) return;
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date()) + " WIB";
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Slip Password — ${opts.nama}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;color:#1C2B33;}
      .card{border:2px dashed #cbd5e1;border-radius:16px;padding:20px;max-width:340px;margin:0 auto;}
      h1{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#0082FB;margin:0 0 4px;}
      .nama{font-size:18px;font-weight:800;margin:0 0 16px;}
      .row{margin-bottom:12px;}
      .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;}
      .value{font-family:ui-monospace,Menlo,monospace;font-size:16px;font-weight:700;margin-top:2px;}
      .note{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.5;}
      .ts{margin-top:10px;font-size:10px;color:#94a3b8;}
    </style></head><body>
    <div class="card">
      <h1>Slip Password Akun</h1>
      <p class="nama">${opts.nama}</p>
      ${opts.loginId ? `<div class="row"><div class="label">Login</div><div class="value">${opts.loginId}</div></div>` : ""}
      <div class="row"><div class="label">Password Baru</div><div class="value">${opts.password}</div></div>
      <p class="note">Password ini wajib diganti saat login berikutnya. Jangan bagikan slip ini ke orang lain selain pemilik akun.</p>
      <p class="ts">Dicetak ${tanggal}</p>
    </div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
  w.document.close();
}

export function ResetPasswordModal({
  userId, userName, nis, loginId, mustChangePassword, onClose, onSuccess,
}: {
  userId: string; userName: string; nis?: string; loginId?: string | null; mustChangePassword?: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const toast = useToast();
  const resetToNis = !!nis;
  // Kalau status password belum diketahui (undefined), anggap konservatif "belum ganti".
  const alreadyChanged = resetToNis && mustChangePassword === false;
  const [newPassword, setNewPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bypassIdentity, setBypassIdentity] = useState(false);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const effectiveLoginId = loginId || nis || undefined;

  async function handleReset() {
    if (!resetToNis && newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(resetToNis ? {} : { newPassword }),
          ...(bypassIdentity ? { bypassIdentityVerification: true } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
      onSuccess?.();
      // Modal tetap terbuka lewat layar sukses di bawah — ini satu-satunya
      // momen password baru bisa dilihat/disalin/dicetak sebelum hash-nya
      // yang tersimpan di server. Tidak ditutup otomatis supaya admin
      // sempat menyalin/mencetaknya dulu.
      setSuccessPassword(resetToNis ? nis! : newPassword);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mereset password. Coba lagi.";
      setError(msg);
      toast.error("Gagal mereset password", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!successPassword) return;
    const text = effectiveLoginId ? `Login: ${effectiveLoginId}\nPassword: ${successPassword}` : successPassword;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Gagal menyalin", "Salin manual dari layar ini.");
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-999 flex items-end justify-center p-4 sm:items-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
          initial={{ scale: 0.95, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 24 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
          {successPassword ? (
            <>
              <div className="relative overflow-hidden bg-[#00D67F] px-6 py-5">
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/55">Password Direset</p>
                      <h2 className="text-base font-extrabold leading-tight text-white">{userName}</h2>
                    </div>
                  </div>
                  <button onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white/80 transition-all hover:bg-white/25 hover:text-white">
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="space-y-4 px-5 py-5">
                <div className="flex items-start gap-2.5 rounded-xl border border-[#F1F5F8] bg-[#F1F5F8] px-3.5 py-3 dark:border-[#1C2B33]/30 dark:bg-[#1C2B33]/10">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#C3F84A]" />
                  <p className="text-xs leading-relaxed text-[#1C2B33] dark:text-[#C3F84A]">
                    Ini satu-satunya kesempatan melihat password ini di layar — setelah ditutup, sistem hanya
                    menyimpan hash-nya dan tidak bisa ditampilkan ulang. Salin atau catat sekarang.
                  </p>
                </div>

                <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  {effectiveLoginId && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Login</p>
                      <p className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{effectiveLoginId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Password Baru</p>
                    <p className="font-mono text-lg font-extrabold tracking-wide text-emerald-600 dark:text-emerald-400">{successPassword}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={handleCopy}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    {copied ? <CheckCheck size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                  <button type="button" onClick={() => printSlip({ nama: userName, loginId: effectiveLoginId, password: successPassword })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    <Printer size={15} /> Cetak Slip
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-slate-800">
                <motion.button type="button" onClick={onClose}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md"
                  style={{ backgroundColor: "#00D67F" }}>
                  Selesai
                </motion.button>
              </div>
            </>
          ) : (
          <>
          <div className="relative overflow-hidden bg-[#EF4444] px-6 py-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <KeyRound size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/55">Reset Password</p>
                  <h2 className="text-base font-extrabold leading-tight text-white">{userName}</h2>
                </div>
              </div>
              <button onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white/80 transition-all hover:bg-white/25 hover:text-white">
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="space-y-4 px-5 py-5">
            {resetToNis && (
              alreadyChanged ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50 px-3.5 py-3 dark:border-green-900/30 dark:bg-green-900/10">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-500" />
                  <p className="text-xs leading-relaxed text-green-700 dark:text-green-400">
                    <strong>Siswa ini sudah mengganti password sendiri.</strong>
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#F1F5F8] bg-[#F1F5F8] px-3.5 py-3 dark:border-[#1C2B33]/30 dark:bg-[#1C2B33]/10">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#C3F84A]" />
                  <p className="text-xs leading-relaxed text-[#1C2B33] dark:text-[#C3F84A]">
                    <strong>Siswa ini belum mengganti password</strong> (masih menggunakan NIS).
                  </p>
                </div>
              )
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-[#F1F5F8] bg-[#F1F5F8] px-3.5 py-3 dark:border-[#1C2B33]/30 dark:bg-[#1C2B33]/10">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#C3F84A]" />
              <p className="text-xs leading-relaxed text-[#1C2B33] dark:text-[#C3F84A]">
                {resetToNis
                  ? (alreadyChanged
                      ? <>Siswa sudah memiliki password sendiri. Reset akan mengembalikan password ke <strong>NIS siswa ({nis})</strong> dan siswa akan diminta membuat password baru lagi saat login berikutnya.</>
                      : <>Password akan direset ke <strong>NIS siswa ({nis})</strong>. {userName} akan diwajibkan mengganti password tersebut saat login berikutnya.</>)
                  : <>Password akan diganti ke nilai baru di bawah ini. {userName} akan diwajibkan mengganti password tersebut saat login berikutnya.</>}
              </p>
            </div>
            {resetToNis ? (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                  <KeyRound size={10} className="text-primary/70" />
                  Password Default Baru
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">{nis}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">(NIS siswa)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                  <KeyRound size={10} className="text-primary/70" />
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    name="reset-target-new-password"
                    id="reset-target-new-password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className={INPUT}
                  />
                  <button type="button" onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={bypassIdentity}
                onChange={(e) => setBypassIdentity(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/40 dark:border-slate-600"
              />
              <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                  <UserCheck size={12} className="text-primary" /> Lewati verifikasi identitas
                </span>
                Gunakan kalau saya sudah memverifikasi identitas {userName} secara manual (mis. langsung/telepon) —
                berlaku sekali untuk penggantian password berikutnya, berguna kalau data nama/tanggal lahir siswa
                di sistem belum akurat sehingga siswa tidak bisa lolos verifikasi sendiri.
              </span>
            </label>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-slate-800">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              Batal
            </button>
            <motion.button type="button" onClick={handleReset} disabled={saving}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 24px #EF444455" }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#EF4444" }}>
              {saving
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Mereset…</>
                : <><KeyRound size={14} />Reset Password</>}
            </motion.button>
          </div>
          </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
