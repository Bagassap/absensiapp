"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm harus dipakai di dalam ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }

  const danger = opts?.danger ?? true;
  const accent = danger ? "#EF4444" : "#00C853";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {opts && (
              <div className="fixed inset-0 z-[200] flex items-end justify-center lg:items-center lg:p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                  onClick={() => close(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 48 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 48 }}
                  transition={{ type: "spring", damping: 30, stiffness: 320 }}
                  className="relative z-10 w-full max-w-md rounded-t-[32px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] dark:bg-slate-800 lg:rounded-3xl lg:pb-5"
                >
                  <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600 lg:hidden" />
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${accent}1A`, color: accent }}>
                      <AlertTriangle size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{opts.title}</h2>
                      {opts.message && <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{opts.message}</p>}
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => close(false)}
                      className="rounded-2xl bg-slate-100 py-3.5 text-sm font-bold text-slate-700 active:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                    >
                      {opts.cancelLabel ?? "Batal"}
                    </button>
                    <button
                      type="button"
                      onClick={() => close(true)}
                      className="rounded-2xl py-3.5 text-sm font-bold text-white active:brightness-95"
                      style={{ background: accent }}
                    >
                      {opts.confirmLabel ?? (danger ? "Hapus" : "Ya")}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </ConfirmCtx.Provider>
  );
}
