"use client";

import { useState } from "react";
import {
  ClipboardList, Search, Plus, Pencil, Trash2, Send, CalendarClock, GraduationCap, Code2, ListChecks, PenLine,
} from "lucide-react";
import { formatTgl, isTugasActive, tipeLabel } from "./types";
import type { TugasItem, TugasSubmisiItem } from "./types";

const TIPE_BADGE: Record<string, { icon: typeof Code2; cls: string }> = {
  PRAKTIK: { icon: Code2, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  PILIHAN_GANDA: { icon: ListChecks, cls: "bg-[#F1F5F8] text-[#1C2B33] dark:bg-[#1C2B33]/40 dark:text-[#C3F84A]" },
  ESSAY: { icon: PenLine, cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
};

const ROW_PALETTES = [
  { bar: "#0082FB", gradient: "#0082FB" },
  { bar: "#00D67F", gradient: "#00D67F" },
  { bar: "#EF4444", gradient: "#EF4444" },
  { bar: "#8A9E1F", gradient: "#C3F84A" }, // lime — bar dipakaikan varian gelap (badge kecil pakai teks putih)
  { bar: "#0064E0", gradient: "#0064E0" },
];
function rowPalette(i: number) { return ROW_PALETTES[i % ROW_PALETTES.length]; }

export function TugasListCard({
  tugasList, submisiList, loading, onAddTugas, onEditTugas, onDeleteTugas, onLihatSubmisi,
  currentUserId, currentUserRole, canCreate = true,
}: {
  tugasList: TugasItem[];
  submisiList: TugasSubmisiItem[];
  loading: boolean;
  onAddTugas: () => void;
  onEditTugas: (t: TugasItem) => void;
  onDeleteTugas: (id: string) => void;
  onLihatSubmisi: (t: TugasItem) => void;
  // Bila diisi, tombol Edit/Hapus per baris hanya tampil untuk tugas milik
  // sendiri (createdBy.id === currentUserId) — ADMIN tetap bebas ke semua.
  currentUserId?: string;
  currentUserRole?: string;
  // false = guru belum diampu mapel apa pun — tombol Tambah disembunyikan.
  canCreate?: boolean;
}) {
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [search, setSearch] = useState("");
  const canEdit = (t: TugasItem) => !currentUserRole || currentUserRole === "ADMIN" || t.createdBy.id === currentUserId;

  const active = tugasList.filter((t) => isTugasActive(t));
  const completed = tugasList.filter((t) => !isTugasActive(t));
  const shown = (tab === "active" ? active : completed)
    .filter((t) => t.judul.toLowerCase().includes(search.trim().toLowerCase()) || t.mapel.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="px-5 pt-5 pb-0" style={{ background: "rgba(0,130,251,0.05)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#C3F84A" }}>
              <ClipboardList size={14} className="text-[#1C2B33]" />
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">Daftar Tugas</p>
          </div>
          {canCreate && (
            <button onClick={onAddTugas}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm"
              style={{ background: "#C3F84A", color: "#1C2B33" }}>
              <Plus size={13} /> Tambah Tugas
            </button>
          )}
        </div>
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama tugas atau mapel..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-[#C3F84A] focus:ring-2 focus:ring-[#F1F5F8] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:focus:ring-[#1C2B33]/30" />
        </div>
        <div className="flex gap-6 border-b border-slate-100 dark:border-slate-700">
          <button onClick={() => setTab("active")}
            className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab === "active" ? "border-blue-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            style={tab === "active" ? { color: "#0082FB" } : {}}>
            Aktif
            {tab === "active" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{ backgroundColor: "#0082FB" }}>{active.length}</span>}
          </button>
          <button onClick={() => setTab("completed")}
            className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab === "completed" ? "border-emerald-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            style={tab === "completed" ? { color: "#00D67F" } : {}}>
            Selesai
            {tab === "completed" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{ backgroundColor: "#00D67F" }}>{completed.length}</span>}
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        {loading && <div className="px-5 py-10 text-center text-sm text-slate-400">Memuat data...</div>}
        {!loading && shown.length === 0 && (
          <div className="px-5 py-12 text-center">
            <ClipboardList size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm text-slate-400">{search.trim() ? `Tidak ada tugas dengan nama "${search.trim()}"` : tab === "active" ? "Tidak ada tugas aktif" : "Tidak ada tugas selesai"}</p>
          </div>
        )}
        {!loading && shown.length > 0 && (
          <table className="w-full min-w-170 text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 backdrop-blur dark:border-slate-700/40 dark:bg-slate-700/60">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tugas</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Mapel</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Kelas Target</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Deadline</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Terkumpul</th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t, idx) => {
                const rp = rowPalette(idx);
                const cnt = submisiList.filter((s) => s.tugasId === t.id).length;
                return (
                  <tr key={t.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: rp.gradient }}>
                          <span className="text-xs font-bold" style={{ color: rp.gradient === "#C3F84A" ? "#1C2B33" : "#FFFFFF" }}>{idx + 1}</span>
                        </div>
                        <p className="max-w-[180px] truncate text-sm font-bold text-slate-800 dark:text-slate-100">{t.judul}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <GraduationCap size={10} /> {t.mapel}
                        </span>
                        {TIPE_BADGE[t.tipe] && (
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${TIPE_BADGE[t.tipe].cls}`}>
                            {(() => { const Icon = TIPE_BADGE[t.tipe].icon; return <Icon size={10} />; })()} {tipeLabel(t.tipe)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{t.kelas?.nama ?? "Semua Kelas"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><CalendarClock size={11} />{formatTgl(t.deadline)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-xs font-bold" style={{ color: rp.bar }}>{cnt} siswa</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onLihatSubmisi(t)}
                          className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all"
                          style={{ borderColor: rp.bar, color: rp.bar, backgroundColor: `${rp.bar}14` }}>
                          <Send size={11} /> Lihat
                          {cnt > 0 && <span className="rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: rp.bar }}>{cnt}</span>}
                        </button>
                        {canEdit(t) && (
                          <>
                            <button onClick={() => onEditTugas(t)}
                              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => onDeleteTugas(t.id)}
                              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
