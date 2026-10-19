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
      className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-transparent shadow-none sm:h-auto sm:max-w-235 sm:flex-row sm:gap-4 sm:rounded-[36px] sm:bg-white sm:p-5 sm:shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
    >
      <div
        className="relative flex flex-1 min-h-0 flex-col items-center justify-center overflow-hidden px-6 py-8 sm:min-h-0 sm:w-[320px] sm:shrink-0 sm:flex-none sm:rounded-3xl sm:px-10 sm:py-12"
        style={{ backgroundColor: "#013920" }}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.div variants={logoVariants} className="flex shrink-0 items-center justify-center">
            <Image
              src="/PPLG.png"
              alt="Logo PPLG"
              width={820}
              height={837}
              priority
              className="h-16 w-auto sm:h-27.5"
            />
          </motion.div>

          <h1 className="mt-5 text-xl font-bold leading-[1.2] tracking-wide text-white sm:mt-6 sm:text-[1.75rem]">
            <span className="text-[#00C853]">Absensi</span> Guru
          </h1>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col rounded-t-3xl bg-white px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:flex-1 sm:rounded-3xl sm:px-12 sm:py-14">
        <h2 className="hidden text-2xl font-semibold text-black sm:block">Selamat Datang</h2>
        <p className="mt-2 hidden text-sm text-black/55 sm:block">
          Masuk ke akun Anda untuk mencatat kehadiran harian
        </p>

        <LoginForm />

        <p className="mt-8 hidden text-center text-xs text-black/35 sm:block">
          &copy; {new Date().getFullYear()} Absensi Guru
        </p>
      </div>
    </motion.div>
  );
}
