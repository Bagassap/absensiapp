"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, X, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import type { TempatMagang } from "./types";

const INPUT_CLS = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0082FB]/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200";

export function KelolaTempatModal({ tempatList, onClose, onSaved }: {
  tempatList: TempatMagang[]; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<TempatMagang | { id: "" } | null>(null);
  const [namaTempat, setNamaTempat] = useState("");
  const [alamat, setAlamat] = useState("");
  const [kontak, setKontak] = useState("");
  const [bidangUsaha, setBidangUsaha] = useState("");
  const [kuota, setKuota] = useState("1");
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing({ id: "" });
    setNamaTempat(""); setAlamat(""); setKontak(""); setBidangUsaha(""); setKuota("1");
  }
  function startEdit(t: TempatMagang) {
    setEditing(t);
    setNamaTempat(t.namaTempat); setAlamat(t.alamat); setKontak(t.kontak ?? "");
    setBidangUsaha(t.bidangUsaha ?? ""); setKuota(String(t.kuota));
  }

  async function save() {
    if (!namaTempat.trim() || !alamat.trim()) { toast.error("Nama tempat dan alamat wajib diisi", ""); return; }
    setSaving(true);
    try {
      const isNew = !editing?.id;
      const res = await fetch(isNew ? "/api/magang/tempat" : `/api/magang/tempat/${editing!.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaTempat: namaTempat.trim(),
          alamat: alamat.trim(),
          kontak: kontak.trim() || undefined,
          bidangUsaha: bidangUsaha.trim() || undefined,
          kuota: Number(kuota) || 1,
        }),
      });
      if (res.ok) {
        toast.success(isNew ? "Tempat magang ditambahkan" : "Tempat magang diperbarui", "");
        setEditing(null);
        onSaved();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal menyimpan tempat magang", "");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: TempatMagang) {
    const ok = await toast.confirm("Hapus tempat magang ini?", `"${t.namaTempat}" akan dihapus permanen.`);
    if (!ok) return;
    const res = await fetch(`/api/magang/tempat/${t.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Tempat magang dihapus", ""); onSaved(); }
    else {
      const d = await res.json().catch(() => null);
      toast.error(d?.message ?? "Gagal menghapus tempat magang", "");
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-[#0082FB] px-6 py-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Building2 size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">PKL</p>
            <h2 className="text-base font-extrabold text-white">Kelola Tempat Magang</h2>
          </div>
          <button onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {editing ? (
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/40">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Nama Tempat</label>
                <input value={namaTempat} onChange={(e) => setNamaTempat(e.target.value)} placeholder="Contoh: PT Maju Jaya Digital" className={INPUT_CLS} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Alamat</label>
                <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat lengkap" className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Kontak <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
                  <input value={kontak} onChange={(e) => setKontak(e.target.value)} placeholder="No. telp/WA" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Kuota Siswa</label>
                  <input type="number" min={1} value={kuota} onChange={(e) => setKuota(e.target.value)} className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Bidang Usaha <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
                <input value={bidangUsaha} onChange={(e) => setBidangUsaha(e.target.value)} placeholder="Contoh: Pengembangan Perangkat Lunak" className={INPUT_CLS} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditing(null)} className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                  Batal
                </button>
                <button onClick={save} disabled={saving}
                  className="rounded-xl bg-[#0082FB] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startCreate}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 hover:border-[#0082FB]/40 hover:text-[#0082FB] dark:border-slate-600">
              <Plus size={14} /> Tambah Tempat Magang
            </button>
          )}

          <div className="mt-3 space-y-2">
            {tempatList.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 dark:border-slate-700/50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{t.namaTempat}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {t.alamat} · Kuota {t._count?.penempatan ?? 0}/{t.kuota}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button onClick={() => startEdit(t)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => remove(t)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {tempatList.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada tempat magang</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
