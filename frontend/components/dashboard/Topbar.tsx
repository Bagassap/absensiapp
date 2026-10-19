"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, ChevronDown, LogOut, Sun, Moon,
  UserCircle, CheckCircle2, Info, AlertTriangle,
  CheckCheck, Clock,
} from "lucide-react";
import type { UserPayload } from "@/lib/auth";
import { timeAgo } from "@/components/dashboard/ActivityList";
import { Avatar } from "@/components/shared/Avatar";
import { ProfilSayaModal } from "@/components/shared/ProfilSayaModal";
import { LiveClock } from "@/components/shared/LiveClock";
import { useTheme } from "@/lib/theme";
import { PushToggle } from "@/components/shared/PushToggle";


const PAGE_TITLES: Record<string, [string, string]> = {
  dashboard:        ["Dashboard",       "Ringkasan aktivitas Anda"],
  "absensi-harian": ["Absensi Kegiatan",  "Presensi kehadiran per kegiatan"],
  "absensi-saya":   ["Absensi Saya",    "Catat kehadiran Anda untuk kegiatan hari ini"],
  "data-guru":      ["Data Guru",       "Kelola akun dan status guru"],
  profil:           ["Profil Saya",     "Informasi dan pengaturan akun"],
  notifikasi:       ["Notifikasi",      "Pemberitahuan terbaru"],
};

function getPageInfo(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  const info = PAGE_TITLES[last];
  return info
    ? { title: info[0], subtitle: info[1] }
    : {
        title: last.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        subtitle: "",
      };
}


type NotifType = "info" | "success" | "warning" | "error";
type ApiNotifType = "ABSENSI" | "SISTEM";
type ApiNotification = {
  id: string;
  title: string;
  message: string;
  type: ApiNotifType;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

const NOTIF_TYPE_STYLE: Record<ApiNotifType, NotifType> = {
  ABSENSI: "success",
  SISTEM:  "error",
};

const NOTIF_STYLE: Record<NotifType, { bg: string; color: string }> = {
  info:    { bg: "#FFF7E4", color: "#000000" },
  success: { bg: "#E3FBF0", color: "#00D67F" },
  warning: { bg: "#EFFEEC", color: "#000000" },
  error:   { bg: "#FEE9EA", color: "#EF4444" },
};

const NOTIF_ICON: Record<NotifType, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   AlertTriangle,
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrator", GURU: "Guru" };

const BRAND_ACCENT = "#00C853";


export function Topbar({ user, mobileHidden = false }: { user: UserPayload; mobileHidden?: boolean }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = getPageInfo(pathname);
  const { isDark, toggle: toggleTheme } = useTheme();
  const isHome = pathname === "/admin/dashboard" || pathname === "/guru/absensi-harian";

  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifications,  setNotifications]  = useState<ApiNotification[]>([]);
  const [notifLoading,   setNotifLoading]   = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function handleSessionExpired() {
    window.location.href = "/login";
  }

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (res.status === 401) { handleSessionExpired(); return; }
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count ?? 0);
    } catch {  }
  }

  async function fetchNotifications() {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10", { cache: "no-store" });
      if (res.status === 401) { handleSessionExpired(); return; }
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.items ?? []);
    } finally { setNotifLoading(false); }
  }

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen]);

  useEffect(() => {
    const openNotif = () => setNotifOpen(true);
    const openProfil = () => setProfilOpen(true);
    window.addEventListener("app:open-notif", openNotif);
    window.addEventListener("app:open-profil", openProfil);
    return () => {
      window.removeEventListener("app:open-notif", openNotif);
      window.removeEventListener("app:open-profil", openProfil);
    };
  }, []);

  async function markAllRead() {
    setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  async function handleNotifClick(n: ApiNotification) {
    if (!n.isRead) {
      setNotifications((p) => p.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    if (n.link) {
      setNotifOpen(false);
      const prefix = `/${user.role.toLowerCase()}`;
      router.push(n.link.startsWith(prefix) ? n.link : `${prefix}${n.link}`);
    }
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profilOpen, setProfilOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  async function handleLogout() {
    sessionStorage.removeItem("lms_session");
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }


  return (
    <>
      <header className={`sticky top-0 z-30 flex items-center gap-3 rounded-b-[28px] bg-[#013920] px-4 py-4 shadow-[0_10px_24px_-10px_rgba(1,57,32,0.6)] transition-colors duration-200 lg:rounded-none lg:bg-white lg:px-5 lg:py-5 lg:shadow-[0_1px_4px_rgba(0,0,0,0.08)] dark:lg:bg-slate-900 2xl:px-10 ${mobileHidden ? "max-lg:hidden" : ""}`}>
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#012A18" }}>
            <Image src="/PPLG.png" alt="Absensi Guru" width={18} height={22} className="h-5 w-auto" />
          </div>
          <span className="truncate text-base font-bold text-white">
            {isHome ? `Hi, ${user.nama.split(" ")[0]} 👋` : title}
          </span>
        </div>

        <div className="hidden xl:block">
          <h1 className="mb-0.5 text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h1>
          {subtitle && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className="flex-1" />

        <div className="hidden lg:block"><LiveClock variant="topbar" /></div>

        <div className="contents lg:flex lg:items-center lg:gap-2">

          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Mode terang" : "Mode gelap"}
            aria-label={isDark ? "Mode terang" : "Mode gelap"}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white lg:flex"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                if (window.matchMedia("(max-width: 1023px)").matches) router.push(`/${user.role.toLowerCase()}/notifikasi`);
                else setNotifOpen((v) => !v);
              }}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 lg:bg-slate-100 lg:text-slate-500 lg:hover:bg-slate-200 lg:hover:text-slate-700 dark:lg:bg-slate-700/50 dark:lg:text-slate-400 dark:lg:hover:bg-slate-700 dark:lg:hover:text-white"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F26A3D] text-[8px] font-bold text-white ring-2 ring-[#013920] lg:bg-red-500 lg:ring-white dark:lg:ring-slate-900">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-x-3 top-[4.75rem] z-50 overflow-hidden rounded-3xl border border-transparent bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30 lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-80 lg:rounded-[10px] lg:border-gray-200 lg:shadow-xl lg:shadow-gray-200/60"
                >
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Notifikasi</p>
                      {unreadCount > 0 && (
                        <p className="text-[11px] text-gray-400 dark:text-slate-400">{unreadCount} belum dibaca</p>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary/20"
                      >
                        <CheckCheck size={10} />
                        Tandai semua
                      </button>
                    )}
                  </div>

                  <PushToggle />

                  <div className="max-h-80 overflow-y-auto">
                    {notifLoading ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <p className="text-[12px] text-gray-400 dark:text-slate-500">Memuat...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <Bell size={22} className="text-gray-300 dark:text-slate-600" />
                        <p className="text-[12px] text-gray-400 dark:text-slate-500">Belum ada notifikasi</p>
                      </div>
                    ) : notifications.map((n) => {
                      const style = NOTIF_STYLE[NOTIF_TYPE_STYLE[n.type]];
                      const NIcon = NOTIF_ICON[NOTIF_TYPE_STYLE[n.type]];
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                            !n.isRead ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                          }`}
                        >
                          <div
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${style.color}22` }}
                          >
                            <NIcon size={14} style={{ color: style.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className={`text-[12px] font-semibold ${n.isRead ? "text-gray-600 dark:text-slate-500" : "text-gray-900 dark:text-white"}`}>
                                {n.title}
                              </p>
                              {!n.isRead && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: style.color }} />
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-slate-400">{n.message}</p>
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-600">
                              <Clock size={9} />
                              {timeAgo(n.createdAt)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="relative flex items-center gap-2 rounded-full shadow-[0_0_0_2px_#fff] transition-colors lg:rounded-xl lg:bg-slate-100 lg:py-1.5 lg:pl-1.5 lg:pr-3 lg:shadow-none lg:hover:bg-slate-200 dark:lg:bg-slate-700/50 dark:lg:hover:bg-slate-700"
            >
              <Avatar
                src={user.fotoProfil}
                nama={user.nama}
                sizePx={36}
                fallbackBg="#00C853"
                textClassName="text-[11px] font-bold"
              />
              <span className="hidden text-sm font-medium text-gray-700 dark:text-slate-200 lg:block">
                {user.nama.split(" ")[0]}
              </span>
              <ChevronDown
                size={13}
                className={`hidden shrink-0 text-gray-400 transition-transform duration-200 dark:text-slate-400 lg:block ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-3xl border border-transparent lg:rounded-[10px] lg:border-gray-200 bg-white py-2 shadow-xl shadow-gray-200/60 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30"
                >
                  <div className="mb-1 border-b border-gray-200 px-4 pb-3 pt-1 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.nama}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">{ROLE_LABEL[user.role]}</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50 lg:hidden"
                  >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    {isDark ? "Mode Terang" : "Mode Gelap"}
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setProfilOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
                  >
                    <UserCircle size={14} />
                    Profil Saya
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut size={14} />
                    Keluar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {profilOpen && <ProfilSayaModal onClose={() => setProfilOpen(false)} />}
    </>
  );
}
