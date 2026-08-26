"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Clock, LogIn, LogOut, Plus, Trash2, X, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";

type JadwalHariIni = {
  tanggal: string;
  isWeekend: boolean;
  hadirStartMinutes: number;
  hadirEndMinutes: number;
  pulangStartMinutes: number;
  pulangEndMinutes: number;
  override: { keterangan: string | null } | null;
};

type JadwalOverride = {
  id: string;
  tanggal: string;
  hadirStartMinutes: number | null;
  hadirEndMinutes: number | null;
  pulangStartMinutes: number | null;
  pulangEndMinutes: number | null;
  keterangan: string | null;
  createdBy: { nama: string } | null;
};

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
function fmtRangeWib(start: number, end: number): string {
  return `${fmtMinutes(start)} - ${fmtMinutes(end)} WIB`;
}
function todayJakartaStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
// Tanggal disimpan sebagai kalender WIB ("YYYY-MM-DD"), jadi harus selalu
// diformat lewat timeZone Asia/Jakarta eksplisit — bukan zona lokal browser
// admin yang membuka halaman ini — supaya tanggalnya tidak pernah mundur
// sehari untuk admin yang mengakses dari luar WIB.
function formatTanggalWib(tgl: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", ...opts }).format(new Date(`${tgl}T00:00:00Z`));
}

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all focus:border-[#0082FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082FB] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

export function JadwalAbsenCard() {
  const toast = useToast();
  const [hariIni, setHariIni] = useState<JadwalHariIni | null>(null);
  const [list, setList] = useState<JadwalOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tanggal: todayJakartaStr(),
    hadirStart: "", hadirEnd: "", pulangStart: "", pulangEnd: "", keterangan: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, lRes] = await Promise.all([
        fetch("/api/absensi-harian/jadwal-override/hari-ini"),
        fetch("/api/absensi-harian/jadwal-override"),
      ]);
      if (hRes.ok) setHariIni(await hRes.json());
      if (lRes.ok) setList(await lRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(preset?: Partial<typeof form>) {
    setForm({
      tanggal: todayJakartaStr(),
      hadirStart: "", hadirEnd: "", pulangStart: "", pulangEnd: "", keterangan: "",
      ...preset,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/absensi-harian/jadwal-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: form.tanggal,
          hadirStartMinutes: timeInputToMinutes(form.hadirStart),
          hadirEndMinutes: timeInputToMinutes(form.hadirEnd),
          pulangStartMinutes: timeInputToMinutes(form.pulangStart),
          pulangEndMinutes: timeInputToMinutes(form.pulangEnd),
          keterangan: form.keterangan || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan jadwal");
      toast.success("Jadwal disimpan", `Jadwal absen ${formatTanggalWib(form.tanggal)} berhasil disesuaikan`);
      setShowForm(false);
      load();
    } catch (e) {
      toast.error("Gagal menyimpan jadwal", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tanggal: string) {
    if (!confirm(`Hapus penyesuaian jadwal untuk tanggal ${formatTanggalWib(tanggal)}? Jadwal akan kembali normal.`)) return;
    try {
      const res = await fetch(`/api/absensi-harian/jadwal-override/${tanggal}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus jadwal");
      toast.success("Jadwal dihapus", "Jadwal kembali normal untuk tanggal ini");
      load();
    } catch (e) {
      toast.error("Gagal menghapus jadwal", e instanceof Error ? e.message : "Coba lagi");
    }
  }

  const isOverriddenToday = !!hariIni?.override;

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0082FB" }}>
            <CalendarClock size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Jadwal Absen</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Atur jam absen datang & pulang (WIB)</p>
          </div>
        </div>
        <motion.button
          type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => openForm()}
          className="flex items-center gap-1 rounded-lg bg-[#0082FB] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#0082FB]"
        >
          <Plus size={13} /> Atur Jadwal
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
      ) : hariIni ? (
        <div className="grid grid-cols-2 gap-2.5">
          <p className="col-span-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <Clock size={11} className="text-[#0082FB]" />
            {formatTanggalWib(hariIni.tanggal, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · WIB
          </p>
          <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-700/50">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <LogIn size={11} className="text-emerald-500" /> Absen Datang
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
              {hariIni.isWeekend ? "Libur" : fmtRangeWib(hariIni.hadirStartMinutes, hariIni.hadirEndMinutes)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-700/50">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <LogOut size={11} className="text-blue-500" /> Absen Pulang
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">
              {hariIni.isWeekend ? "Libur" : fmtRangeWib(hariIni.pulangStartMinutes, hariIni.pulangEndMinutes)}
            </p>
          </div>
          {isOverriddenToday && (
            <div className="col-span-2 flex items-start gap-1.5 rounded-xl bg-[#F1F5F8] px-3 py-2 text-[11px] text-[#1C2B33] dark:bg-[#1C2B33]/20 dark:text-[#C3F84A]">
              <Sparkles size={12} className="mt-0.5 shrink-0" />
              <span>Jadwal hari ini disesuaikan{hariIni.override?.keterangan ? ` — ${hariIni.override.keterangan}` : ""}</span>
            </div>
          )}
        </div>
      ) : null}

      {list.length > 0 && (
        <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto border-t border-slate-100 pt-3 dark:border-slate-700/50">
          {list.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/30">
              <div className="min-w-0">
                <p className="font-bold text-slate-700 dark:text-slate-200">{formatTanggalWib(o.tanggal)}</p>
                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                  {[
                    o.hadirStartMinutes != null || o.hadirEndMinutes != null
                      ? `Datang ${o.hadirStartMinutes != null ? fmtMinutes(o.hadirStartMinutes) : "—"}-${o.hadirEndMinutes != null ? fmtMinutes(o.hadirEndMinutes) : "—"} WIB`
                      : null,
                    o.pulangStartMinutes != null || o.pulangEndMinutes != null
                      ? `Pulang ${o.pulangStartMinutes != null ? fmtMinutes(o.pulangStartMinutes) : "—"}-${o.pulangEndMinutes != null ? fmtMinutes(o.pulangEndMinutes) : "—"} WIB`
                      : null,
                    o.keterangan,
                  ].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button type="button" onClick={() => handleDelete(o.tanggal)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
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
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Atur Jadwal Absen</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Kosongkan jam yang tidak ingin diubah · Semua jam WIB (GMT+7)</p>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className={LABEL}>Tanggal</label>
                  <input type="date" required value={form.tanggal} onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))} className={INPUT} />
                  {form.tanggal && (
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {formatTanggalWib(form.tanggal, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <LogIn size={12} /> Absen Datang <span className="normal-case text-emerald-500/70">(WIB)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={LABEL}>Mulai</label>
                      <input type="time" value={form.hadirStart} onChange={(e) => setForm((f) => ({ ...f, hadirStart: e.target.value }))} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Selesai</label>
                      <input type="time" value={form.hadirEnd} onChange={(e) => setForm((f) => ({ ...f, hadirEnd: e.target.value }))} className={INPUT} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    <LogOut size={12} /> Absen Pulang <span className="normal-case text-blue-500/70">(WIB)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={LABEL}>Mulai</label>
                      <input type="time" value={form.pulangStart} onChange={(e) => setForm((f) => ({ ...f, pulangStart: e.target.value }))} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Selesai</label>
                      <input type="time" value={form.pulangEnd} onChange={(e) => setForm((f) => ({ ...f, pulangEnd: e.target.value }))} className={INPUT} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Keterangan (opsional)</label>
                  <textarea rows={2} value={form.keterangan} onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                    placeholder="Contoh: Pulang lebih awal karena acara sekolah" className={`${INPUT} resize-none`} />
                </div>

                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                    Batal
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0082FB] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0082FB] disabled:opacity-60">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? "Menyimpan..." : "Simpan Jadwal"}
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
