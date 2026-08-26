"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Code2 } from "lucide-react";
import { CodePracticeCanvas } from "@/components/materi/CodePracticeCanvas";

export function TugasPraktikViewerModal({
  open, onClose, title, subtitle, html, css, js,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  html: string;
  css: string;
  js: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="relative flex h-[95dvh] w-full max-w-[1400px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800"
          >
            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-6 py-4"
              style={{ background: "#0064E0" }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Code2 size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold text-white">{title}</h2>
                {subtitle && <p className="text-xs text-white/70">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-5">
              <div className="min-h-0 flex-1">
                <CodePracticeCanvas
                  key={`${html.length}-${css.length}-${js.length}`}
                  initialHtml={html}
                  initialCss={css}
                  initialJs={js}
                  minHeight={640}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
