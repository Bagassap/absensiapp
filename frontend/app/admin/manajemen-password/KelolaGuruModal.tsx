"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, X, Plus, KeyRound, Ban, RotateCcw, School, Loader2,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColor } from "@/components/absensi-harian/shared";
import { KelolaKelasModal, type Guru as GuruRef } from "@/components/absensi-harian/KelolaKelasModal";
import type { Kelas } from "@/components/absensi-harian/types";

type MapelItem = { id: string; nama: string };

type GuruRow = {
  id: string;
  nama: string;
  loginId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  fotoProfil?: string | null;
  guru: {
    id: string;
    nip: string | null;
    noWa: string | null;
    mapelDiampu: MapelItem[];
    kelasWali: { id: string; nama: string }[];
  } | null;
};

function toTitleCase(str: string): string {
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function KelolaGuruModal({
  open, kelasList, onClose, onResetPassword, onChanged,
}: {
  open: boolean;
  kelasList: Kelas[];
  onClose: () => void;
  onResetPassword: (target: { id: string; nama: string; loginId?: string; mustChangePassword: boolean }) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [guruList, setGuruList] = useState<GuruRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapelInput, setMapelInput] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kelolaKelasOpen, setKelolaKelasOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/guru", { cache: "no-store" });
      if (res.ok) setGuruList(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function tambahMapel(guruId: string) {
    const nama = (mapelInput[guruId] ?? "").trim();
    if (!nama) return;
    setBusyId(guruId);
    try {
      const res = await fetch(`/api/mapel/guru/${guruId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama }),
      });
      if (res.ok) {
        setMapelInput((prev) => ({ ...prev, [guruId]: "" }));
        load();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal menambah mapel", "");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function hapusMapel(guruId: string, mapelId: string) {
    setBusyId(guruId);
    try {
      const res = await fetch(`/api/mapel/guru/${guruId}/${mapelId}`, { method: "DELETE" });
      if (res.ok) load();
      else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal menghapus mapel", "");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAktif(g: GuruRow) {
    const nama = toTitleCase(g.nama);
    if (g.isActive) {
      const ok = await toast.confirm(
        "Nonaktifkan akun guru ini?",
        `Akun ${nama} tidak akan bisa login lagi. Data & riwayat (materi, nilai UKK, bimbingan magang, dsb) tetap tersimpan. Lanjutkan?`,
        "Ya, Nonaktifkan",
      );
      if (!ok) return;
    }
    setBusyId(g.id);
    try {
      const res = await fetch(`/api/users/guru/${g.id}/${g.isActive ? "nonaktifkan" : "aktifkan"}`, { method: "PATCH" });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        toast.success(g.isActive ? "Akun dinonaktifkan" : "Akun diaktifkan kembali", "");
        load();
        onChanged();
      } else {
        toast.error(d?.message ?? "Gagal memproses akun", "");
      }
    } finally {
      setBusyId(null);
    }
  }

  const guruRefList: GuruRef[] = guruList
    .filter((g) => g.guru)
    .map((g) => ({ id: g.guru!.id, user: { id: g.id, nama: toTitleCase(g.nama) } }));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0082FB] dark:bg-[#0064E0]/30">
                  <GraduationCap size={16} className="text-[#0082FB]" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 dark:text-white">Kelola Guru</h2>
                  <p className="text-[11px] text-slate-400">Mapel yang diampu, wali kelas, & status akun</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setKelolaKelasOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                  <School size={13} /> Atur Wali Kelas
                </button>
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : guruList.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">Belum ada akun guru. Buat lewat tombol &quot;Buat Akun&quot;.</p>
              ) : (
                <div className="space-y-2.5">
                  {guruList.map((g) => {
                    const nama = toTitleCase(g.nama);
                    const busy = busyId === g.id;
                    return (
                      <div key={g.id} className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-700/50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar src={g.fotoProfil} nama={nama} sizePx={36} fallbackBg={avatarColor(nama)} textClassName="text-[11px] font-extrabold" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{nama}</p>
                              <p className="truncate text-[11px] text-slate-400">
                                {g.loginId ?? "—"}{g.guru?.nip ? ` · NIP ${g.guru.nip}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                            g.isActive
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                              : "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {g.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mapel:</span>
                          {(g.guru?.mapelDiampu ?? []).map((m) => (
                            <span key={m.id} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#0082FB] dark:bg-blue-900/20 dark:text-blue-300">
                              {m.nama}
                              <button type="button" disabled={busy} onClick={() => hapusMapel(g.id, m.id)}
                                className="rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/40">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <span className="flex items-center gap-1">
                            <input
                              value={mapelInput[g.id] ?? ""}
                              onChange={(e) => setMapelInput((prev) => ({ ...prev, [g.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tambahMapel(g.id); } }}
                              placeholder="Tambah mapel…"
                              className="w-28 rounded-lg border border-dashed border-slate-300 bg-transparent px-2.5 py-1 text-[11px] font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0082FB] dark:border-slate-600 dark:text-slate-300"
                            />
                            <button type="button" disabled={busy || !(mapelInput[g.id] ?? "").trim()} onClick={() => tambahMapel(g.id)}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300">
                              <Plus size={11} />
                            </button>
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Wali kelas:</span>
                          {(g.guru?.kelasWali.length ?? 0) === 0 ? (
                            <span className="text-[11px] text-slate-400">Bukan wali kelas</span>
                          ) : (
                            g.guru!.kelasWali.map((k) => (
                              <span key={k.id} className="rounded-lg bg-[#0082FB] px-2.5 py-1 text-[11px] font-semibold text-[#0082FB] dark:bg-[#0064E0]/20 dark:text-[#0082FB]">
                                {k.nama}
                              </span>
                            ))
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-50 pt-2.5 dark:border-slate-800">
                          <button type="button" disabled={!g.loginId}
                            onClick={() => onResetPassword({ id: g.id, nama, loginId: g.loginId ?? undefined, mustChangePassword: g.mustChangePassword })}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-700 dark:text-slate-300">
                            <KeyRound size={11} /> Reset Password
                          </button>
                          <button type="button" disabled={busy} onClick={() => toggleAktif(g)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-40 ${
                              g.isActive
                                ? "bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20"
                            }`}>
                            {busy ? <Loader2 size={11} className="animate-spin" /> : g.isActive ? <Ban size={11} /> : <RotateCcw size={11} />}
                            {g.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {kelolaKelasOpen && (
            <KelolaKelasModal
              kelasList={kelasList}
              guruList={guruRefList}
              onClose={() => setKelolaKelasOpen(false)}
              onSaved={() => { load(); onChanged(); }}
            />
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
