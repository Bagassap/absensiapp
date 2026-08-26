"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type PropsType = { hadir: number; tidakHadir: number; total: number };

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function KehadiranDonutApex({ hadir, tidakHadir }: PropsType) {
  const chartOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    colors: ["#0082FB", "#00D67F", "#C3F84A", "#EF4444"],
    labels: ["Hadir", "Sakit", "Izin", "Alpha"],
    legend: {
      show: true,
      position: "bottom",
      itemMargin: { horizontal: 10, vertical: 5 },
      formatter: (legendName, opts) => {
        const pct = opts?.w?.globals?.seriesPercent?.[opts.seriesIndex];
        return `${legendName}: ${typeof pct === "number" ? pct.toFixed(1) : "0"}%`;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "80%",
          background: "transparent",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "Kehadiran",
              fontSize: "16px",
              fontWeight: "400",
            },
            value: { show: true, fontSize: "28px", fontWeight: "bold" },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    responsive: [
      { breakpoint: 2600, options: { chart: { width: 415 } } },
      { breakpoint: 640,  options: { chart: { width: "100%" } } },
      { breakpoint: 370,  options: { chart: { width: 260 } } },
    ],
  };

  const sakit = Math.round(tidakHadir * 0.3);
  const izin  = Math.round(tidakHadir * 0.4);
  const alpha = tidakHadir - sakit - izin;

  return (
    <Chart
      options={chartOptions}
      series={[hadir, sakit, izin, alpha < 0 ? 0 : alpha]}
      type="donut"
    />
  );
}
