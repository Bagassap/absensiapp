"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2, User, Lock } from "lucide-react";

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

export function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) {
          setError("NIS/email atau password salah.");
        } else if (res.status === 502) {
          setError("Tidak dapat terhubung ke server. Coba lagi nanti.");
        } else {
          setError(data?.message || "Terjadi kesalahan saat login.");
        }
        setLoading(false);
        return;
      }

      sessionStorage.setItem("lms_session", "1");
      if (data.user?.mustChangePassword) {
        window.location.replace("/change-password");
        return;
      }
      const role = (data.user?.role as string)?.toLowerCase() ?? "siswa";
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
      <motion.div variants={item} className="flex flex-col gap-1.5">
        <label htmlFor="login" className="text-sm font-medium text-black/70">
          NIS
        </label>
        <div className="relative">
          <User
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35"
          />
          <input
            id="login"
            name="login"
            type="text"
            autoComplete="username"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="NIS atau email"
            className="w-full rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
          />
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-black/70">
          Password
        </label>
        <div className="relative">
          <Lock
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kata sandi"
            className="w-full rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 pr-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/35 transition-colors hover:text-black/60"
            aria-label={
              showPassword ? "Sembunyikan password" : "Tampilkan password"
            }
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </motion.div>

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
          "Masuk"
        )}
      </motion.button>

      <motion.div variants={item} className="text-center">
        <Link
          href="/lupa-password"
          className="text-sm text-black/40 transition-colors hover:text-black/70"
        >
          Lupa Password?
        </Link>
      </motion.div>
    </motion.form>
  );
}
