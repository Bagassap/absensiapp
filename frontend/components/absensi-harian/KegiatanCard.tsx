"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Clock, Plus, Trash2, Pencil, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { KEGIATAN_WINDOW_CFG } from "./shared";
import type { Kegiatan } from "./types";

function minutesToTimeInput(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function timeInputToMinutes(value: string): number | undefined {
  if (!value) return undefined;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
  return h * 60 + m;
}
function fmtMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}.${m}`;
}

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all focus:border-[#00C853] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const BULAN_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// "6 September 2026" — hari, nama bulan Indonesia lengkap (bukan
// disingkat), tahun. Dipakai di toast konfirmasi saat tanggal kegiatan
// beda dari tanggal yang sedang dilihat di halaman.
function formatTanggalFull(tgl: string): string {
  const [y, m, d] = tgl.split("-").map(Number);
  return `${d} ${BULAN_NAMES[m - 1]} ${y}`;
}

// Sama alasannya dengan Time24Select: native <input type="date"> dan
// kalender popup-nya ikut locale browser/OS (bulan bisa jadi angka atau
// disingkat versi Inggris) — tiga dropdown Tanggal/Bulan/Tahun ini
// menjamin nama bulan Indonesia lengkap (bukan angka, bukan singkatan)
// apa pun locale browser admin, dan mengizinkan tanggal kegiatan berbeda
// dari tanggal yang sedang dilihat di halaman.
function TanggalSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [yStr, mStr, dStr] = value ? value.split("-") : ["", "", ""];
  const y = yStr ? Number(yStr) : undefined;
  const m = mStr ? Number(mStr) : undefined;
  const d = dStr ? Number(dStr) : undefined;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
  const maxDay = y && m ? daysInMonth(y, m) : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  function update(newY: number | undefined, newM: number | undefined, newD: number | undefined) {
    const yy = newY ?? y ?? currentYear;
    const mm = newM ?? m ?? 1;
    const maxD = daysInMonth(yy, mm);
    const dd = Math.min(newD ?? d ?? 1, maxD);
    onChange(`${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <select required value={d ?? ""} onChange={(e) => update(undefined, undefined, Number(e.target.value))} className={INPUT}>
        <option value="" disabled>Tgl</option>
        {days.map((dd) => <option key={dd} value={dd}>{dd}</option>)}
      </select>
      <select required value={m ?? ""} onChange={(e) => update(undefined, Number(e.target.value), undefined)} className={INPUT}>
        <option value="" disabled>Bulan</option>
        {BULAN_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
      <select required value={y ?? ""} onChange={(e) => update(Number(e.target.value), undefined, undefined)} className={INPUT}>
        <option value="" disabled>Tahun</option>
        {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
      </select>
    </div>
  );
}

// Native <input type="time"> renders AM/PM on browsers whose locale defaults
// to 12-jam (mis. en-US) — tidak bisa dipaksa 24-jam lewat HTML/CSS saja.
// Dropdown jam/menit manual ini menjamin format 24-jam WIB apa pun locale
// browser admin.
function Time24Select({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(":") : ["", ""];
  return (
    <div className="flex items-center gap-1.5">
      <select required value={h} onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)} className={INPUT}>
        <option value="" disabled>Jam</option>
        {HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span className="shrink-0 font-bold text-slate-400">:</span>
      <select required value={m} onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)} className={INPUT}>
        <option value="" disabled>Menit</option>
        {MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
}

type FormState = { id: string | null; nama: string; tanggal: string; jamMulai: string; jamSelesai: string; keterangan: string };

const EMPTY_FORM: FormState = { id: null, nama: "", tanggal: "", jamMulai: "", jamSelesai: "", keterangan: "" };

export function KegiatanCard({ tanggal, onChanged }: { tanggal: string; onChanged?: () => void }) {
  const toast = useToast();
  const [list, setList] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/absensi-harian/kegiatan?tanggal=${tanggal}`);
      if (res.ok) setList(await res.json());
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, tanggal });
    setShowForm(true);
  }

  function openEdit(k: Kegiatan) {
    setForm({
      id: k.id,
      nama: k.nama,
      tanggal: k.tanggal,
      jamMulai: minutesToTimeInput(k.jamMulai),
      jamSelesai: minutesToTimeInput(k.jamSelesai),
      keterangan: k.keterangan ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const jamMulai = timeInputToMinutes(form.jamMulai);
    const jamSelesai = timeInputToMinutes(form.jamSelesai);
    if (!form.nama.trim() || !form.tanggal || jamMulai == null || jamSelesai == null) {
      toast.error("Data belum lengkap", "Nama kegiatan, tanggal, jam mulai, dan jam selesai wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const res = await fetch(isEdit ? `/api/absensi-harian/kegiatan/${form.id}` : "/api/absensi-harian/kegiatan", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: form.nama.trim(), tanggal: form.tanggal, jamMulai, jamSelesai, keterangan: form.keterangan || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan kegiatan");
      const beda = form.tanggal !== tanggal;
      toast.success(
        "Kegiatan disimpan",
        beda
          ? `"${form.nama}" ${isEdit ? "diperbarui" : "ditambahkan"} untuk ${formatTanggalFull(form.tanggal)}`
          : `"${form.nama}" berhasil ${isEdit ? "diperbarui" : "ditambahkan"}`,
      );
      setShowForm(false);
      load();
      onChanged?.();
    } catch (e) {
      toast.error("Gagal menyimpan kegiatan", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(k: Kegiatan) {
    if (!confirm(`Hapus kegiatan "${k.nama}"? Data absensi yang sudah tercatat untuk kegiatan ini akan ikut terhapus.`)) return;
    try {
      const res = await fetch(`/api/absensi-harian/kegiatan/${k.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus kegiatan");
      toast.success("Kegiatan dihapus", "");
      load();
      onChanged?.();
    } catch (e) {
      toast.error("Gagal menghapus kegiatan", e instanceof Error ? e.message : "Coba lagi");
    }
  }

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
            <CalendarClock size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Kegiatan Hari Ini</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Atur kegiatan & jam absennya (WIB)</p>
          </div>
        </div>
        <motion.button
          type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={openCreate}
          className="flex items-center gap-1 rounded-lg bg-[#00C853] px-3 py-1.5 text-xs font-bold text-white shadow-sm"
        >
          <Plus size={13} /> Tambah Kegiatan
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-xs font-semibold text-slate-400">Belum ada kegiatan untuk tanggal ini</p>
      ) : (
        <div className="space-y-1.5">
          {list.map((k) => {
            const cfg = KEGIATAN_WINDOW_CFG[k.window];
            return (
              <div key={k.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/30">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{k.nama}</p>
                    <span className="shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-extrabold" style={{ backgroundColor: cfg.bg, color: cfg.clr }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <Clock size={10} /> {fmtMinutes(k.jamMulai)}-{fmtMinutes(k.jamSelesai)} WIB
                    {k.keterangan ? ` · ${k.keterangan}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => openEdit(k)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#000000] dark:hover:bg-slate-700">
                  <Pencil size={13} />
                </button>
                <button type="button" onClick={() => handleDelete(k)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{form.id ? "Edit Kegiatan" : "Tambah Kegiatan"}</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Semua jam WIB (GMT+7)</p>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className={LABEL}>Nama Kegiatan</label>
                  <input type="text" required value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                    placeholder="Contoh: Upacara Bendera" className={INPUT} />
                </div>

                <div>
                  <label className={LABEL}>Tanggal Pelaksanaan</label>
                  <TanggalSelect value={form.tanggal} onChange={(v) => setForm((f) => ({ ...f, tanggal: v }))} />
                  {form.tanggal && (
                    <p className="mt-1 text-[11px] text-slate-400">{formatTanggalFull(form.tanggal)}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={LABEL}>Jam Mulai (WIB)</label>
                    <Time24Select value={form.jamMulai} onChange={(v) => setForm((f) => ({ ...f, jamMulai: v }))} />
                  </div>
                  <div>
                    <label className={LABEL}>Jam Selesai (WIB)</label>
                    <Time24Select value={form.jamSelesai} onChange={(v) => setForm((f) => ({ ...f, jamSelesai: v }))} />
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Keterangan (opsional)</label>
                  <textarea rows={2} value={form.keterangan} onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                    placeholder="Contoh: Dilaksanakan di lapangan utama" className={`${INPUT} resize-none`} />
                </div>

                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                    Batal
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-[#00C853] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? "Menyimpan..." : "Simpan Kegiatan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
