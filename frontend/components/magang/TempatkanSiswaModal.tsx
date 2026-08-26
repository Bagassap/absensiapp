"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, X, Search, Pencil } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { Avatar } from "@/components/shared/Avatar";
import { avatarColorFor, getNama, toTitleCase } from "@/components/data-siswa/shared";
import type { SiswaCardData } from "@/components/data-siswa/shared";
import { todayJakarta } from "@/components/absensi-harian/shared";
import type { TempatMagang, PenempatanMagang } from "./types";

type GuruOption = { id: string; user: { id: string; nama: string } };

const INPUT_CLS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0082FB]/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200";

export function TempatkanSiswaModal({
  siswaList, tempatList, guruList, penempatanList, onClose, onSaved,
}: {
  siswaList: SiswaCardData[];
  tempatList: TempatMagang[];
  guruList: GuruOption[];
  penempatanList: PenempatanMagang[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [siswaId, setSiswaId] = useState("");
  const [tempatId, setTempatId] = useState("");
  const [guruId, setGuruId] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState(() => todayJakarta());
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [saving, setSaving] = useState(false);

  const siswaAktifIds = useMemo(
    () => new Set(penempatanList.filter((p) => p.status === "AKTIF").map((p) => p.siswa.id)),
    [penempatanList],
  );
  const siswaTersedia = useMemo(
    () => siswaList
      .filter((s) => !siswaAktifIds.has(s.id))
      .filter((s) => (search ? getNama(s).toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search) : true)),
    [siswaList, siswaAktifIds, search],
  );
  const siswaTerpilih = siswaList.find((s) => s.id === siswaId) ?? null;

  function pilihSiswa(s: SiswaCardData) {
    setSiswaId(s.id);
    setSearch("");
  }
  function gantiSiswa() {
    setSiswaId("");
  }

  async function save() {
    if (!siswaId || !tempatId || !guruId || !tanggalMulai) {
      toast.error("Siswa, tempat, guru pembimbing, dan tanggal mulai wajib diisi", "");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/magang/penempatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siswaId, tempatMagangId: tempatId, guruPembimbingId: guruId,
          tanggalMulai, tanggalSelesai: tanggalSelesai || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Siswa berhasil ditempatkan PKL", "");
        onSaved();
        onClose();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal menempatkan siswa", "");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-[#0082FB] px-6 py-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Briefcase size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">PKL</p>
            <h2 className="text-base font-extrabold text-white">Tempatkan Siswa PKL</h2>
          </div>
          <button onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Siswa</label>
            {siswaTerpilih ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/60">
                <Avatar src={siswaTerpilih.user?.fotoProfil} nama={toTitleCase(getNama(siswaTerpilih))} sizePx={32}
                  fallbackBg={avatarColorFor(getNama(siswaTerpilih))} textClassName="text-[10px] font-extrabold" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{toTitleCase(getNama(siswaTerpilih))}</p>
                  <p className="truncate text-[11px] text-slate-400">{siswaTerpilih.nis} · {siswaTerpilih.kelas.nama}</p>
                </div>
                <button type="button" onClick={gantiSiswa}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#0082FB] shadow-sm hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600">
                  <Pencil size={11} /> Ganti
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
                  <Search size={14} className="shrink-0 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau NIS…" autoFocus
                    className="w-full bg-transparent text-sm focus:outline-none dark:text-slate-200" />
                </div>
                <div className="mt-1.5 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1.5 dark:border-slate-700/50">
                  {siswaTersedia.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Tidak ada siswa tersedia</p>
                  ) : (
                    siswaTersedia.map((s) => (
                      <button key={s.id} type="button" onClick={() => pilihSiswa(s)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Avatar src={s.user?.fotoProfil} nama={toTitleCase(getNama(s))} sizePx={30}
                          fallbackBg={avatarColorFor(getNama(s))} textClassName="text-[10px] font-extrabold" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{toTitleCase(getNama(s))}</p>
                          <p className="truncate text-[11px] text-slate-400">{s.nis} · {s.kelas.nama}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Hanya menampilkan siswa yang belum punya penempatan PKL aktif.</p>
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Tempat Magang</label>
            <select value={tempatId} onChange={(e) => setTempatId(e.target.value)} className={INPUT_CLS}>
              <option value="">— Pilih tempat —</option>
              {tempatList.map((t) => {
                const terisi = t._count?.penempatan ?? 0;
                const penuh = terisi >= t.kuota;
                return (
                  <option key={t.id} value={t.id} disabled={penuh}>
                    {t.namaTempat} ({terisi}/{t.kuota}{penuh ? " · penuh" : ""})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Guru Pembimbing</label>
            <select value={guruId} onChange={(e) => setGuruId(e.target.value)} className={INPUT_CLS}>
              <option value="">— Pilih guru —</option>
              {guruList.map((g) => (
                <option key={g.id} value={g.id}>{toTitleCase(g.user.nama)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Mulai</label>
              <input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Selesai <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
              <input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 p-5 pt-4 dark:border-slate-700/50">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
            Batal
          </button>
          <button onClick={save} disabled={saving}
            className="rounded-xl bg-[#0082FB] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">
            {saving ? "Menyimpan..." : "Tempatkan"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
