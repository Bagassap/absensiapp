"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = { diikuti: number; belum: number; total: number };

// Radial progress chart untuk statistik absensi kegiatan guru — pola sama
// dengan "Statistik Absensi" pada absensi harian siswa (lmspplg), diskalakan
// ke 2 kategori sesuai model kegiatan kita (bukan Hadir/Sakit/Izin/Alpha):
// Diikuti (hijau) vs Belum Diikuti (merah).
export function StatistikAbsensiChart({ diikuti, belum, total }: Props) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const diikutiPct = pct(diikuti);
  const belumPct = pct(belum);

  const LEGEND = [
    { label: "Diikuti", color: "#00C853", pct: diikutiPct, val: diikuti },
    { label: "Belum Diikuti", color: "#EF4444", pct: belumPct, val: belum },
  ];

  const options: ApexOptions = {
    chart: { type: "radialBar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: "40%", background: "transparent" },
        track: { background: "#F1F5F8", strokeWidth: "100%", margin: 8 },
        dataLabels: {
          show: true,
          name: { show: false },
          value: { show: false },
          total: {
            show: true,
            label: "Diikuti",
            fontSize: "11px",
            fontWeight: 500,
            color: "#94a3b8",
            formatter: () => `${diikutiPct}%`,
          },
        },
      },
    },
    colors: ["#00C853", "#EF4444"],
    labels: ["Diikuti", "Belum Diikuti"],
    stroke: { lineCap: "round" },
    legend: { show: false },
    tooltip: { enabled: false },
    responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
  };

  return (
    <div>
      <div className="-mb-4">
        <Chart options={options} series={[diikutiPct, belumPct]} type="radialBar" height={240} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5 px-2">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                {l.label} ({l.pct}%)
              </span>
            </div>
            <span className="text-[12px] font-semibold text-slate-800 dark:text-white">{l.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
