"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Loader2, User, IdCard, MessageSquareText, CheckCircle2, ArrowLeft, Clock } from "lucide-react";

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

export function LupaPasswordForm() {
  const [namaPengaju, setNamaPengaju] = useState("");
  const [loginIdDiajukan, setLoginIdDiajukan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaPengaju, loginIdDiajukan, keterangan: keterangan || undefined }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // 409 = a request for this student is already pending — this isn't a
        // validation error to fix and resubmit, it's a "you already did this"
        // state, so it gets its own screen instead of an inline error.
        if (res.status === 409) {
          setAlreadyPending(true);
          setLoading(false);
          return;
        }
        setError(data?.message || "Gagal mengirim permintaan. Coba lagi.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setLoading(false);
    }
  }

  if (alreadyPending) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-[#C3F84A]/15 bg-[#C3F84A]/[0.04] px-6 py-8 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F8]">
          <Clock size={28} className="text-[#C3F84A]" />
        </div>
        <p className="text-sm font-semibold text-black/80">
          Tunggu Konfirmasi Admin
        </p>
        <p className="text-sm text-black/55">
          Anda sudah mengirim permintaan reset password sebelumnya dan masih menunggu diproses.
          Tidak perlu mengirim permintaan baru — admin akan segera memprosesnya.
        </p>
        <Link
          href="/login"
          className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue transition-colors hover:text-blue/70"
        >
          <ArrowLeft size={15} /> Kembali ke halaman login
        </Link>
      </motion.div>
    );
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-black/8 bg-black/[0.02] px-6 py-8 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <p className="text-sm font-semibold text-black/80">
          Permintaan Anda telah dikirim ke Admin.
        </p>
        <p className="text-sm text-black/55">
          Silakan hubungi admin/guru untuk tindak lanjut, atau tunggu password Anda direset.
        </p>
        <Link
          href="/login"
          className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue transition-colors hover:text-blue/70"
        >
          <ArrowLeft size={15} /> Kembali ke halaman login
        </Link>
      </motion.div>
    );
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
        <label htmlFor="loginId" className="text-sm font-medium text-black/70">
          NIS / Kode Login
        </label>
        <div className="relative">
          <IdCard
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35"
          />
          <input
            id="loginId"
            name="loginId"
            type="text"
            autoComplete="username"
            required
            value={loginIdDiajukan}
            onChange={(e) => setLoginIdDiajukan(e.target.value)}
            placeholder="NIS atau kode login Anda"
            className="w-full rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
          />
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-1.5">
        <label htmlFor="namaPengaju" className="text-sm font-medium text-black/70">
          Nama Lengkap
        </label>
        <div className="relative">
          <User
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35"
          />
          <input
            id="namaPengaju"
            name="namaPengaju"
            type="text"
            autoComplete="name"
            required
            value={namaPengaju}
            onChange={(e) => setNamaPengaju(e.target.value)}
            placeholder="Nama lengkap Anda"
            className="w-full rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
          />
        </div>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-1.5">
        <label htmlFor="keterangan" className="text-sm font-medium text-black/70">
          Keterangan <span className="font-normal text-black/35">(opsional)</span>
        </label>
        <div className="relative">
          <MessageSquareText
            size={18}
            className="pointer-events-none absolute left-3.5 top-3.5 text-black/35"
          />
          <textarea
            id="keterangan"
            name="keterangan"
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Alasan lupa password, atau info tambahan lain..."
            className="w-full resize-none rounded-xl border border-black/10 bg-black/3 px-4 py-3 pl-11 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15"
          />
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
            Mengirim...
          </>
        ) : (
          "Kirim Permintaan"
        )}
      </motion.button>

      <motion.div variants={item} className="text-center">
        <Link href="/login" className="text-sm text-black/40 transition-colors hover:text-black/70">
          Kembali ke halaman login
        </Link>
      </motion.div>
    </motion.form>
  );
}
