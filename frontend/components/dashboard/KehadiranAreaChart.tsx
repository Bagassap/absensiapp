"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type WeeklyItem = { hari: string; hadir: number; total: number };
type PropsType = { data: WeeklyItem[] };

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function KehadiranAreaChart({ data }: PropsType) {
  const options: ApexOptions = {
    legend: { show: false },
    colors: ["#0082FB", "#C3F84A"],
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      zoom: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: { type: "solid", opacity: 1 },
    grid: {
      strokeDashArray: 5,
      borderColor: "#F1F5F8",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      shared: true,
      intersect: false,
      marker: { show: true },
    },
    xaxis: {
      categories: data.map((d) => d.hari),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: "#94a3b8" } },
    },
    yaxis: {
      labels: { style: { fontSize: "11px", colors: "#94a3b8" } },
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: "#fff",
      hover: { size: 6 },
    },
    responsive: [
      { breakpoint: 1024, options: { chart: { height: 280 } } },
    ],
  };

  return (
    <div className="-ml-4 -mr-4">
      <Chart
        options={options}
        series={[
          { name: "Hadir",       data: data.map((d) => d.hadir) },
          { name: "Total Siswa", data: data.map((d) => d.total) },
        ]}
        type="line"
        height={310}
      />
    </div>
  );
}
