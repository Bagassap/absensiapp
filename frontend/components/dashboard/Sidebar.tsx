"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  X, LayoutDashboard,
  ChevronRight,
  ChevronsLeft, ChevronsRight,
  ClipboardCheck, UserCheck, Users, Bell,
} from "lucide-react";
import type { UserPayload } from "@/lib/auth";
import { Avatar } from "@/components/shared/Avatar";

type MenuItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
};

const MENUS: Record<string, MenuItem[]> = {
  ADMIN: [
    { key: "dashboard",      href: "/admin/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
    { key: "absensi-harian", href: "/admin/absensi-harian", label: "Absensi Kegiatan", icon: ClipboardCheck },
    { key: "absensi-saya",   href: "/admin/absensi-saya",   label: "Absensi Saya",    icon: UserCheck },
    { key: "data-guru",      href: "/admin/data-guru",      label: "Data Guru",       icon: Users },
    { key: "notifikasi",     href: "/admin/notifikasi",     label: "Notifikasi",      icon: Bell },
  ],
  GURU: [
    { key: "absensi-harian", href: "/guru/absensi-harian", label: "Absensi Kegiatan", icon: ClipboardCheck },
    { key: "notifikasi",     href: "/guru/notifikasi",     label: "Notifikasi",       icon: Bell },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  GURU:  "Guru",
};

const SIDEBAR_ACCENT = "#00C853";

const TOGGLE_BTN_CLASS =
  "flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/15 dark:hover:text-white";

const SIDEBAR_TAGLINE = "Mendidik dengan Keteladanan";

export function Sidebar({
  user, open, collapsed, onClose, onToggleCollapse,
}: {
  user: UserPayload;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();

  const items: MenuItem[] = MENUS[user.role] ?? [];

  const PRIMARY  = SIDEBAR_ACCENT;
  const greeting = SIDEBAR_TAGLINE;

  function isItemActive(item: MenuItem): boolean {
    const matches = (i: MenuItem) => pathname === i.href || pathname.startsWith(i.href + "/");
    if (!matches(item)) return false;
    return !items.some((o) => o !== item && o.href.length > item.href.length && matches(o));
  }

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white transition-all duration-300 ease-in-out",
        "shadow-[4px_0_24px_rgba(0, 200, 83,0.08)] dark:bg-slate-900 dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)]",
        collapsed ? "w-18" : "w-64",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      style={{ "--color-primary": PRIMARY } as React.CSSProperties}
    >

      <div
        className={[
          "flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-white/6",
          collapsed ? "justify-center" : "justify-between px-5",
        ].join(" ")}
      >
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Buka sidebar"
            className={`h-9 w-9 ${TOGGLE_BTN_CLASS}`}
          >
            <ChevronsRight size={18} />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-md shadow-blue-900/25 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/10"
                style={{ background: "#FFF7E4" }}
              >
                <Image src="/PPLG.png" alt="Absensi" width={20} height={20} className="h-4.5 w-auto" />
              </div>
              <span className="flex items-baseline gap-1">
                <span className="text-[17px] font-black tracking-tight text-[#000000]">
                  Absensi
                </span>
                <span className="text-[11px] font-bold tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  {user.role}
                </span>
              </span>
            </div>

            <button
              onClick={onClose}
              title="Tutup sidebar"
              className={`h-8 w-8 ${TOGGLE_BTN_CLASS} lg:hidden`}
            >
              <X size={16} />
            </button>

            <button
              onClick={onToggleCollapse}
              title="Sembunyikan sidebar"
              className={`hidden h-8 w-8 ${TOGGLE_BTN_CLASS} lg:flex`}
            >
              <ChevronsLeft size={18} />
            </button>
          </>
        )}
      </div>

      <div className="border-b border-slate-100 dark:border-white/6">
        {collapsed ? (
          <div className="flex justify-center py-3" title={user.nama}>
            <Avatar
              src={user.fotoProfil}
              nama={user.nama}
              sizePx={40}
              fallbackBg={SIDEBAR_ACCENT}
              textClassName="text-sm font-extrabold"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center px-5 pb-5 pt-6">
            <div
              className="mb-3 rounded-full ring-4 ring-offset-2 dark:ring-offset-slate-900"
              style={{ "--tw-ring-color": `${PRIMARY}40` } as React.CSSProperties}
            >
              <Avatar
                src={user.fotoProfil}
                nama={user.nama}
                sizePx={64}
                fallbackBg={SIDEBAR_ACCENT}
                textClassName="text-2xl font-extrabold"
              />
            </div>
            <p className="text-[15px] font-bold text-slate-800 dark:text-white">
              Hello, {user.nama.split(" ")[0]}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-300">
              {ROLE_LABEL[user.role]} · SMK Ma&apos;arif
            </p>
            <p className="mt-2 rounded-lg bg-[#00C853]/[0.08] px-3 py-1 text-[10px] font-medium italic text-[#000000] dark:bg-white/10 dark:text-[#000000]">
              &ldquo;{greeting}&rdquo;
            </p>
          </div>
        )}
      </div>

      <nav className={["flex-1 overflow-y-auto", collapsed ? "px-2 py-1" : "px-3 py-1"].join(" ")}>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = isItemActive(item);

            if (collapsed) {
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className="relative flex h-11 w-full items-center justify-center rounded-xl transition-all duration-200"
                  >
                    {active && (
                      <motion.div
                        layoutId="c-pill"
                        className="absolute inset-0 rounded-xl bg-primary/10"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    {!active && (
                      <span className="absolute inset-0 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06]" />
                    )}
                    <span
                      className={[
                        "relative flex h-7 w-7 items-center justify-center rounded-lg",
                        active ? "bg-[#00C853]" : "",
                      ].join(" ")}
                    >
                      <item.icon size={16} style={{ color: active ? "#fff" : "#94a3b8" }} />
                    </span>
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="relative flex items-center gap-3 rounded-xl px-2.5 py-2 transition-all duration-200"
                >
                  {active && (
                    <motion.div
                      layoutId="e-pill"
                      className="absolute inset-0 rounded-xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-white/5" />
                  )}

                  <span
                    className={[
                      "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      active ? "bg-[#00C853]" : "",
                    ].join(" ")}
                  >
                    {!active && <span className="absolute inset-0 rounded-xl bg-slate-100 dark:bg-white/[0.07]" />}
                    <item.icon size={16} className="relative" style={{ color: active ? "#fff" : "#64748b" }} />
                  </span>

                  <span
                    className={[
                      "relative flex-1 text-[13px] font-semibold",
                      active ? "text-[#000000] dark:text-white" : "text-slate-700 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>

                  <ChevronRight
                    size={13}
                    className={active ? "relative shrink-0 text-[#000000] dark:text-white" : "relative shrink-0 text-slate-300"}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-slate-100 px-5 py-4 dark:border-white/6">
          <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-600">
            Absensi Guru — SMK Ma&apos;arif NU 01 Limpung
          </p>
          <p className="mt-0.5 text-[10px] text-slate-300 dark:text-slate-700">
            © 2024 All Rights Reserved
          </p>
        </div>
      )}
    </aside>
  );
}
