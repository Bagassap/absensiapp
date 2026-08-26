"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Props = { hadir: number; sakit: number; izin: number; alpha: number; total: number };

export function StatisticRainbow({ hadir, sakit, izin, alpha, total }: Props) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const hadirPct = pct(hadir);
  const sakitPct = pct(sakit);
  const izinPct  = pct(izin);
  const alphaPct = pct(alpha);

  const LEGEND = [
    { label: "Hadir",  color: "#0082FB", pct: hadirPct, val: hadir },
    { label: "Sakit",  color: "#00D67F", pct: sakitPct, val: sakit },
    { label: "Izin",   color: "#C3F84A", pct: izinPct,  val: izin },
    { label: "Alpha",  color: "#EF4444", pct: alphaPct, val: alpha },
  ];

  const options: ApexOptions = {
    chart: { type: "radialBar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          size: "30%",
          background: "transparent",
        },
        track: {
          background: "#F1F5F8",
          strokeWidth: "100%",
          margin: 6,
        },
        dataLabels: {
          show: true,
          name: { show: false },
          value: { show: false },
          total: {
            show: true,
            label: "Hadir",
            fontSize: "11px",
            fontWeight: 500,
            color: "#94a3b8",
            formatter: () => `${hadirPct}%`,
          },
        },
      },
    },
    colors: ["#0082FB", "#00D67F", "#C3F84A", "#EF4444"],
    series: [hadirPct, sakitPct, izinPct, alphaPct],
    labels: ["Hadir", "Sakit", "Izin", "Alpha"],
    stroke: { lineCap: "round" },
    legend: { show: false },
    tooltip: { enabled: false },
    responsive: [{ breakpoint: 480, options: { chart: { height: 220 } } }],
  };

  return (
    <div>
      <div className="-mb-4">
        <Chart options={options} series={[hadirPct, sakitPct, izinPct, alphaPct]} type="radialBar" height={260} />
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
