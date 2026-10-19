"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion } from "framer-motion";
import { Download, Share } from "lucide-react";
import { promptInstall } from "@/lib/pwaInstall";

export function PwaInstallScreen({ onDone }: { onDone: () => void }) {
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
    setMounted(true);
  }, []);

  async function install() {
    const shown = await promptInstall();
    if (shown) onDone();
    else setShowIosGuide(true);
  }

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: "#013920" }}
    >
      <motion.div
        className="pointer-events-none absolute left-[8%] top-[10%] h-80 w-80 rounded-full blur-[100px]"
        style={{ background: "rgba(0,200,83,0.25)" }}
        animate={{ x: [0, 32, 0], y: [0, 18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[8%] right-[8%] h-72 w-72 rounded-full blur-[100px]"
        style={{ background: "rgba(0,214,127,0.28)" }}
        animate={{ x: [0, -24, 0], y: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 flex w-full max-w-xs flex-col items-center"
      >
        <div className="w-full rounded-3xl bg-white p-6 text-center shadow-2xl">
          <Image
            src="/icon-192.png"
            alt="Logo Absensi Guru"
            width={192}
            height={192}
            priority
            className="mx-auto mb-4 h-24 w-24 rounded-2xl"
          />
          <h2 className="text-lg font-bold text-black">Pasang Absensi Guru di HP Anda</h2>
          <p className="mt-1.5 text-sm text-black/60">
            Buka lebih cepat dari layar utama,
            <br />
            seperti aplikasi biasa.
          </p>

          {showIosGuide && (
            <p className="mt-4 flex flex-wrap items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-3 text-xs text-black/70">
              Ketuk <Share size={14} className="inline text-[#00C853]" /> Bagikan di Safari, lalu pilih{" "}
              <b>Tambahkan ke Layar Utama</b>.
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            {!showIosGuide && (
              <button
                type="button"
                onClick={install}
                className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: "#00C853" }}
              >
                <Download size={16} />
                Pasang
              </button>
            )}
            <button
              type="button"
              onClick={onDone}
              className="w-full touch-manipulation rounded-xl px-4 py-3 text-sm font-medium text-black/60 transition hover:bg-black/5"
            >
              {showIosGuide ? "Mengerti" : "Lewati"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
