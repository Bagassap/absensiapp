"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const DOT_COLORS = ["#ffffff", "#00C853", "#ffffff"] as const;

// Transisi bermerek penuh-layar setelah login berhasil (sebelum redirect) —
// meniru pola BrandedLoadingOverlay di lmspplg, warnanya disesuaikan ke
// brand hijau kita (#013920 dasar, #00C853 aksen glow) alih-alih biru.
export function BrandedLoadingOverlay({
  greeting,
  message = "Menyiapkan halaman Anda...",
}: {
  greeting?: string;
  message?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: "#013920" }}
    >
      <motion.div
        className="pointer-events-none absolute left-[8%] top-[10%] h-80 w-80 rounded-full blur-[100px]"
        style={{ background: "rgba(0,200,83,0.22)" }}
        animate={{ x: [0, 32, 0], y: [0, 18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[8%] right-[8%] h-72 w-72 rounded-full blur-[100px]"
        style={{ background: "rgba(0,200,83,0.25)" }}
        animate={{ x: [0, -24, 0], y: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <div className="relative mb-8 flex items-center justify-center">
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              background: "radial-gradient(circle, rgba(0,200,83,0.5), rgba(0,200,83,0.25) 55%, transparent 80%)",
              filter: "blur(36px)",
            }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <Image
            src="/PPLG.png"
            alt="Logo PPLG"
            width={820}
            height={837}
            priority
            className="relative h-24 w-auto sm:h-28"
            style={{
              filter: "drop-shadow(0 0 32px rgba(0,200,83,0.65)) drop-shadow(0 8px 24px rgba(0,0,0,0.55))",
            }}
          />
        </div>

        {greeting && (
          <p className="text-lg font-bold text-white sm:text-xl">{greeting}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          {DOT_COLORS.map((color, i) => (
            <motion.span
              key={i}
              className="rounded-full"
              style={{ width: 9, height: 9, background: color, boxShadow: `0 0 8px ${color}` }}
              animate={{ y: [0, -9, 0], opacity: [0.35, 1, 0.35], scale: [0.88, 1.18, 0.88] }}
              transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut", delay: i * 0.22 }}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] font-light tracking-widest text-white/70">{message}</p>
      </motion.div>
    </motion.div>
  );
}
