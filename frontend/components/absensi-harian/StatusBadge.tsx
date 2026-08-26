import type { StatusAbsensi } from "./types";
import { STATUS_CFG } from "./shared";

export function StatusBadge({ status }: { status: StatusAbsensi | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        Belum Absen
      </span>
    );
  }
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
      style={{ backgroundColor: cfg.bg, color: cfg.clr }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}
