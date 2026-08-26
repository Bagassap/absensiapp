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
      className="relative z-10 flex w-full max-w-235 flex-col gap-3 rounded-[36px] bg-white p-4 shadow-[0_0_0_1px_rgba(0,130,251,0.18),0_4px_16px_rgba(0,0,0,0.06),0_20px_56px_rgba(0,100,224,0.12),0_40px_100px_rgba(0,130,251,0.07)] sm:flex-row-reverse sm:gap-4 sm:p-5"
    >
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-5 sm:w-[320px] sm:shrink-0 sm:px-10 sm:py-12"
        style={{ backgroundColor: "#0082FB" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="pointer-events-none absolute -left-16 -top-16 hidden h-48 w-48 rounded-full bg-[#0082FB]/50 blur-3xl sm:block" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 hidden h-56 w-56 rounded-full bg-[#0082FB]/30 blur-3xl sm:block" />

        <div className="relative z-10 flex flex-row items-center gap-3 sm:flex-col sm:gap-0 sm:text-center">
          <motion.div
            variants={logoVariants}
            className="relative flex shrink-0 items-center justify-center"
          >
            <motion.div
              className="absolute h-24 w-24 rounded-full bg-[#0082FB]/35 blur-2xl sm:h-48 sm:w-48"
              animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.85, 0.45] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="absolute hidden h-32 w-32 rounded-full blur-xl sm:block"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,130,251,0.45), rgba(0,130,251,0.2) 60%, transparent 80%)",
              }}
            />
            <Image
              src="/PPLG.png"
              alt="Logo PPLG"
              width={676}
              height={904}
              priority
              className="relative h-12 w-auto sm:h-27.5"
              style={{
                filter:
                  "drop-shadow(0 0 22px rgba(0,130,251,0.7)) drop-shadow(0 6px 18px rgba(0,0,0,0.55))",
              }}
            />
          </motion.div>

          <div className="relative z-10 sm:mt-8">
            <p className="hidden text-[9.5px] font-semibold uppercase tracking-[0.22em] text-white/45 sm:block">
              Platform Pendidikan
            </p>

            <h1 className="mt-0.5 hidden text-[1.75rem] font-bold leading-[1.2] tracking-wide text-white sm:block">
              Sistem
              <br />
              <span
                style={{
                  background: "#EAF3FF",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Pembelajaran
              </span>
            </h1>
            <h1 className="text-base font-semibold text-white sm:hidden">
              Sistem Pembelajaran
            </h1>

            <div
              className="mx-auto mt-4 hidden h-px w-16 sm:block"
              style={{
                background:
                  "rgba(0,130,251,0.8)",
              }}
            />

            <p className="mt-3 hidden text-[11.5px] font-light leading-relaxed text-white/60 sm:block">
              Pengembangan Perangkat Lunak
              <br />
              dan Gim
            </p>

            <div className="mt-5 hidden sm:flex sm:justify-center">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/[0.07] px-3.5 py-1.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-white/75">
                <span className="h-1 w-1 shrink-0 rounded-full bg-[#0082FB]/70" />
                SMK Ma&apos;arif NU 01 Limpung
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center rounded-3xl bg-[#ffffff] px-8 py-10 sm:px-12 sm:py-14">
        <h2 className="text-2xl font-semibold text-black">Selamat Datang</h2>
        <p className="mt-2 text-sm text-black/55">
          Masuk ke akun Anda untuk mengakses sistem pembelajaran
        </p>

        <LoginForm />

        <p className="mt-8 text-center text-xs text-black/35">
          &copy; {new Date().getFullYear()} LMS PPLG &middot; SMK Ma&apos;arif
          NU 01 Limpung
        </p>
      </div>
    </motion.div>
  );
}
