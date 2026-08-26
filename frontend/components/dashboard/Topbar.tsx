"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, Search, Sun, Moon, Bell, ChevronDown, LogOut, X,
  LayoutDashboard, Calendar, Users, FileText, Briefcase,
  MessageSquare, UserCircle, CheckCircle2, Info, AlertTriangle,
  CheckCheck, Clock,
} from "lucide-react";
import type { UserPayload } from "@/lib/auth";
import { timeAgo } from "@/components/dashboard/ActivityList";
import { Avatar } from "@/components/shared/Avatar";
import { ProfilSayaModal } from "@/components/shared/ProfilSayaModal";
import { LiveClock } from "@/components/shared/LiveClock";


const PAGE_TITLES: Record<string, [string, string]> = {
  dashboard:      ["Dashboard",          "Ringkasan aktivitas Anda"],
  "absensi-harian": ["Absensi Harian",   "Presensi kehadiran harian siswa"],
  pengumuman:     ["Pengumuman",         "Informasi dan pengumuman terkini"],
  "data-siswa":   ["Data Siswa",         "Kelola data seluruh siswa"],
  profil:         ["Profil Saya",        "Informasi dan pengaturan akun"],
  penempatan:     ["Penempatan PKL",     "Data penempatan PKL siswa"],
  absensi:        ["Absensi",            "Data kehadiran"],
  monitoring:     ["Monitoring PKL",     "Pantau perkembangan PKL siswa"],
  rekap:          ["Rekap & Laporan",    "Rekapitulasi dan laporan data PKL"],
  jadwal:         ["Jadwal UKK",         "Jadwal ujian kompetensi keahlian"],
  soal:           ["Soal UKK",           "Berkas soal ujian kompetensi"],
  penilaian:      ["Penilaian UKK",      "Data nilai ujian kompetensi"],
  "nilai-saya":   ["Nilai Saya",         "Hasil ujian kompetensi Anda"],
  magang:         ["PKL",                "Program praktik kerja lapangan"],
  "ujian-ukk":    ["UKK",               "Ujian Kompetensi Keahlian"],
  "jadwal-soal":  ["UKK",   "Kelola jadwal, soal, dan pantau pengumpulan siswa"],
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


type SearchItem = {
  href: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: string[];
};

const SEARCH_ITEMS: SearchItem[] = [
  { href: "/admin/dashboard",            label: "Dashboard",          desc: "Ringkasan aktivitas",           icon: LayoutDashboard, roles: ["ADMIN"] },
  { href: "/admin/absensi-harian",       label: "Absensi Harian",     desc: "Pantau absensi harian siswa",   icon: CheckCircle2,    roles: ["ADMIN"] },
  { href: "/admin/pengumuman",           label: "Pengumuman",         desc: "Kelola pengumuman sekolah",     icon: MessageSquare,   roles: ["ADMIN"] },
  { href: "/admin/data-siswa",           label: "Data Siswa",         desc: "Kelola data siswa",             icon: Users,           roles: ["ADMIN"] },
  { href: "/admin/magang/penempatan",    label: "Penempatan PKL",     desc: "Data penempatan PKL",           icon: Briefcase,       roles: ["ADMIN"] },
  { href: "/admin/magang/absensi",       label: "Absensi PKL",        desc: "Data kehadiran PKL",            icon: CheckCircle2,    roles: ["ADMIN"] },
  { href: "/admin/magang/monitoring",    label: "Monitoring PKL",     desc: "Pantau perkembangan PKL",       icon: Briefcase,       roles: ["ADMIN"] },
  { href: "/admin/magang/rekap",         label: "Rekap & Laporan",    desc: "Rekapitulasi PKL",              icon: FileText,        roles: ["ADMIN"] },
  { href: "/admin/ujian-ukk/jadwal",     label: "Jadwal UKK",         desc: "Jadwal ujian kompetensi",       icon: Calendar,        roles: ["ADMIN"] },
  { href: "/admin/ujian-ukk/soal",       label: "Soal UKK",           desc: "Berkas soal ujian",             icon: FileText,        roles: ["ADMIN"] },
  { href: "/guru/dashboard",             label: "Dashboard",          desc: "Ringkasan aktivitas",           icon: LayoutDashboard, roles: ["GURU"] },
  { href: "/guru/absensi-harian",        label: "Absensi Harian",     desc: "Absensi kelas wali Anda",       icon: CheckCircle2,    roles: ["GURU"] },
  { href: "/guru/pengumuman",            label: "Pengumuman",         desc: "Pengumuman sekolah",            icon: MessageSquare,   roles: ["GURU"] },
  { href: "/guru/data-siswa",            label: "Data Siswa",         desc: "Data siswa",                    icon: Users,           roles: ["GURU"] },
  { href: "/guru/magang/absensi",        label: "Absensi PKL",        desc: "Data kehadiran PKL",            icon: CheckCircle2,    roles: ["GURU"] },
  { href: "/siswa/dashboard",            label: "Dashboard",          desc: "Ringkasan aktivitas",           icon: LayoutDashboard, roles: ["SISWA"] },
  { href: "/siswa/absensi-harian",       label: "Absensi Harian",     desc: "Presensi kehadiran harian",     icon: CheckCircle2,    roles: ["SISWA"] },
  { href: "/siswa/pengumuman",           label: "Pengumuman",         desc: "Pengumuman sekolah",            icon: MessageSquare,   roles: ["SISWA"] },
  { href: "/siswa/profil",               label: "Profil Saya",        desc: "Informasi dan pengaturan akun", icon: UserCircle,      roles: ["SISWA"] },
  { href: "/siswa/magang/absensi",       label: "Absensi PKL",        desc: "Data kehadiran PKL",            icon: CheckCircle2,    roles: ["SISWA"] },
  { href: "/siswa/ujian-ukk/nilai-saya", label: "Nilai Saya",         desc: "Hasil ujian kompetensi",        icon: FileText,        roles: ["SISWA"] },
];


type NotifType = "info" | "success" | "warning" | "error";
type ApiNotifType = "PENGUMUMAN" | "ABSENSI" | "TUGAS" | "MAGANG" | "UKK" | "SISTEM";
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
  PENGUMUMAN: "info",
  ABSENSI:    "success",
  TUGAS:      "warning",
  MAGANG:     "info",
  UKK:        "warning",
  SISTEM:     "error",
};

const NOTIF_STYLE: Record<NotifType, { bg: string; color: string }> = {
  info:    { bg: "#EAF3FF", color: "#0082FB" },
  success: { bg: "#E3FBF0", color: "#00D67F" },
  warning: { bg: "#F4FFD9", color: "#8A9E1F" },
  error:   { bg: "#FEE9EA", color: "#EF4444" },
};

const NOTIF_ICON: Record<NotifType, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   AlertTriangle,
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrator", GURU: "Guru", SISWA: "Siswa" };


export function Topbar({ user, onMenuClick }: { user: UserPayload; onMenuClick: () => void }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { title, subtitle } = getPageInfo(pathname);

  const [isDark, setIsDark] = useState(false);
  const [darkMounted, setDarkMounted] = useState(false);

  useEffect(() => {
    const saved       = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark        = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    setDarkMounted(true);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredSearch = SEARCH_ITEMS.filter(
    (item) =>
      item.roles.includes(user.role) &&
      (searchQuery === "" ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => { setSelectedIdx(0); }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    else { setSearchQuery(""); setSelectedIdx(0); }
  }, [searchOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
        setDropdownOpen(false);
        return;
      }
      if (!searchOpen) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filteredSearch.length - 1)); }
      else if (e.key === "ArrowUp")  { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredSearch[selectedIdx];
        if (item) { setSearchOpen(false); router.push(item.href); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, filteredSearch, selectedIdx]);

  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notifications,  setNotifications]  = useState<ApiNotification[]>([]);
  const [notifLoading,   setNotifLoading]   = useState(false);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Jumlah permintaan reset password yang masih menunggu (dipindah dari
  // header halaman Manajemen Password ke Topbar) — hanya relevan untuk Admin.
  const [pendingResetCount, setPendingResetCount] = useState(0);

  // A 401 here means the session cookie is gone or no longer verifiable (expired,
  // or signed under a JWT_SECRET that's since been rotated) — bounce to /login
  // instead of leaving the badge/dropdown silently and permanently empty with
  // nothing in the UI to explain why.
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

  async function fetchPendingResetCount() {
    try {
      const res = await fetch("/api/users/password-reset-requests", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: { status: string }[] = Array.isArray(data) ? data : [];
      setPendingResetCount(list.filter((r) => r.status === "PENDING").length);
    } catch {  }
  }

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user.role !== "ADMIN") return;
    fetchPendingResetCount();
    const interval = setInterval(fetchPendingResetCount, 30_000);
    return () => clearInterval(interval);
  }, [user.role]);

  useEffect(() => {
    if (notifOpen) fetchNotifications();
  }, [notifOpen]);

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
      router.push(`/${user.role.toLowerCase()}${n.link}`);
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
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-white px-4 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-colors duration-200 dark:bg-[#1C2B33] md:px-5 2xl:px-10">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-700 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="hidden xl:block">
          <h1 className="mb-0.5 text-lg font-bold text-slate-800 dark:text-slate-200">{title}</h1>
          {subtitle && (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className="flex-1" />

        <LiveClock variant="topbar" />

        <div className="flex items-center gap-2">

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-left transition-colors hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 md:flex"
          >
            <Search size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="w-32 text-sm text-slate-500 dark:text-slate-400">Cari sesuatu...</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-600 dark:text-slate-400">
              ⌘K
            </span>
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-700 md:hidden"
          >
            <Search size={16} />
          </button>

          <div className="flex items-center rounded-full bg-slate-100 p-1 dark:bg-slate-700/50">
            <button
              onClick={toggleDark}
              title="Mode terang"
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                darkMounted && !isDark
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sun size={13} />
            </button>
            <button
              onClick={toggleDark}
              title="Mode gelap"
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                darkMounted && isDark
                  ? "bg-slate-600 text-primary shadow-sm dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Moon size={13} />
            </button>
          </div>

          {user.role === "ADMIN" && (
            <button
              onClick={() => router.push("/admin/manajemen-password")}
              title="Permintaan reset password"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <Clock size={16} />
              {pendingResetCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {pendingResetCount > 9 ? "9+" : pendingResetCount}
                </span>
              )}
            </button>
          )}

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700/50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
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
                  className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-xl shadow-gray-200/60 dark:border-slate-700 dark:bg-[#1C2B33] dark:shadow-black/30"
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
              className="flex items-center gap-2 rounded-xl bg-slate-100 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700"
            >
              <Avatar
                src={user.fotoProfil}
                nama={user.nama}
                sizePx={28}
                fallbackBg="#0082FB"
                textClassName="text-[11px] font-bold"
              />
              <span className="hidden text-sm font-medium text-gray-700 dark:text-slate-200 sm:block">
                {user.nama.split(" ")[0]}
              </span>
              <ChevronDown
                size={13}
                className={`shrink-0 text-gray-400 transition-transform duration-200 dark:text-slate-400 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.13 }}
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-[10px] border border-gray-200 bg-white py-2 shadow-xl shadow-gray-200/60 dark:border-slate-700 dark:bg-[#1C2B33] dark:shadow-black/30"
                >
                  <div className="mb-1 border-b border-gray-200 px-4 pb-3 pt-1 dark:border-slate-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.nama}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-400">{ROLE_LABEL[user.role]}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (user.role === "SISWA") router.push("/siswa/profil");
                      else setProfilOpen(true);
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

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />

            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-4 top-20 z-50 overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#1C2B33] sm:left-1/2 sm:right-auto sm:top-24 sm:w-full sm:max-w-lg sm:-translate-x-1/2"
            >
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3.5 dark:border-slate-700">
                <Search size={17} className="shrink-0 text-gray-400 dark:text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari menu atau halaman..."
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-slate-500"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700/50"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-slate-700 dark:text-slate-400">
                    Esc
                  </kbd>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto py-1.5">
                {filteredSearch.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-400">
                    Tidak ada hasil untuk &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredSearch.map((item, i) => {
                    const isSelected = i === selectedIdx;
                    return (
                      <button
                        key={item.href}
                        onClick={() => { setSearchOpen(false); router.push(item.href); }}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        style={isSelected ? { backgroundColor: "rgba(0,130,251,0.1)" } : {}}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isSelected ? "bg-primary" : "bg-slate-100 dark:bg-slate-700"
                          }`}
                        >
                          <item.icon
                            size={15}
                            className={isSelected ? "text-white" : "text-slate-400 dark:text-slate-300"}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-medium"
                            style={{ color: isSelected ? "#0082FB" : undefined }}
                          >
                            {item.label}
                          </p>
                          <p className="truncate text-[11px] text-gray-400 dark:text-slate-400">{item.desc}</p>
                        </div>

                        {isSelected && (
                          <kbd className="ml-auto shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[9px] font-medium text-gray-400 dark:border-slate-700">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-2.5 dark:border-slate-700">
                <span className="text-[10px] text-gray-400 dark:text-slate-600">
                  <kbd className="mr-0.5 rounded border border-gray-200 px-1 py-0.5 text-[9px] dark:border-slate-700">↑</kbd>
                  <kbd className="rounded border border-gray-200 px-1 py-0.5 text-[9px] dark:border-slate-700">↓</kbd>
                  {" "}navigasi
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-600">
                  <kbd className="mr-0.5 rounded border border-gray-200 px-1 py-0.5 text-[9px] dark:border-slate-700">↵</kbd>
                  buka
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-600">
                  <kbd className="mr-0.5 rounded border border-gray-200 px-1 py-0.5 text-[9px] dark:border-slate-700">Esc</kbd>
                  tutup
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {profilOpen && <ProfilSayaModal onClose={() => setProfilOpen(false)} />}
    </>
  );
}
