"use client";

import { BellRing, BellOff, Loader2 } from "lucide-react";
import { useWebPush } from "@/lib/webPush";
import { useToast } from "@/components/shared/ToastSystem";

export function PushToggle() {
  const { state, busy, enable, disable } = useWebPush();
  const toast = useToast();

  if (state === "loading" || state === "unsupported") return null;

  async function onEnable() {
    const err = await enable();
    if (err) toast.error("Notifikasi perangkat", err);
    else toast.success("Notifikasi perangkat aktif", "");
  }

  if (state === "denied") {
    return (
      <p className="border-b border-gray-200 px-4 py-2.5 text-[11px] text-gray-400 dark:border-slate-700 dark:text-slate-500">
        Notifikasi diblokir di browser. Izinkan lewat pengaturan situs untuk menerima pengingat absen.
      </p>
    );
  }

  const on = state === "on";

  return (
    <button
      type="button"
      onClick={on ? disable : onEnable}
      disabled={busy}
      className="flex w-full items-center gap-2.5 border-b border-gray-200 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-700/40"
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin text-gray-400" />
      ) : on ? (
        <BellRing size={14} className="text-[#00C853]" />
      ) : (
        <BellOff size={14} className="text-gray-400" />
      )}
      <span className="flex-1 text-[12px] font-medium text-gray-700 dark:text-slate-200">
        {on ? "Notifikasi perangkat aktif" : "Aktifkan notifikasi di perangkat ini"}
      </span>
      <span className="text-[10px] font-bold text-gray-400">{on ? "Matikan" : "Aktifkan"}</span>
    </button>
  );
}
