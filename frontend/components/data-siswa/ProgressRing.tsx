"use client";

import { motion } from "framer-motion";

export function ProgressRing({ percent, size = 32 }: { percent: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 70 ? "#00D67F" : percent >= 40 ? "#C3F84A" : "#EF4444";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={3} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-slate-700 dark:text-white"
        style={{ fontSize: size <= 32 ? 9 : 11 }}
      >
        {percent}%
      </span>
    </div>
  );
}
