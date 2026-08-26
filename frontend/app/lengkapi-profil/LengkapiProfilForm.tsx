"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion, type Variants } from "framer-motion";
import { Loader2, MapPin, Sparkles } from "lucide-react";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;

type FormState = {
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  noHp: string;
  namaOrtu: string;
  dukuh: string;
  rt: string;
  rw: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
};

const EMPTY: FormState = {
  tempatLahir: "",
  tanggalLahir: "",
  jenisKelamin: "",
  noHp: "",
  namaOrtu: "",
  dukuh: "",
  rt: "",
  rw: "",
  desa: "",
  kecamatan: "",
  kabupaten: "",
};

const INPUT_CLASS =
  "w-full rounded-xl border border-black/10 bg-black/3 px-3.5 py-2.5 text-sm text-black placeholder:text-black/35 outline-none transition-all focus:border-blue focus:bg-white focus:ring-2 focus:ring-blue/15";

export function LengkapiProfilForm() {
  const [values, setValues] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof FormState, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const allFilled = useMemo(
    () => Object.values(values).every((v) => v.trim().length > 0),
    [values],
  );
  const phoneValid = useMemo(() => PHONE_REGEX.test(values.noHp.trim()), [values.noHp]);
  const canSubmit = allFilled && phoneValid && !loading;

  function validate(): string | null {
    if (!allFilled) return "Semua field wajib diisi.";
    if (!phoneValid) return "Format nomor HP/WhatsApp tidak valid.";
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/siswa/lengkapi-profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || "Gagal menyimpan data profil.");
        setLoading(false);
        return;
      }

      window.location.replace("/siswa/dashboard");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial="hidden"
      animate="visible"
      variants={container}
      className="mt-6 flex flex-col gap-4"
    >
      <motion.div
        variants={item}
        className="flex items-start gap-2.5 rounded-xl border border-blue/15 bg-blue/5 px-3.5 py-3"
      >
        <Sparkles size={16} className="mt-0.5 shrink-0 text-blue" />
        <p className="text-xs leading-relaxed text-black/65">
          Data ini digunakan sekolah untuk keperluan administrasi dan komunikasi. Isi dengan data yang benar.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div variants={item} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black/70">Tempat Lahir</label>
          <input
            type="text" required value={values.tempatLahir}
            onChange={(e) => set("tempatLahir", e.target.value)}
            placeholder="Contoh: Batang" className={INPUT_CLASS}
          />
        </motion.div>
        <motion.div variants={item} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black/70">Tanggal Lahir</label>
          <input
            type="date" required value={values.tanggalLahir}
            onChange={(e) => set("tanggalLahir", e.target.value)}
            className={INPUT_CLASS}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div variants={item} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black/70">Jenis Kelamin</label>
          <select
            required value={values.jenisKelamin}
            onChange={(e) => set("jenisKelamin", e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">— pilih —</option>
            <option value="Laki-laki">Laki-laki</option>
            <option value="Perempuan">Perempuan</option>
          </select>
        </motion.div>
        <motion.div variants={item} className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-black/70">No. WhatsApp/HP</label>
          <input
            type="tel" required value={values.noHp}
            onChange={(e) => set("noHp", e.target.value)}
            placeholder="Contoh: 08123456789" className={INPUT_CLASS}
          />
          {values.noHp.trim().length > 0 && !phoneValid && (
            <p className="text-[11px] text-red-500">Format nomor HP tidak valid.</p>
          )}
        </motion.div>
      </div>

      <motion.div variants={item} className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-black/70">Nama Wali Murid/Orang Tua</label>
        <input
          type="text" required value={values.namaOrtu}
          onChange={(e) => set("namaOrtu", e.target.value)}
          placeholder="Nama wali murid/orang tua" className={INPUT_CLASS}
        />
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-black/8 bg-black/2 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MapPin size={15} className="text-blue" />
          <span className="text-sm font-semibold text-black/80">Alamat Lengkap</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black/60">Dukuh/Dusun</label>
            <input type="text" required value={values.dukuh} onChange={(e) => set("dukuh", e.target.value)}
              placeholder="Dukuh" className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black/60">RT</label>
            <input type="text" required value={values.rt} onChange={(e) => set("rt", e.target.value)}
              placeholder="003" className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black/60">RW</label>
            <input type="text" required value={values.rw} onChange={(e) => set("rw", e.target.value)}
              placeholder="005" className={INPUT_CLASS} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black/60">Desa/Kelurahan</label>
            <input type="text" required value={values.desa} onChange={(e) => set("desa", e.target.value)}
              placeholder="Desa" className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black/60">Kecamatan</label>
            <input type="text" required value={values.kecamatan} onChange={(e) => set("kecamatan", e.target.value)}
              placeholder="Kecamatan" className={INPUT_CLASS} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-black/60">Kabupaten/Kota</label>
            <input type="text" required value={values.kabupaten} onChange={(e) => set("kabupaten", e.target.value)}
              placeholder="Kabupaten" className={INPUT_CLASS} />
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border-l-4 border-l-[#EF4444] bg-[#1C2B33] px-3 py-2 text-sm font-medium text-white"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        variants={item}
        type="submit"
        disabled={!canSubmit}
        whileHover={canSubmit ? { scale: 1.02 } : undefined}
        whileTap={canSubmit ? { scale: 0.98 } : undefined}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(0,130,251,0.55)] transition-all hover:shadow-[0_14px_40px_-8px_rgba(0,130,251,0.70)] hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "#0082FB" }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Menyimpan...
          </>
        ) : (
          "Simpan & Lanjutkan"
        )}
      </motion.button>
    </motion.form>
  );
}
