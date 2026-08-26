"use client";

import {
  createContext, useCallback, useContext, useEffect, useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, X, Trash2, AlertOctagon,
} from "lucide-react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
  createdAt: Date;
}

interface ConfirmItem {
  id: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  resolve: (val: boolean) => void;
}

interface ToastContextValue {
  success: (title: string, description?: string, duration?: number) => void;
  error:   (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info:    (title: string, description?: string, duration?: number) => void;
  dismiss: (id: string) => void;
  confirm: (message: string, description?: string, confirmLabel?: string) => Promise<boolean>;
}

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const THEME = {
  success: {
    headerBg:    "#E3FBF0",
    blob1:       "rgba(0,214,127,0.22)",
    blob2:       "rgba(0,214,127,0.14)",
    ring1:       "rgba(0,214,127,0.18)",
    ring2:       "rgba(0,214,127,0.10)",
    iconBg:      "#00D67F",
    iconShadow:  "0 16px 40px rgba(0,214,127,0.55)",
    bar:         "#00D67F",
    btnBg:       "#00D67F",
    btnShadow:   "0 8px 24px rgba(0,214,127,0.45)",
    dotColor:    "#00D67F",
    icon:        CheckCircle2,
    label:       "Berhasil",
  },
  error: {
    headerBg:    "#FEE9EA",
    blob1:       "rgba(239,68,68,0.22)",
    blob2:       "rgba(239,68,68,0.14)",
    ring1:       "rgba(239,68,68,0.18)",
    ring2:       "rgba(239,68,68,0.10)",
    iconBg:      "#EF4444",
    iconShadow:  "0 16px 40px rgba(239,68,68,0.55)",
    bar:         "#EF4444",
    btnBg:       "#EF4444",
    btnShadow:   "0 8px 24px rgba(239,68,68,0.45)",
    dotColor:    "#EF4444",
    icon:        XCircle,
    label:       "Gagal",
  },
  warning: {
    headerBg:    "#F4FFD9",
    blob1:       "rgba(195,248,74,0.35)",
    blob2:       "rgba(195,248,74,0.22)",
    ring1:       "rgba(195,248,74,0.28)",
    ring2:       "rgba(195,248,74,0.16)",
    iconBg:      "#1C2B33",
    iconShadow:  "0 16px 40px rgba(28,43,51,0.35)",
    bar:         "#C3F84A",
    btnBg:       "#C3F84A",
    btnShadow:   "0 8px 24px rgba(195,248,74,0.45)",
    dotColor:    "#C3F84A",
    icon:        AlertTriangle,
    label:       "Perhatian",
  },
  info: {
    headerBg:    "#EAF3FF",
    blob1:       "rgba(0,130,251,0.22)",
    blob2:       "rgba(0,130,251,0.14)",
    ring1:       "rgba(0,130,251,0.18)",
    ring2:       "rgba(0,130,251,0.10)",
    iconBg:      "#0064E0",
    iconShadow:  "0 16px 40px rgba(0,130,251,0.55)",
    bar:         "#0064E0",
    btnBg:       "#0064E0",
    btnShadow:   "0 8px 24px rgba(0,130,251,0.45)",
    dotColor:    "#0082FB",
    icon:        Info,
    label:       "Informasi",
  },
} as const;

function FloatingDot({ color, x, y, delay, size }: { color: string; x: number; y: number; delay: number; size: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{ width: size, height: size, background: color, left: "50%", top: "50%" }}
      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
      animate={{ opacity: [0, 0.8, 0], x, y, scale: [0, 1, 0.4] }}
      transition={{ duration: 1.6, delay, ease: "easeOut" }}
    />
  );
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function NotificationCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const theme  = THEME[toast.type];
  const Icon   = theme.icon;
  const isDark = useDarkMode();
  const [paused, setPaused] = useState(false);

  const handleEnd = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss]);

  const cardBg     = isDark ? "#1C2B33" : "#ffffff";
  const titleColor = isDark ? "#F1F5F8" : "#1C2B33";
  const descColor  = isDark ? "#94a3b8" : "#64748b";
  const divider    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const headerBg   = isDark ? "rgba(30,41,59,0)" : theme.headerBg;

  const dots = [
    { x: -52, y: -48, delay: 0.1,  size: 7 },
    { x:  54, y: -44, delay: 0.18, size: 5 },
    { x: -60, y:  12, delay: 0.24, size: 6 },
    { x:  58, y:  18, delay: 0.14, size: 4 },
    { x: -22, y:  58, delay: 0.30, size: 5 },
    { x:  26, y:  56, delay: 0.22, size: 7 },
    { x: -48, y: -14, delay: 0.36, size: 4 },
    { x:  62, y: -18, delay: 0.12, size: 6 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.78, y: 32, filter: "blur(6px)" }}
      animate={{ opacity: 1,  scale: 1,    y: 0,  filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.86, y: 20, filter: "blur(4px)", transition: { duration: 0.24 } }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
      onHoverStart={() => setPaused(true)}
      onHoverEnd={() => setPaused(false)}
      className="relative w-full max-w-sm select-none"
    >
      <motion.div
        animate={{ opacity: [0.55, 0.18, 0.55], scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -inset-4 -z-10 rounded-4xl blur-2xl"
        style={{ background: theme.blob1 }}
      />

      <div
        className="relative overflow-hidden rounded-[1.75rem]"
        style={{
          background: cardBg,
          boxShadow: isDark
            ? "0 28px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)"
            : "0 28px 64px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          onClick={() => onDismiss(toast.id)}
          whileHover={{ scale: 1.14 }}
          whileTap={{ scale: 0.88 }}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
            color: descColor,
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </motion.button>

        <div
          className="relative flex flex-col items-center overflow-hidden pb-6 pt-10"
          style={{ background: isDark ? "rgba(255,255,255,0.03)" : headerBg }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.3, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ width: 160, height: 160, background: isDark ? theme.blob2 : theme.blob1 }}
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute left-1/4 top-1/4 rounded-full blur-2xl"
            style={{ width: 80, height: 80, background: theme.blob2 }}
          />

          <div className="relative flex items-center justify-center">
            {dots.map((d, i) => (
              <FloatingDot key={i} color={theme.dotColor} x={d.x} y={d.y} delay={d.delay} size={d.size} />
            ))}

            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute rounded-full"
              style={{ width: 108, height: 108, background: theme.ring2 }}
            />
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute rounded-full"
              style={{ width: 84, height: 84, background: theme.ring1 }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 13, stiffness: 260, delay: 0.1 }}
              className="relative z-10 flex h-17 w-17 items-center justify-center rounded-2xl text-white"
              style={{ background: theme.iconBg, boxShadow: theme.iconShadow }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 1.0, delay: 0.28, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl bg-white"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 360, delay: 0.2 }}
              >
                <Icon size={32} strokeWidth={2} />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-5 rounded-lg px-3 py-1 text-[10px] font-black tracking-[0.16em] uppercase"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: isDark ? theme.dotColor : theme.dotColor,
            }}
          >
            {theme.label}
          </motion.div>
        </div>

        <div style={{ height: 1, background: divider }} />

        <div className="flex flex-col items-center px-6 pb-6 pt-5">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="text-center text-[16px] font-black leading-snug"
            style={{ color: titleColor }}
          >
            {toast.title}
          </motion.p>

          {toast.description && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-2 text-center text-sm leading-relaxed"
              style={{ color: descColor }}
            >
              {toast.description}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            whileHover={{ scale: 1.03, boxShadow: theme.btnShadow }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onDismiss(toast.id)}
            className="mt-5 w-full rounded-2xl py-3 text-sm font-bold"
            style={{ background: theme.btnBg, color: theme.btnBg === "#C3F84A" ? "#1C2B33" : "#FFFFFF", boxShadow: `0 6px 20px ${theme.blob1}` }}
          >
            Tutup
          </motion.button>
        </div>

        <div
          className="h-1 w-full overflow-hidden"
          style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
        >
          <div
            className="h-full origin-left"
            style={{
              background: theme.bar,
              animation: `toast-shrink ${toast.duration}ms linear forwards`,
              animationPlayState: paused ? "paused" : "running",
            }}
            onAnimationEnd={handleEnd}
          />
        </div>
      </div>
    </motion.div>
  );
}

function ConfirmDialog({ item, onClose }: { item: ConfirmItem; onClose: (val: boolean) => void }) {
  const isDark = useDarkMode();

  const cardBg     = isDark ? "#1C2B33" : "#ffffff";
  const titleColor = isDark ? "#F1F5F8" : "#1C2B33";
  const descColor  = isDark ? "#94a3b8" : "#64748b";
  const divider    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const cancelBg   = isDark ? "rgba(255,255,255,0.08)" : "#F1F5F8";
  const cancelText = isDark ? "#94a3b8" : "#64748b";
  const headerBg   = isDark ? "rgba(255,255,255,0.03)" : "#FEE9EA";

  const dots = [
    { x: -50, y: -46, delay: 0.1,  size: 7 },
    { x:  52, y: -42, delay: 0.18, size: 5 },
    { x: -56, y:  14, delay: 0.25, size: 6 },
    { x:  54, y:  16, delay: 0.14, size: 4 },
    { x: -20, y:  54, delay: 0.30, size: 5 },
    { x:  24, y:  52, delay: 0.22, size: 7 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.80, y: 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.88, y: 16, filter: "blur(4px)", transition: { duration: 0.22 } }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
      className="relative w-full max-w-sm select-none"
    >
      <motion.div
        animate={{ opacity: [0.5, 0.16, 0.5], scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -inset-4 -z-10 rounded-4xl blur-2xl"
        style={{ background: "rgba(239,68,68,0.24)" }}
      />

      <div
        className="relative overflow-hidden rounded-[1.75rem]"
        style={{
          background: cardBg,
          boxShadow: isDark
            ? "0 28px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)"
            : "0 28px 64px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        <div
          className="relative flex flex-col items-center overflow-hidden pb-6 pt-10"
          style={{ background: headerBg }}
        >
          <motion.div
            animate={{ scale: [1, 1.22, 1], opacity: [0.6, 0.25, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ width: 160, height: 160, background: "rgba(239,68,68,0.22)" }}
          />

          <div className="relative flex items-center justify-center">
            {dots.map((d, i) => (
              <FloatingDot key={i} color="#EF4444" x={d.x} y={d.y} delay={d.delay} size={d.size} />
            ))}

            <motion.div
              animate={{ scale: [1, 1.55, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute rounded-full"
              style={{ width: 108, height: 108, background: "rgba(239,68,68,0.10)" }}
            />
            <motion.div
              animate={{ scale: [1, 1.32, 1], opacity: [0.55, 0.1, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute rounded-full"
              style={{ width: 84, height: 84, background: "rgba(239,68,68,0.16)" }}
            />

            <motion.div
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 13, stiffness: 260, delay: 0.1 }}
              className="relative z-10 flex h-17 w-17 items-center justify-center rounded-2xl text-white"
              style={{
                background: "#EF4444",
                boxShadow: "0 16px 40px rgba(239,68,68,0.55)",
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 1.0, delay: 0.28, ease: "easeInOut" }}
                className="absolute inset-0 rounded-2xl bg-white"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 360, delay: 0.2 }}
              >
                <AlertOctagon size={32} strokeWidth={2} />
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-5 rounded-lg px-3 py-1 text-[10px] font-black tracking-[0.16em] uppercase"
            style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.10)",
              color: "#EF4444",
            }}
          >
            Konfirmasi
          </motion.div>
        </div>

        <div style={{ height: 1, background: divider }} />

        <div className="flex flex-col items-center px-6 pb-6 pt-5">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="text-center text-[16px] font-black leading-snug"
            style={{ color: titleColor }}
          >
            {item.message}
          </motion.p>

          {item.description && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-2 text-center text-sm leading-relaxed"
              style={{ color: descColor }}
            >
              {item.description}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mt-5 flex w-full gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => onClose(false)}
              className="flex-1 rounded-2xl py-3 text-sm font-bold transition-colors"
              style={{ background: cancelBg, color: cancelText }}
            >
              Batal
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 10px 28px rgba(239,68,68,0.50)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onClose(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
              style={{
                background: "#EF4444",
                boxShadow: "0 6px 20px rgba(239,68,68,0.40)",
              }}
            >
              <Trash2 size={14} />
              {item.confirmLabel ?? "Ya, Hapus"}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts,   setToasts]   = useState<ToastItem[]>([]);
  const [confirms, setConfirms] = useState<ConfirmItem[]>([]);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (type: ToastType, title: string, description?: string, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts([{ id, type, title, description, duration, createdAt: new Date() }]);
    },
    [],
  );

  const confirm = useCallback(
    (message: string, description?: string, confirmLabel?: string): Promise<boolean> =>
      new Promise((resolve) => {
        const id = `confirm-${Date.now()}`;
        setConfirms((prev) => [...prev, { id, message, description, confirmLabel, resolve }]);
      }),
    [],
  );

  const closeConfirm = useCallback((id: string, val: boolean) => {
    setConfirms((prev) => {
      const item = prev.find((c) => c.id === id);
      item?.resolve(val);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const ctx: ToastContextValue = {
    success: (t, d, dur) => add("success", t, d, dur),
    error:   (t, d, dur) => add("error",   t, d, dur),
    warning: (t, d, dur) => add("warning", t, d, dur),
    info:    (t, d, dur) => add("info",    t, d, dur),
    dismiss,
    confirm,
  };

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      {mounted && createPortal(
        <>
          <AnimatePresence>
            {toasts.length > 0 && (
              <motion.div
                key="toast-bd"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-9998 bg-black/30 backdrop-blur-[3px]"
                onClick={() => dismiss(toasts[0].id)}
              />
            )}
          </AnimatePresence>

          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-0 z-9999 flex items-center justify-center p-4"
          >
            <AnimatePresence mode="wait">
              {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto w-full max-w-sm">
                  <NotificationCard toast={t} onDismiss={dismiss} />
                </div>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {confirms.length > 0 && (
              <motion.div
                key="confirm-bd"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-9996 bg-black/35 backdrop-blur-[3px]"
                onClick={() => closeConfirm(confirms[confirms.length - 1].id, false)}
              />
            )}
          </AnimatePresence>

          <div className="pointer-events-none fixed inset-0 z-9997 flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {confirms.slice(-1).map((item) => (
                <div key={item.id} className="pointer-events-auto w-full max-w-sm">
                  <ConfirmDialog item={item} onClose={(val) => closeConfirm(item.id, val)} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        </>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}
