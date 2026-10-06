"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { LoginForm } from "./LoginForm";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const logoVariants: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] },
  },
};

export function LoginCard() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-transparent shadow-none sm:h-auto sm:max-w-235 sm:flex-row sm:gap-4 sm:rounded-[36px] sm:bg-white sm:p-5 sm:shadow-[0_0_0_1px_rgba(0,200,83,0.18),0_4px_16px_rgba(0,0,0,0.06),0_20px_56px_rgba(0,0,0,0.12),0_40px_100px_rgba(0,200,83,0.07)]"
    >
      <div
        className="relative flex flex-1 min-h-0 flex-col items-center justify-center overflow-hidden px-6 py-8 sm:min-h-0 sm:w-[320px] sm:shrink-0 sm:flex-none sm:rounded-3xl sm:px-10 sm:py-12"
        style={{ backgroundColor: "#013920" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00C853]/25 blur-3xl sm:block" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#00C853]/30 blur-3xl sm:block" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div
            variants={logoVariants}
            className="relative flex shrink-0 items-center justify-center"
          >
            <motion.div
              className="absolute h-32 w-32 rounded-full bg-[#00C853]/35 blur-2xl sm:h-48 sm:w-48"
              animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.85, 0.45] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="absolute h-24 w-24 rounded-full blur-xl sm:h-32 sm:w-32"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,200,83,0.45), rgba(0,200,83,0.2) 60%, transparent 80%)",
              }}
            />
            <Image
              src="/PPLG.png"
              alt="Logo PPLG"
              width={820}
              height={837}
              priority
              className="relative h-16 w-auto sm:h-27.5"
              style={{
                filter:
                  "drop-shadow(0 0 22px rgba(0,200,83,0.7)) drop-shadow(0 6px 18px rgba(0,0,0,0.55))",
              }}
            />
          </motion.div>

          <div className="relative z-10 mt-6 sm:mt-8">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Presensi Kehadiran
            </p>

            <h1 className="mt-0.5 text-xl font-bold leading-[1.2] tracking-wide text-white sm:text-[1.75rem]">
              <span
                style={{
                  background: "#00C853",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Absensi
              </span>{" "}
              Guru
            </h1>

            <div
              className="mx-auto mt-3 h-px w-16 sm:mt-4"
              style={{ background: "rgba(0,200,83,0.8)" }}
            />

            <p className="mt-3 text-[11.5px] font-light leading-relaxed text-white/60">
              Kehadiran Harian Guru
            </p>

            <div className="mt-4 flex justify-center sm:mt-5">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/[0.07] px-3.5 py-1.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/75">
                <span className="h-1 w-1 shrink-0 rounded-full bg-[#00C853]" />
                SMK Ma&apos;arif NU 01 Limpung
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col rounded-t-3xl bg-white px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:flex-1 sm:rounded-3xl sm:px-12 sm:py-14">
        <h2 className="hidden text-2xl font-semibold text-black sm:block">Selamat Datang</h2>
        <p className="mt-2 hidden text-sm text-black/55 sm:block">
          Masuk ke akun Anda untuk mencatat kehadiran harian
        </p>

        <LoginForm />

        <p className="mt-8 hidden text-center text-xs text-black/35 sm:block">
          &copy; {new Date().getFullYear()} Absensi Guru &middot; SMK Ma&apos;arif
          NU 01 Limpung
        </p>
      </div>
    </motion.div>
  );
}
