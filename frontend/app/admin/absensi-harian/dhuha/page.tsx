"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Plus, Pencil, Trash2, X, Loader2, CalendarDays, Check } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { todayJakarta } from "@/components/absensi-harian/shared";

type JadwalDhuhaRow = {
  id: string;
  minggu: number;
  hari: string;
  guruId: string;
  guruNama: string | null;
  kelas: string;
  mapel: string;
};

type DhuhaInfo = {
  anchor: string;
  tanggal: string;
  mingguSekarang: number | null;
  jadwal: JadwalDhuhaRow[];
};

type GuruOption = { guruId: string; nama: string };

type FormState = { id: string | null; hari: string; guruId: string; kelas: string; mapel: string };

const HARI = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
const MINGGU = [1, 2, 3, 4];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all focus:border-[#00C853] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

function formatTanggal(tgl: string): string {
  const [y, m, d] = tgl.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

async function readError(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  const msg = data?.message;
  return Array.isArray(msg) ? msg.join(", ") : msg || "Terjadi kesalahan";
}

export default function JadwalDhuhaPage() {
  const router = useRouter();
  const toast = useToast();
  const [info, setInfo] = useState<DhuhaInfo | null>(null);
  const [guruOptions, setGuruOptions] = useState<GuruOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [minggu, setMinggu] = useState(1);
  const [anchorInput, setAnchorInput] = useState("");
  const [savingAnchor, setSavingAnchor] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [infoRes, guruRes] = await Promise.all([
        fetch(`/api/absensi-harian/dhuha?tanggal=${todayJakarta()}`, { cache: "no-store" }),
        fetch("/api/users/guru", { cache: "no-store" }),
      ]);
      if (!infoRes.ok) throw new Error(await readError(infoRes));
      const data: DhuhaInfo = await infoRes.json();
      setInfo(data);
      setAnchorInput((prev) => prev || data.anchor);
      if (guruRes.ok) {
        const users: { nama: string; isActive: boolean; guru: { id: string } | null }[] = await guruRes.json();
        setGuruOptions(
          users.filter((u) => u.guru && u.isActive).map((u) => ({ guruId: u.guru!.id, nama: u.nama })),
        );
      }
    } catch (e) {
      toast.error("Gagal memuat jadwal dhuha", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (info?.mingguSekarang) setMinggu(info.mingguSekarang);
  }, [info?.mingguSekarang]);

  const perHari = useMemo(() => {
    const rows = (info?.jadwal ?? []).filter((r) => r.minggu === minggu);
    return HARI.map((h) => ({ hari: h, rows: rows.filter((r) => r.hari === h) }));
  }, [info, minggu]);

  async function saveAnchor() {
    setSavingAnchor(true);
    try {
      const res = await fetch("/api/absensi-harian/dhuha/anchor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal: anchorInput }),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success("Tanggal mulai disimpan", `Minggu 1 dimulai ${formatTanggal(anchorInput)}`);
      await load();
    } catch (e) {
      toast.error("Gagal menyimpan", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setSavingAnchor(false);
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.guruId || !form.kelas.trim() || !form.mapel.trim()) {
      toast.error("Data belum lengkap", "Guru, kelas, dan mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = { minggu, hari: form.hari, guruId: form.guruId, kelas: form.kelas.trim(), mapel: form.mapel.trim() };
      const res = await fetch(form.id ? `/api/absensi-harian/dhuha/jadwal/${form.id}` : "/api/absensi-harian/dhuha/jadwal", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(form.id ? "Jadwal diperbarui" : "Jadwal ditambahkan", "");
      setForm(null);
      await load();
    } catch (e) {
      toast.error("Gagal menyimpan jadwal", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: JadwalDhuhaRow) {
    if (!window.confirm(`Hapus jadwal ${row.guruNama ?? "guru"} (${row.kelas}) dari Minggu ${row.minggu}?`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/absensi-harian/dhuha/jadwal/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      toast.success("Jadwal dihapus", "");
      await load();
    } catch (e) {
      toast.error("Gagal menghapus", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative isolate -m-4" style={{ background: "#013920" }}>
      <div className="relative flex items-center px-4 pb-3 pt-4">
        <button type="button" onClick={() => router.push("/admin/absensi-harian")}
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25">
          <ChevronLeft size={18} />
        </button>
        <h1 className="absolute inset-x-0 text-center text-base font-bold text-white">Jadwal Shalat Dhuha</h1>
      </div>

      <div className="space-y-4 rounded-t-[28px] bg-[#F1F5F8] p-4 pb-8 dark:bg-slate-900">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <>
            <div className="rounded-3xl bg-white p-4 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-[#00C853]" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Siklus 4 Minggu</p>
                {info?.mingguSekarang ? (
                  <span className="ml-auto rounded-full bg-[#00C85318] px-2.5 py-0.5 text-[11px] font-bold text-[#00A844]">
                    Minggu ini: Minggu {info.mingguSekarang}
                  </span>
                ) : (
                  <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-700">
                    Belum dimulai
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Minggu berganti tiap hari Senin dan berulang setelah Minggu 4. Absen Dhuha hanya aktif untuk guru yang terjadwal pada hari itu.
              </p>
              <label className={`${LABEL} mt-3`}>Senin awal Minggu 1</label>
              <div className="flex gap-2">
                <input type="date" value={anchorInput} onChange={(e) => setAnchorInput(e.target.value)} className={INPUT} />
                <button type="button" onClick={saveAnchor} disabled={savingAnchor || !anchorInput || anchorInput === info?.anchor}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#00C853] px-4 text-sm font-bold text-white disabled:opacity-50">
                  {savingAnchor ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Simpan
                </button>
              </div>
              {info && <p className="mt-1.5 text-[11px] text-slate-400">Saat ini: {formatTanggal(info.anchor)}</p>}
            </div>

            <div className="flex gap-2">
              {MINGGU.map((m) => (
                <button key={m} type="button" onClick={() => setMinggu(m)}
                  className={`flex-1 rounded-2xl py-2.5 text-sm font-bold transition-colors ${
                    minggu === m ? "bg-[#013920] text-white" : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                  Minggu {m}
                </button>
              ))}
            </div>

            {perHari.map(({ hari, rows }) => (
              <div key={hari} className="rounded-3xl bg-white p-4 dark:bg-slate-800">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {hari.charAt(0) + hari.slice(1).toLowerCase()}
                    <span className="ml-2 text-xs font-medium text-slate-400">{rows.length} guru</span>
                  </p>
                  <button type="button" onClick={() => setForm({ id: null, hari, guruId: "", kelas: "", mapel: "" })}
                    className="flex items-center gap-1 rounded-full bg-[#00C85318] px-3 py-1.5 text-xs font-bold text-[#00A844]">
                    <Plus size={13} /> Tambah
                  </button>
                </div>
                {rows.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">Tidak ada guru terjadwal — absen Dhuha tidak aktif</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {rows.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.guruNama ?? "-"}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.kelas} · {r.mapel}</p>
                        </div>
                        <button type="button" onClick={() => setForm({ id: r.id, hari: r.hari, guruId: r.guruId, kelas: r.kelas, mapel: r.mapel })}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => remove(r)} disabled={deletingId === r.id}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 disabled:opacity-50 dark:bg-red-500/10">
                          {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      <AnimatePresence>
        {form && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => !saving && setForm(null)}>
            <motion.form onSubmit={submitForm} onClick={(e) => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md space-y-3 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {form.id ? "Edit Jadwal" : "Tambah Jadwal"} · Minggu {minggu}
                </h2>
                <button type="button" onClick={() => setForm(null)} className="text-slate-400"><X size={18} /></button>
              </div>
              <div>
                <label className={LABEL}>Hari</label>
                <select value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })} className={INPUT}>
                  {HARI.map((h) => <option key={h} value={h}>{h.charAt(0) + h.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Guru</label>
                <select required value={form.guruId} onChange={(e) => setForm({ ...form, guruId: e.target.value })} className={INPUT}>
                  <option value="">Pilih guru</option>
                  {guruOptions.map((g) => <option key={g.guruId} value={g.guruId}>{g.nama}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Kelas</label>
                <input type="text" required value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })}
                  placeholder="mis. X PEMASARAN 1" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Mata Pelajaran</label>
                <input type="text" required value={form.mapel} onChange={(e) => setForm({ ...form, mapel: e.target.value })}
                  placeholder="mis. Matematika" className={INPUT} />
              </div>
              <button type="submit" disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C853] py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} Simpan
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
