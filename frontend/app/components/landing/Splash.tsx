"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";

const STYLES = `
  @keyframes gradientShift {
    0%   { background-position: 20% 0%; }
    50%  { background-position: 80% 100%; }
    100% { background-position: 20% 0%; }
  }
`;

const PARTICLES: { x: string; y: string; size: number; color: string; delay: number; dur: number }[] = [
  { x: "11%",  y: "15%", size: 3,   color: "#0082FB", delay: 0,    dur: 6.2 },
  { x: "79%",  y: "10%", size: 2,   color: "#ffffff", delay: 1.3,  dur: 7.6 },
  { x: "54%",  y: "6%",  size: 3.5, color: "#0082FB", delay: 0.7,  dur: 5.9 },
  { x: "89%",  y: "43%", size: 2,   color: "#0082FB", delay: 1.9,  dur: 8.1 },
  { x: "23%",  y: "74%", size: 3,   color: "#ffffff", delay: 0.4,  dur: 6.6 },
  { x: "66%",  y: "82%", size: 2,   color: "#0082FB", delay: 2.2,  dur: 7.1 },
  { x: "93%",  y: "68%", size: 2.5, color: "#0082FB", delay: 1.0,  dur: 5.6 },
  { x: "7%",   y: "52%", size: 2,   color: "#ffffff", delay: 1.6,  dur: 8.6 },
  { x: "37%",  y: "90%", size: 3,   color: "#0082FB", delay: 2.5,  dur: 6.3 },
  { x: "73%",  y: "33%", size: 2,   color: "#0082FB", delay: 0.8,  dur: 7.3 },
  { x: "46%",  y: "60%", size: 1.5, color: "#ffffff", delay: 3.0,  dur: 9.0 },
  { x: "18%",  y: "38%", size: 2,   color: "#0082FB", delay: 1.1,  dur: 6.8 },
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

const DOT_COLORS = ["#0082FB", "#0082FB", "#ffffff"] as const;

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
        style={{ backgroundColor: "#0082FB" }}
      />

      <motion.div
        className="pointer-events-none absolute left-[4%] top-[4%] h-100 w-100 rounded-full blur-[110px]"
        style={{ background: "rgba(0,130,251,0.22)" }}
        animate={{ x: [0, 48, -12, 0], y: [0, 28, -16, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[4%] right-[4%] h-90 w-90 rounded-full blur-[115px]"
        style={{ background: "rgba(0,130,251,0.18)" }}
        animate={{ x: [0, -38, 18, 0], y: [0, -22, 12, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-8%] left-[18%] h-80 w-80 rounded-full blur-[95px]"
        style={{ background: "rgba(0,100,224,0.28)" }}
        animate={{ x: [0, 26, 0], y: [0, -18, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[14%] top-[22%] h-65 w-65 rounded-full blur-[85px]"
        style={{ background: "rgba(0,130,251,0.13)" }}
        animate={{ x: [0, -22, 10, 0], y: [0, 32, -10, 0] }}
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
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      <motion.div
        className="pointer-events-none absolute left-7 top-8 text-white"
        style={{ opacity: 0.1 }}
        animate={{ y: [0, -9, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <BookOpen size={38} />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-9 right-7 text-white"
        style={{ opacity: 0.1 }}
        animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1.3 }}
      >
        <GraduationCap size={42} />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-9 top-14 text-white"
        style={{ opacity: 0.06 }}
        animate={{ y: [0, -11, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <GraduationCap size={26} />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute bottom-14 left-9 text-white"
        style={{ opacity: 0.06 }}
        animate={{ y: [0, -7, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 2.1 }}
      >
        <BookOpen size={22} />
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <motion.div variants={logoReveal} className="relative mb-10 flex items-center justify-center">
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background:
                "radial-gradient(circle, rgba(0,130,251,0.55), rgba(0,130,251,0.3) 55%, transparent 80%)",
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
                "radial-gradient(circle, rgba(0,130,251,0.4), rgba(0,130,251,0.2) 60%, transparent 80%)",
              filter: "blur(18px)",
            }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          <Image
            src="/PPLG.png"
            alt="Logo PPLG"
            width={676}
            height={904}
            priority
            className="relative h-28 w-auto sm:h-32"
            style={{
              filter:
                "drop-shadow(0 0 32px rgba(0,130,251,0.75)) drop-shadow(0 0 64px rgba(0,130,251,0.4)) drop-shadow(0 8px 24px rgba(0,0,0,0.55))",
            }}
          />
        </motion.div>

        <div className="flex flex-wrap items-baseline justify-center gap-x-3 overflow-hidden">
          <motion.span
            variants={slideLeft}
            className="text-[1.65rem] font-bold leading-tight text-white sm:text-[2rem]"
          >
            Sistem
          </motion.span>
          <motion.span
            variants={slideRight}
            className="text-[1.65rem] font-bold leading-tight sm:text-[2rem]"
            style={{
              background: "#0082FB",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Pembelajaran
          </motion.span>
        </div>

        <motion.p
          variants={fadeUp}
          className="mt-4 text-xs font-light text-white/68 sm:text-sm"
          style={{ letterSpacing: "0.13em" }}
        >
          Pengembangan Perangkat Lunak dan Gim
        </motion.p>

        <motion.div variants={fadeUp} className="mt-5">
          <span
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-1.5 text-[9.5px] font-medium uppercase tracking-widest text-white/72"
            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}
          >
            <span
              className="h-1.25 w-1.25 shrink-0 rounded-full"
              style={{ background: "#0082FB", boxShadow: "0 0 6px #0082FB" }}
            />
            SMK Ma&apos;arif NU 01 Limpung
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-14 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            {DOT_COLORS.map((color, i) => (
              <motion.span
                key={i}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
                animate={{ y: [0, -9, 0], opacity: [0.35, 1, 0.35], scale: [0.88, 1.18, 0.88] }}
                transition={{
                  duration: 1.05,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.22,
                }}
              />
            ))}
          </div>
          <motion.p
            className="text-[10.5px] font-light tracking-widest text-white/40"
            animate={{ opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            Memuat sistem...
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}
