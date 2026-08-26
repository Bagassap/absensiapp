"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface DonutChartProps {
  value: number;       
  color: string;
  trackColor?: string;
  size?: number;       
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  labelSize?: string;
  sublabelSize?: string;
}

export function DonutChart({
  value,
  color,
  trackColor,
  size = 120,
  strokeWidth = 12,
  label,
  sublabel,
  labelSize = "15px",
  sublabelSize = "10px",
}: DonutChartProps) {
  const r      = (size - strokeWidth) / 2;
  const cx     = size / 2;
  const circ   = 2 * Math.PI * r;

  const mv      = useMotionValue(0);
  const dashArr = useTransform(mv, (v) => `${(v / 100) * circ} ${circ}`);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ctrl = animate(mv, value, { duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] });
    return () => ctrl.stop();
  }, [mv, value]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={trackColor ?? "currentColor"}
          strokeWidth={strokeWidth}
          className="text-gray-100 dark:text-slate-700"
        />
        <motion.circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDashoffset={0}
          style={{ strokeDasharray: dashArr }}
        />
      </svg>
      {(label !== undefined) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: labelSize }} className="font-extrabold tabular-nums text-gray-800 dark:text-white leading-none">
            {label}
          </span>
          {sublabel && (
            <span style={{ fontSize: sublabelSize }} className="mt-0.5 text-gray-400 dark:text-slate-500">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface VBarItem {
  label: string;
  hadir: number;
  total: number;
  color: string;
}

export function VBarChart({ data, height = 120 }: { data: VBarItem[]; height?: number }) {
  const peak = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex items-end justify-around gap-2 pt-1">
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.total / peak) * height), 4);
        const pct   = d.total > 0 ? (d.hadir / d.total) * 100 : 0;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold tabular-nums text-gray-600 dark:text-slate-300">
              {d.hadir}
            </span>
            <div
              className="relative w-full overflow-hidden rounded-t-lg"
              style={{ height: barH, backgroundColor: d.color + "25" }}
            >
              <motion.div
                className="absolute inset-x-0 bottom-0 rounded-t-lg"
                style={{ backgroundColor: d.color }}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface BarItem {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  data: BarItem[];
  max?: number;
  barHeight?: number;
}

export function BarChart({ data, max, barHeight = 20 }: BarChartProps) {
  const peak = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span className="w-8 shrink-0 text-right text-[10px] font-semibold text-gray-400 dark:text-slate-500">
            {item.label}
          </span>
          <div
            className="relative flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700"
            style={{ height: barHeight }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / peak) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="w-6 shrink-0 text-left text-[11px] font-bold tabular-nums text-gray-600 dark:text-slate-300">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface AreaLineItem {
  label: string;
  hadir: number;
  total: number;
}

export function AreaLineChart({
  data,
  color = "#0082FB",
  height = 300,
  showValueLabels = false,
}: {
  data: AreaLineItem[];
  color?: string;
  height?: number;
  showValueLabels?: boolean;
}) {
  const W = 560;
  const H = height;
  const PAD = { top: 32, right: 20, bottom: 40, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const rawMax = Math.max(...data.map((d) => d.total), 1);
  const maxVal = Math.ceil(rawMax / 10) * 10 || 10;
  const n = data.length;

  function xOf(i: number) {
    return PAD.left + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW);
  }
  function yOf(v: number) {
    return PAD.top + cH - (v / maxVal) * cH;
  }

  function curvePath(pts: { x: number; y: number }[]) {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
      d += ` C ${cpx} ${pts[i - 1].y.toFixed(1)} ${cpx} ${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    return d;
  }

  const hadirPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.hadir) }));
  const totalPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.total) }));

  const hadirLine = curvePath(hadirPts);
  const totalLine = curvePath(totalPts);

  const bottomY = (PAD.top + cH).toFixed(1);
  const firstX = hadirPts[0]?.x.toFixed(1) ?? "0";
  const lastX = hadirPts[hadirPts.length - 1]?.x.toFixed(1) ?? "0";
  const areaFill = hadirLine + ` L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

  const gradId = `areaGrad${color.replace("#", "")}`;
  const glowId = `glow${color.replace("#", "")}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height }} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
          <stop offset="75%"  stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + cH}
        stroke="currentColor" strokeWidth={1} className="text-slate-200 dark:text-slate-700" />

      {yTicks.map((f) => {
        const y = (PAD.top + cH * (1 - f)).toFixed(1);
        const val = Math.round(maxVal * f);
        return (
          <g key={f}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke="currentColor"
              strokeWidth={f === 0 || f === 1 ? 1 : 0.6}
              strokeDasharray={f === 0 || f === 1 ? "0" : "5 5"}
              className="text-slate-100 dark:text-slate-700/60" />
            <text x={PAD.left - 8} y={parseFloat(y) + 4}
              textAnchor="end" fontSize={11} fontWeight="600" fill="currentColor"
              className="text-slate-400 dark:text-slate-500">{val}</text>
          </g>
        );
      })}

      {totalLine && (
        <path d={totalLine} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="6 4"
          className="text-slate-300 dark:text-slate-600" />
      )}

      {hadirLine && <path d={areaFill} fill={`url(#${gradId})`} />}

      {hadirLine && (
        <path d={hadirLine} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`} />
      )}

      {hadirPts.map((p, i) => {
        const val = data[i].hadir;
        const cx = parseFloat(p.x.toFixed(1));
        const cy = parseFloat(p.y.toFixed(1));
        const labelY = cy - 16;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.14} />
            <circle cx={cx} cy={cy} r={5} fill="white" stroke={color} strokeWidth={2.5}
              className="dark:fill-[#1C2B33]" />
            {showValueLabels && (
              <g>
                <rect x={cx - 17} y={labelY - 12} width={34} height={16} rx={5}
                  fill="white" fillOpacity={0.92} stroke={color} strokeOpacity={0.25} strokeWidth={1}
                  className="dark:fill-[#1C2B33]" />
                <text x={cx} y={labelY} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>{val}</text>
              </g>
            )}
          </g>
        );
      })}

      {data.map((d, i) => (
        <text key={i} x={xOf(i).toFixed(1)} y={H - 8}
          textAnchor="middle" fontSize={13} fontWeight="700" fill="currentColor"
          className="text-slate-600 dark:text-slate-400">
          {d.label}
        </text>
      ))}
    </svg>
  );
}
