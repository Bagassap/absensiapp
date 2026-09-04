import { CheckCircle2, Circle } from "lucide-react";

export function StatusBadge({ sudahAbsen }: { sudahAbsen: boolean }) {
  if (!sudahAbsen) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        <Circle size={10} />
        Belum Absen
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold"
      style={{ backgroundColor: "#E3FBF0", color: "#00D67F" }}
    >
      <CheckCircle2 size={10} />
      Sudah Absen
    </span>
  );
}
