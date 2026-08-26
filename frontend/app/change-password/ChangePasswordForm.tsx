"use client";

import { useState, type FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2, KeyRound, Sparkles, ShieldCheck, UserCheck, CalendarDays, AlertTriangle } from "lucide-react";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type Field = "newPassword" | "confirmPassword";

// If the nama/tanggalLahir on file is itself wrong (a typo during
// lengkapi-profil, or bad data from the initial CSV import), the student can
// NEVER pass this self-service check — only an admin can rescue them (via
// the "Lewati verifikasi identitas" bypass on reset). Below this threshold,
// a failure is far more likely to just be an honest typo, so retrying is the
// right first instinct; past it, we proactively point at the real way out
// instead of leaving the student to retry the same losing move forever.
const ESCALATE_AFTER_ATTEMPTS = 2;

const FIELDS: { key: Field; label: string; placeholder: string; autoComplete: string; icon: typeof KeyRound }[] = [
  { key: "newPassword", label: "Password Baru", placeholder: "Minimal 8 karakter", autoComplete: "new-password", icon: KeyRound },
  { key: "confirmPassword", label: "Konfirmasi Password Baru", placeholder: "Ulangi password baru", autoComplete: "new-password", icon: KeyRound },
];

export function ChangePasswordForm({ profileCompleted, bypassIdentityVerification, role }: { profileCompleted: boolean; bypassIdentityVerification: boolean; role: string }) {
  const [values, setValues] = useState<Record<Field, string>>({
    newPassword: "",
    confirmPassword: "",
  });
  const [identityConfirm, setIdentityConfirm] = useState("");
  const [identityFailedAttempts, setIdentityFailedAttempts] = useState(0);
  const [visible, setVisible] = useState<Record<Field, boolean>>({
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: Field, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  function toggleVisible(key: Field) {
    setVisible((v) => ({ ...v, [key]: !v[key] }));
  }

  function validate(): string | null {
    if (!bypassIdentityVerification && !identityConfirm.trim()) {
      return profileCompleted
        ? "Konfirmasi tanggal lahir Anda wajib diisi."
        : "Konfirmasi nama lengkap Anda wajib diisi.";
    }
    if (!values.newPassword || !values.confirmPassword) {
      return "Semua field wajib diisi.";
    }
    if (values.newPassword.length < 8) {
      return "Password baru minimal 8 karakter.";
    }
    if (values.newPassword !== values.confirmPassword) {
      return "Konfirmasi password baru tidak cocok.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          ...(bypassIdentityVerification
            ? {}
            : profileCompleted
              ? { tanggalLahirKonfirmasi: identityConfirm }
              : { namaKonfirmasi: identityConfirm }),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || "Gagal mengubah password.");
        // Only count attempts that actually included an identity check —
        // a password-strength or "must match" validation failure isn't
        // evidence the identity data on file is wrong, so it shouldn't push
        // the student toward "go find an admin" prematurely.
        if (!bypassIdentityVerification) setIdentityFailedAttempts((n) => n + 1);
        setLoading(false);
        return;
      }

      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const me = await meRes.json().catch(() => null);
      const role = (me?.role as string)?.toLowerCase() ?? "siswa";
      window.location.replace(`/${role}/dashboard`);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial="hidden"
      animate="visible"
      variants={container}
      className="mt-8 flex flex-col gap-5"
    >
      <motion.div
        variants={item}
        className="flex items-start gap-2.5 rounded-xl border border-blue/15 bg-blue/5 px-3.5 py-3"
      >
        <Sparkles size={16} className="mt-0.5 shrink-0 text-blue" />
        <p className="text-xs leading-relaxed text-black/65">
          {role === "SISWA"
            ? "Selamat datang! Untuk keamanan akun Anda, silakan buat password baru. Password default Anda adalah NIS Anda."
            : "Selamat datang! Untuk keamanan akun Anda, silakan buat password baru sebelum melanjutkan."}
        </p>
      </motion.div>

      {bypassIdentityVerification ? (
        <motion.div
          variants={item}
          className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-3"
        >
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed text-black/65">
            Identitas Anda sudah diverifikasi oleh admin — langsung buat password baru di bawah ini.
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div
            variants={item}
            className="flex items-start gap-2.5 rounded-xl border border-[#C3F84A]/20 bg-[#C3F84A]/5 px-3.5 py-3"
          >
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#1C2B33]" />
            <p className="text-xs leading-relaxed text-black/65">
              Untuk keamanan, konfirmasi identitas Anda sebelum membuat password baru —
              ini mencegah orang lain mengganti password akun Anda dengan NIS yang bukan miliknya.
            </p>
          </motion.div>

          <motion.div variants={item} className="flex flex-col gap-1.5">
            <label htmlFor="identityConfirm" className="text-sm font-medium text-black/70">
              {profileCompleted ? "Konfirmasi Tanggal Lahir Anda" : "Konfirmasi Nama Lengkap Anda"}
            </label>
            <div className="relative">
              {profileCompleted ? (
                <CalendarDays size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
              ) : (
                <UserCheck size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35" />
              )}
              <input
                id="identityConfirm"
                name="identityConfirm"
                type={profileCompleted ? "date" : "text"}
                autoComplete="off"
                required
                value={identityConfirm}
                onChange={(e) => setIdentityConfirm(e.target.value)}
                placeholder={profileCompleted ? undefined : "Ketik persis sesuai data akun Anda"}
                className="w-full rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
              />
            </div>
            <p className="text-[11px] text-black/40">
              {profileCompleted
                ? "Tanggal lahir yang Anda isi saat melengkapi profil sebelumnya."
                : "Nama lengkap sesuai data sekolah — bukan nama panggilan. Gelar akademik (S.Kom, S.Pd, dll) tidak perlu diketik."}
            </p>
          </motion.div>

          {identityFailedAttempts >= ESCALATE_AFTER_ATTEMPTS && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-3"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
              <p className="text-xs leading-relaxed text-black/70">
                Sudah gagal beberapa kali? Kemungkinan {profileCompleted ? "tanggal lahir" : "nama"} yang tersimpan
                di sistem sekolah berbeda dari yang Anda ingat — bukan berarti Anda salah ketik.
                Mengulang lagi kemungkinan besar tidak akan berhasil. Silakan hubungi admin sekolah
                untuk memverifikasi identitas Anda secara manual dan mengatur ulang password.
              </p>
            </motion.div>
          )}
        </>
      )}

      {FIELDS.map(({ key, label, placeholder, autoComplete, icon: Icon }) => (
        <motion.div key={key} variants={item} className="flex flex-col gap-1.5">
          <label htmlFor={key} className="text-sm font-medium text-black/70">
            {label}
          </label>
          <div className="relative">
            <Icon
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35"
            />
            <input
              id={key}
              name={key}
              type={visible[key] ? "text" : "password"}
              autoComplete={autoComplete}
              required
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 pr-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
            />
            <button
              type="button"
              onClick={() => toggleVisible(key)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 transition-colors hover:text-black/60"
              aria-label={visible[key] ? "Sembunyikan password" : "Tampilkan password"}
            >
              {visible[key] ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </motion.div>
      ))}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border-l-4 border-l-[#EF4444] bg-[#1C2B33] px-3 py-2 text-sm font-medium text-white"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        variants={item}
        type="submit"
        disabled={loading}
        whileHover={!loading ? { scale: 1.02 } : undefined}
        whileTap={!loading ? { scale: 0.98 } : undefined}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(0,130,251,0.55)] transition-all hover:shadow-[0_14px_40px_-8px_rgba(0,130,251,0.70)] hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: "#0082FB" }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Memproses...
          </>
        ) : (
          "Simpan Password Baru"
        )}
      </motion.button>
    </motion.form>
  );
}
