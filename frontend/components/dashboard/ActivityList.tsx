"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
}

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  stripColor: string;
  title: string;
  description?: string;
  time?: string;       
  badge?: string;
}

export default function ActivityList({
  items,
  emptyText = "Tidak ada data",
}: {
  items: ActivityItem[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">{emptyText}</p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-slate-700/60">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
            className="group flex items-start gap-3 px-1 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/30 rounded-xl"
          >
            <div className="flex shrink-0 items-center self-stretch gap-2">
              <div
                className="w-1 self-stretch rounded-full"
                style={{ backgroundColor: item.stripColor }}
              />
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: item.iconColor + "22" }}
              >
                <Icon size={15} style={{ color: item.iconColor }} />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
                  {item.title}
                </p>
                {item.time && (
                  <span className="shrink-0 text-[10px] text-gray-400 dark:text-slate-500">
                    {timeAgo(item.time)}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-slate-500">
                  {item.description}
                </p>
              )}
              {item.badge && (
                <span
                  className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ backgroundColor: item.stripColor + "22", color: item.stripColor }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
