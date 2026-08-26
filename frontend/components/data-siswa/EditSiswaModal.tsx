"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  User, ChevronDown, GraduationCap, BookOpen, Phone, MapPin, CalendarDays, Sparkles, X,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { type SiswaCardData, type KelasRef, getNama, toTitleCase } from "./shared";

const JURUSAN_OPTIONS = [
  "Pengembangan Perangkat Lunak dan Gim",
  "Pengembangan Gim",
  "Rekayasa Perangkat Lunak",
];

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:bg-slate-800";
const SELECT =
  "w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-9 text-sm text-slate-800 transition-all hover:border-slate-300 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/12 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:bg-slate-800";

function Field({ label, icon: Icon, required, optional, children }: {
  label: string; icon: React.ElementType; required?: boolean; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
        <Icon size={10} className="text-primary/70" />
        {label}
        {required && <span className="normal-case text-[#EF4444]">*</span>}
        {optional && <span className="font-normal normal-case text-gray-400">(opsional)</span>}
      </label>
      {children}
    </div>
  );
}

export function EditSiswaModal({ siswa, kelasList, onClose, onSave }: {
  siswa: SiswaCardData; kelasList: KelasRef[]; onClose: () => void; onSave: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    nama: siswa.nama ?? "", kelasId: siswa.kelas.id, jurusan: siswa.jurusan ?? "",
    angkatan: String(siswa.angkatan), jenisKelamin: siswa.jenisKelamin ?? "",
    noHp: siswa.noHp ?? "",
    dukuh: siswa.dukuh ?? "", rt: siswa.rt ?? "", rw: siswa.rw ?? "",
    desa: siswa.desa ?? "", kecamatan: siswa.kecamatan ?? "", kabupaten: siswa.kabupaten ?? "",
    tempatLahir: siswa.tempatLahir ?? "",
    tanggalLahir: siswa.tanggalLahir ? siswa.tanggalLahir.slice(0, 10) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form, value: string) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/siswa/${siswa.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, angkatan: Number(form.angkatan) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
      toast.success("Data berhasil disimpan!", `Data siswa ${getNama(siswa)} telah diperbarui.`);
      onSave();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi.";
      setError(msg);
      toast.error("Gagal menyimpan data", msg);
    } finally { setSaving(false); }
  }

  const displayNama = toTitleCase(getNama(siswa));
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-999 flex items-end justify-center p-4 sm:items-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
          initial={{ scale: 0.95, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 24 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
          <div className="relative overflow-hidden bg-[#0064E0] px-6 py-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/55">Edit Data Siswa</p>
                  <h2 className="text-base font-extrabold leading-tight text-white">{displayNama}</h2>
                  <p className="text-[10px] text-white/60">NIS: {siswa.nis}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white/80 transition-all hover:bg-white/25 hover:text-white">
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="max-h-[52vh] overflow-y-auto">
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nama Lengkap" required icon={User}>
                  <input type="text" name="edit-siswa-nama" autoComplete="off" data-lpignore="true" data-1p-ignore="true"
                    value={form.nama} onChange={(e) => set("nama", e.target.value)}
                    placeholder="Nama siswa" className={INPUT} />
                </Field>
                <Field label="Jenis Kelamin" icon={User}>
                  <div className="relative">
                    <select value={form.jenisKelamin} onChange={(e) => set("jenisKelamin", e.target.value)} className={SELECT}>
                      <option value="">— pilih —</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
              </div>
              <Field label="Angkatan" required icon={CalendarDays}>
                <input type="number" value={form.angkatan} onChange={(e) => set("angkatan", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Kelas" required icon={GraduationCap}>
                <div className="relative">
                  <select value={form.kelasId} onChange={(e) => set("kelasId", e.target.value)} className={SELECT}>
                    {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </Field>
              <Field label="Jurusan" icon={BookOpen}>
                <div className="relative">
                  <select value={form.jurusan} onChange={(e) => set("jurusan", e.target.value)} className={SELECT}>
                    <option value="">— pilih —</option>
                    {JURUSAN_OPTIONS.map((j) => <option key={j}>{j}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </Field>
              <Field label="No. HP" optional icon={Phone}>
                <input type="tel" name="edit-siswa-nohp" autoComplete="off" data-lpignore="true" data-1p-ignore="true"
                  value={form.noHp} onChange={(e) => set("noHp", e.target.value)}
                  placeholder="08xxxxxxxxxx" className={INPUT} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Tempat Lahir" optional icon={MapPin}>
                  <input type="text" name="edit-siswa-tempat-lahir" autoComplete="off" data-lpignore="true" data-1p-ignore="true"
                    value={form.tempatLahir} onChange={(e) => set("tempatLahir", e.target.value)}
                    placeholder="Kota" className={INPUT} />
                </Field>
                <Field label="Tanggal Lahir" optional icon={CalendarDays}>
                  <input type="date" autoComplete="off" value={form.tanggalLahir} onChange={(e) => set("tanggalLahir", e.target.value)} className={INPUT} />
                </Field>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-700/50 dark:bg-white/3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                  <MapPin size={10} className="text-primary/70" />
                  Alamat Lengkap
                  <span className="font-normal normal-case text-gray-400">(opsional)</span>
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Dukuh/Dusun" icon={MapPin}>
                    <input type="text" value={form.dukuh} onChange={(e) => set("dukuh", e.target.value)}
                      placeholder="Dukuh" className={INPUT} />
                  </Field>
                  <Field label="RT" icon={MapPin}>
                    <input type="text" value={form.rt} onChange={(e) => set("rt", e.target.value)}
                      placeholder="003" className={INPUT} />
                  </Field>
                  <Field label="RW" icon={MapPin}>
                    <input type="text" value={form.rw} onChange={(e) => set("rw", e.target.value)}
                      placeholder="005" className={INPUT} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Desa/Kelurahan" icon={MapPin}>
                    <input type="text" value={form.desa} onChange={(e) => set("desa", e.target.value)}
                      placeholder="Desa" className={INPUT} />
                  </Field>
                  <Field label="Kecamatan" icon={MapPin}>
                    <input type="text" value={form.kecamatan} onChange={(e) => set("kecamatan", e.target.value)}
                      placeholder="Kecamatan" className={INPUT} />
                  </Field>
                  <Field label="Kabupaten/Kota" icon={MapPin}>
                    <input type="text" value={form.kabupaten} onChange={(e) => set("kabupaten", e.target.value)}
                      placeholder="Kabupaten" className={INPUT} />
                  </Field>
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 dark:border-slate-800">
            <div />
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Batal
              </button>
              <motion.button type="button" onClick={handleSave} disabled={saving}
                whileHover={{ scale: 1.03, boxShadow: "0 8px 24px #0082FB55" }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "#0082FB" }}>
                {saving
                  ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Menyimpan…</>
                  : <><Sparkles size={14} />Simpan</>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
