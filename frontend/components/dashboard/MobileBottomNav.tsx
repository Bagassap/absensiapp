"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CalendarCheck2, UserCheck, Users, Bell, UserCircle } from "lucide-react";
import type { UserPayload } from "@/lib/auth";

type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  href?: string;
  event?: string;
};

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { key: "dashboard", label: "Beranda", icon: Home, href: "/admin/dashboard" },
    { key: "absensi-harian", label: "Kegiatan", icon: CalendarCheck2, href: "/admin/absensi-harian" },
    { key: "absensi-saya", label: "Absen Saya", icon: UserCheck, href: "/admin/absensi-saya" },
    { key: "data-guru", label: "Guru", icon: Users, href: "/admin/data-guru" },
  ],
  GURU: [
    { key: "absensi-harian", label: "Absensi", icon: Home, href: "/guru/absensi-harian" },
    { key: "notifikasi", label: "Notifikasi", icon: Bell, event: "app:open-notif" },
    { key: "profil", label: "Profil", icon: UserCircle, event: "app:open-profil" },
  ],
};

export function MobileBottomNav({ user }: { user: UserPayload }) {
  const pathname = usePathname();
  const items = NAV[user.role] ?? [];

  function isActive(item: NavItem) {
    if (!item.href) return false;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] bg-white px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] dark:bg-slate-900 lg:hidden"
      aria-label="Navigasi utama"
    >
      <ul className="mx-auto flex max-w-md items-end justify-around">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          const inner = (
            <>
              {active && (
                <motion.span
                  layoutId="bottom-nav-marker"
                  className="absolute -top-2 h-1.5 w-6 rounded-full bg-[#00C853]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-[#00C853]/12 text-[#00A844]" : "text-slate-400",
                ].join(" ")}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={["mt-0.5 text-[10px] font-semibold", active ? "text-[#00A844]" : "text-slate-400"].join(" ")}>
                {item.label}
              </span>
            </>
          );
          const cls = "relative flex min-w-16 flex-col items-center py-1";
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={() => window.dispatchEvent(new Event(item.event!))} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
