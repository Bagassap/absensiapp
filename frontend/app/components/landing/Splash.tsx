"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STYLES = `
  @keyframes gradientShift {
    0%   { background-position: 20% 0%; }
    50%  { background-position: 80% 100%; }
    100% { background-position: 20% 0%; }
  }
`;


const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.25 } },
};

const logoReveal: Variants = {
  hidden: { opacity: 0, scale: 0.72 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.85, ease: [0.34, 1.56, 0.64, 1] },
  },
};

const slideLeft: Variants = {
  hidden: { opacity: 0, x: -36 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 36 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const DOT_COLORS = ["#00C853", "#00C853", "#00C853"] as const;

export function Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/login"), 2800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <style>{STYLES}</style>

      <div
        className="absolute inset-0"
        style={{ backgroundColor: "#FFFFFF" }}
      />


      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <motion.div variants={fadeUp} className="mb-5">
          <span
            className="inline-flex items-center gap-2 rounded-lg border border-black/12 bg-black/4 px-4 py-1.5 text-[9.5px] font-medium uppercase tracking-widest text-black/60"
          >
            <span
              className="h-1.25 w-1.25 shrink-0 rounded-full"
              style={{ background: "#00C853" }}
            />
            SMK Ma&apos;arif NU 01 Limpung
          </span>
        </motion.div>

        <motion.div variants={logoReveal} className="relative mb-8 flex items-center justify-center">
          <Image
            src="/PPLG.png"
            alt="Logo PPLG"
            width={855}
            height={910}
            priority
            className="relative h-28 w-auto sm:h-32"
          />
        </motion.div>

        <div className="flex flex-wrap items-baseline justify-center gap-x-3 overflow-hidden">
          <motion.span
            variants={slideLeft}
            className="text-[1.65rem] font-bold leading-tight sm:text-[2rem]"
            style={{
              background: "#00C853",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Absensi
          </motion.span>
          <motion.span
            variants={slideRight}
            className="text-[1.65rem] font-bold leading-tight sm:text-[2rem]"
            style={{ color: "#000000" }}
          >
            Guru
          </motion.span>
        </div>

        <motion.p
          variants={fadeUp}
          className="mt-4 text-xs font-medium text-black/50 sm:text-sm"
          style={{ letterSpacing: "0.13em" }}
        >
          Presensi Kehadiran Harian Guru
        </motion.p>

        <motion.div variants={fadeUp} className="mt-14 flex flex-col items-center gap-3">
          <motion.p
            className="text-[10.5px] font-medium tracking-widest text-black/35"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            Memuat sistem...
          </motion.p>
          <div className="flex items-center gap-3">
            {DOT_COLORS.map((color, i) => (
              <motion.span
                key={i}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: color,
                  boxShadow: `0 0 6px ${color}55`,
                }}
                animate={{ y: [0, -9, 0], opacity: [0.4, 1, 0.4], scale: [0.88, 1.18, 0.88] }}
                transition={{
                  duration: 1.05,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.22,
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
