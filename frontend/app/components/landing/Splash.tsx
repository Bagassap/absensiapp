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

const PARTICLES: { x: string; y: string; size: number; color: string; delay: number; dur: number }[] = [
  { x: "89%",  y: "15%", size: 3,   color: "#00C853", delay: 0,    dur: 6.2 },
  { x: "21%",  y: "10%", size: 2,   color: "#00C853", delay: 1.3,  dur: 7.6 },
  { x: "46%",  y: "6%",  size: 3.5, color: "#00C853", delay: 0.7,  dur: 5.9 },
  { x: "11%",  y: "43%", size: 2,   color: "#00C853", delay: 1.9,  dur: 8.1 },
  { x: "77%",  y: "74%", size: 3,   color: "#00C853", delay: 0.4,  dur: 6.6 },
  { x: "34%",  y: "82%", size: 2,   color: "#00C853", delay: 2.2,  dur: 7.1 },
  { x: "7%",   y: "68%", size: 2.5, color: "#00C853", delay: 1.0,  dur: 5.6 },
  { x: "93%",  y: "52%", size: 2,   color: "#00C853", delay: 1.6,  dur: 8.6 },
  { x: "63%",  y: "90%", size: 3,   color: "#00C853", delay: 2.5,  dur: 6.3 },
  { x: "27%",  y: "33%", size: 2,   color: "#00C853", delay: 0.8,  dur: 7.3 },
  { x: "54%",  y: "60%", size: 1.5, color: "#00C853", delay: 3.0,  dur: 9.0 },
  { x: "82%",  y: "38%", size: 2,   color: "#00C853", delay: 1.1,  dur: 6.8 },
];

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
        style={{ backgroundColor: "#FFF7E4" }}
      />

      <motion.div
        className="pointer-events-none absolute right-[4%] top-[4%] h-100 w-100 rounded-full blur-[110px]"
        style={{ background: "rgba(0,200,83,0.25)" }}
        animate={{ x: [0, -48, 12, 0], y: [0, 28, -16, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[4%] left-[4%] h-90 w-90 rounded-full blur-[115px]"
        style={{ background: "rgba(0, 200, 83,0.10)" }}
        animate={{ x: [0, 38, -18, 0], y: [0, -22, 12, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-8%] right-[18%] h-80 w-80 rounded-full blur-[95px]"
        style={{ background: "rgba(0, 200, 83,0.08)" }}
        animate={{ x: [0, -26, 0], y: [0, -18, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-[14%] top-[22%] h-65 w-65 rounded-full blur-[85px]"
        style={{ background: "rgba(0,200,83,0.18)" }}
        animate={{ x: [0, 22, -10, 0], y: [0, 32, -10, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}66`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.18, 0.35, 0.18] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

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
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background:
                "radial-gradient(circle, rgba(0,200,83,0.5), rgba(0,200,83,0.24) 55%, transparent 80%)",
              filter: "blur(40px)",
            }}
            animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 136,
              height: 136,
              background:
                "radial-gradient(circle, rgba(0,200,83,0.4), rgba(0,200,83,0.18) 60%, transparent 80%)",
              filter: "blur(18px)",
            }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          <Image
            src="/PPLG.png"
            alt="Logo PPLG"
            width={855}
            height={910}
            priority
            className="relative h-28 w-auto sm:h-32"
            style={{
              filter: "drop-shadow(0 10px 28px rgba(0, 200, 83,0.22))",
            }}
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
