"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Users, CheckCircle2, XCircle, Filter, KeyRound, UserCheck, School, ChevronDown, GraduationCap, FileSpreadsheet, UserPlus } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { kelasShort } from "@/components/data-siswa/shared";

const REF_PRIMARY = "#0082FB";
const REF_SUCCESS = "#00D67F";

export type StatusFilter = "" | "sudah" | "belum";

type WaliInfo = {
  id: string;
  nama: string;
  fotoProfil?: string | null;
  mustChangePassword: boolean;
} | null;

type KelasOption = { id: string; nama: string };

export function FilterBarPassword({
  kelasList, selectedKelasId, onSelectKelas,
  kelasNama, wali, onResetWali,
  search, onSearch,
  statusFilter, onStatusFilter,
  total, sudahCount, belumCount, displayedCount,
  onKelolaGuru, onImportSiswa, onCreateAccount,
}: {
  kelasList: KelasOption[]; selectedKelasId: string; onSelectKelas: (id: string) => void;
  kelasNama?: string;
  wali: WaliInfo;
  onResetWali: () => void;
  search: string; onSearch: (v: string) => void;
  statusFilter: StatusFilter; onStatusFilter: (v: StatusFilter) => void;
  total: number; sudahCount: number; belumCount: number; displayedCount: number;
  onKelolaGuru: () => void; onImportSiswa: () => void; onCreateAccount: () => void;
}) {
  const STATUS_PILLS: { value: StatusFilter; label: string; icon: typeof Users; count: number }[] = [
    { value: "", label: "Semua", icon: Users, count: total },
    { value: "sudah", label: "Sudah Ganti", icon: CheckCircle2, count: sudahCount },
    { value: "belum", label: "Belum Ganti", icon: XCircle, count: belumCount },
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: `radial-gradient(circle, ${REF_PRIMARY} 1px, transparent 1px)`, backgroundSize: "18px 18px" }}
      />

      <div className="relative mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-700/50">
        <motion.button
          onClick={onKelolaGuru}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800"
          style={{ color: REF_PRIMARY }}>
          <GraduationCap size={13} /> Kelola Guru
        </motion.button>
        <motion.button
          onClick={onImportSiswa}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold shadow-sm dark:border-slate-700 dark:bg-slate-800"
          style={{ color: REF_PRIMARY }}>
          <FileSpreadsheet size={13} /> Impor Massal
        </motion.button>
        <motion.button
          onClick={onCreateAccount}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm"
          style={{ background: REF_PRIMARY }}>
          <UserPlus size={13} /> Buat Akun
        </motion.button>
      </div>

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-white">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${REF_PRIMARY}1a`, color: REF_PRIMARY }}>
              <Filter size={13} />
            </span>
            Kelola Password <span className="font-medium text-slate-400 dark:text-slate-500">({displayedCount})</span>
          </p>
          <p className="mt-1 ml-9 text-xs text-slate-500 dark:text-slate-400">
            {kelasNama ? `Siswa kelas ${kelasNama}` : "Cari dan saring status password"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="relative shrink-0 sm:w-44">
            <School size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedKelasId}
              onChange={(e) => onSelectKelas(e.target.value)}
              className="h-10.5 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm font-semibold text-slate-700 transition-all focus:border-[#0082FB] focus:outline-none focus:ring-2 focus:ring-[#0082FB]/12 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {kelasList.map((k) => <option key={k.id} value={k.id}>{kelasShort(k.nama)}</option>)}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cari nama atau NIS…"
              className="h-10.5 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-[#0082FB] focus:outline-none focus:ring-2 focus:ring-[#0082FB]/12 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => onSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {wali && (
        <div className="relative mt-4 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar src={wali.fotoProfil} nama={wali.nama} sizePx={34} fallbackBg="#0082FB" textClassName="text-xs font-bold" />
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <UserCheck size={11} /> Wali Kelas
              </p>
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{wali.nama}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {wali.mustChangePassword ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                Belum Ganti
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${REF_SUCCESS}26`, color: REF_SUCCESS }}>
                Sudah Ganti
              </span>
            )}
            <button onClick={onResetWali}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:brightness-95"
              style={{ background: REF_PRIMARY }}>
              <KeyRound size={11} /> Reset
            </button>
          </div>
        </div>
      )}

      <div className="relative mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4 dark:border-slate-700/50">
        {STATUS_PILLS.map((opt) => {
          const active = statusFilter === opt.value;
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.value}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onStatusFilter(opt.value)}
              className="relative rounded-md px-3.5 py-1.5 text-xs font-semibold"
            >
              {active && (
                <motion.span
                  layoutId="password-status-pill-active"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-md shadow-sm"
                  style={{ backgroundColor: REF_SUCCESS }}
                />
              )}
              <span className={`relative flex items-center gap-1.5 transition-colors ${active ? "text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
                <Icon size={12} />
                {opt.label}
                <span className={`rounded-lg px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700"}`}>
                  {opt.count}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <p className="relative mt-auto border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400 dark:border-slate-700/50 dark:text-slate-500">
        Menampilkan {displayedCount} dari {total} siswa di kelas ini
      </p>
    </div>
  );
}
