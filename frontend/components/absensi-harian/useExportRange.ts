"use client";

import { useMemo, useState } from "react";
import { weekRangeFor } from "./shared";
import type { ExportRange, ExportRangeMode } from "./shared";

// Shared by admin/guru so the range-mode toggle and the download buttons —
// rendered in different spots of the filter card grid — can stay in sync
// without either page owning its own copy of this state.
export function useExportRange(tanggal: string) {
  const [rangeMode, setRangeMode] = useState<ExportRangeMode>("harian");
  const [weekAnchor, setWeekAnchor] = useState(tanggal);
  const [bulan, setBulan] = useState(() => Number(tanggal.slice(5, 7)));
  const [tahun, setTahun] = useState(() => Number(tanggal.slice(0, 4)));

  const weekRange = useMemo(() => weekRangeFor(weekAnchor), [weekAnchor]);
  const range: ExportRange = useMemo(() => {
    if (rangeMode === "mingguan") return { mode: "mingguan", tanggalMulai: weekRange.start, tanggalSelesai: weekRange.end };
    if (rangeMode === "bulanan") return { mode: "bulanan", bulan, tahun };
    return { mode: "harian", tanggal };
  }, [rangeMode, weekRange, bulan, tahun, tanggal]);

  return { rangeMode, setRangeMode, weekAnchor, setWeekAnchor, bulan, setBulan, tahun, setTahun, weekRange, range };
}

export type UseExportRangeResult = ReturnType<typeof useExportRange>;
