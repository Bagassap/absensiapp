import { CheckCircle2, Clock, XCircle, CalendarDays, CalendarRange, CalendarCheck2 } from "lucide-react";
import type { KegiatanWindow } from "./types";

// Palet aplikasi = brand Absensi Guru (#00C853 green utama, #013920 deep
// green, #FFF7E4 peach) + hijau #00D67F khusus sukses dan merah #EF4444
// khusus error. TIDAK ADA gradient dan TIDAK ADA warna kuning di mana pun
// — semua warna di file ini adalah solid dari hex-hex tsb (atau tint
// transparan darinya).
export const KEGIATAN_WINDOW_CFG: Record<KegiatanWindow, {
  label: string; bg: string; clr: string; icon: React.ElementType;
}> = {
  BELUM_MULAI: { label: "Belum Mulai", bg: "#FFF7E4", clr: "#00C853", icon: Clock },
  BUKA:        { label: "Dibuka",      bg: "#E3FBF0", clr: "#00D67F", icon: CheckCircle2 },
  TUTUP:       { label: "Ditutup",     bg: "#FEE9EA", clr: "#EF4444", icon: XCircle },
};

export const BRAND_GRADIENT = "#00C853";

// Rotasi warna untuk kartu/badge yang tampil berjejer (>1) — sengaja
// memakai variasi dari seluruh 5 warna utama + hijau, bukan cuma biru,
// supaya kelima warna benar-benar terpakai.
export const CARD_GRADIENTS = [
  "#00C853", // blue
  "#EF4444", // red
  "#00C853", // lime
  "#00D67F", // green
  "#013920", // navy
  "#013920", // ink
];

// Solid dominant hue for each CARD_GRADIENTS entry — used to color an icon
// sitting on a solid white badge, without ever needing an alpha/opacity color.
export const CARD_ACCENT = ["#00C853", "#EF4444", "#00C853", "#00D67F", "#000000", "#000000"];

// Rotasi warna yang sama dengan kartu "Akses Cepat" di dashboard admin/guru/
// siswa — 4 warna dari palet: biru, lime (utama), merah, biru terang.
export const DASHBOARD_GRADIENTS = [
  "#013920", // blue
  "#00C853", // lime (utama)
  "#EF4444", // red
  "#00C853", // biru terang
];
export const DASHBOARD_ACCENT = ["#000000", "#00C853", "#EF4444", "#00C853"];
export const DASHBOARD_PASTEL = ["#FFF7E4", "#EFFEEC", "#FEE9EA", "#FFF7E4"];

// Teks/ikon di atas tiap WALLET_GRADIENTS — putih untuk warna gelap (navy/
// merah), tinta gelap untuk lime yang terlalu terang buat teks putih.
export const WALLET_ON_TEXT = ["#FFFFFF", "#000000", "#FFFFFF", "#FFFFFF"];

// Wallet-card style palette for the "Kelas" row on the admin Absensi Harian
// page — order/colors match DASHBOARD_GRADIENTS di atas: biru, lime (utama),
// merah, biru terang — cycling by kelas index.
export const WALLET_GRADIENTS = [
  "#013920", // blue
  "#00C853", // lime (utama)
  "#EF4444", // red
  "#00C853", // biru terang
];

// Subtle repeating wave-line texture drawn straight into each wallet card's
// gradient background, matching the reference's faint background pattern.
// Still used by the guru Absensi Harian page's kelas cards.
export const WALLET_WAVE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Cpath d='M0 30 Q15 10 30 30 T60 30 T90 30 T120 30' stroke='white' stroke-opacity='0.35' stroke-width='2' fill='none'/%3E%3Cpath d='M0 45 Q15 25 30 45 T60 45 T90 45 T120 45' stroke='white' stroke-opacity='0.22' stroke-width='2' fill='none'/%3E%3C/svg%3E\")";

// Dot-grid texture for the admin Absensi Harian page's kelas cards —
// a distinct corak from the guru page's wave pattern.
export const WALLET_DOT_PATTERN = "radial-gradient(circle, rgba(255,255,255,0.55) 1.5px, transparent 1.5px)";
export const WALLET_DOT_SIZE = "18px 18px";

// Mirrors the reference "Unduh Laporan PDF" card's 3 gradient period
// buttons exactly — same shape (icon + label + caption stacked, grid-cols-3)
// but toggles the shared exportRange's mode instead of firing a one-shot
// download, since our export needs a separate format pick below (4 kinds).
// Shared by both admin and guru's Absensi Harian pages, dan pola warna yang
// sama (biru, lime, merah) dipakai ulang di semua kartu "Unduh Laporan"
// lain di aplikasi (Data Siswa, Catatan Siswa) — lihat RANGE_MODE_FG untuk
// warna teks yang otomatis gelap saat backgroundnya lime.
export const RANGE_MODE_CARDS: { key: "harian" | "mingguan" | "bulanan"; label: string; caption: string; icon: React.ElementType; gradient: string }[] = [
  { key: "harian", label: "Harian", caption: "Rekap hari ini", icon: CalendarDays, gradient: "#013920" },
  { key: "mingguan", label: "Mingguan", caption: "Rekap minggu ini", icon: CalendarRange, gradient: "#00C853" },
  { key: "bulanan", label: "Bulanan", caption: "Rekap bulan ini", icon: CalendarCheck2, gradient: "#EF4444" },
];

// Warna teks di atas tiap gradient card "Unduh Laporan" — selalu putih,
// termasuk di atas lime (#00C853), sesuai aturan kontras standar app ini.
export function reportCardFg(_gradient: string): string {
  return "#FFFFFF";
}

// Date.prototype.toISOString() always renders the UTC calendar date, not the
// browser's local one — during the ~7h/day window where WIB has already
// crossed into a new date but UTC hasn't (UTC 17:00-23:59 = WIB 00:00-06:59),
// `new Date().toISOString().slice(0, 10)` silently returns yesterday. Mirrors
// the backend's jakartaParts()/todayStr() in absensi-harian.service.ts.
export function todayJakarta(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatTgl(tgl?: string) {
  if (!tgl) return "-";
  return new Date(tgl).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export type ExportRangeMode = "harian" | "mingguan" | "bulanan";
export type ExportRange =
  | { mode: "harian"; tanggal: string }
  | { mode: "mingguan"; tanggalMulai: string; tanggalSelesai: string }
  | { mode: "bulanan"; bulan: number; tahun: number };

// Monday-Friday of the week containing `anchor` (yyyy-mm-dd) — hari efektif
// sekolah, mirrors effectiveWeekdaysInRange()/currentWindow() on the backend
// (Sabtu-Minggu never has an absen window). UTC-anchored arithmetic so the
// browser's local timezone can't shift which calendar day "anchor" lands on.
export function weekRangeFor(anchor: string): { start: string; end: string } {
  const [y, m, d] = anchor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + mondayOffset);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const fmt = (dt: Date) => `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  return { start: fmt(monday), end: fmt(friday) };
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_COLORS = ["#00C853", "#EF4444", "#00C853", "#00C853", "#00D67F", "#013920"];
export function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function parseLokasi(raw: string | null | undefined) {
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length >= 2) return { lat: parts[0].trim(), lng: parts[1].trim() };
  return null;
}

export { API_BASE, resolveMediaSrc } from "@/lib/media";
