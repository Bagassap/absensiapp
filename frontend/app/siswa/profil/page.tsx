"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, MapPin, BookOpen, Calendar,
  Users, Pencil, Check, X, GraduationCap, Mail, Hash, IdCard, Camera,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/shared/ToastSystem";
import { formatAlamatLengkap } from "@/components/data-siswa/shared";
import { Avatar } from "@/components/shared/Avatar";
import { ChangeFotoProfilModal } from "@/components/shared/ChangeFotoProfilModal";

type SiswaProfil = {
  id: string;
  nis: string;
  nama: string | null;
  kelas: { id: string; nama: string; waliKelasGuru?: { user: { id: string; nama: string } } | null };
  jurusan: string | null;
  angkatan: number;
  jenisKelamin: string | null;
  noHp: string | null;
  dukuh: string | null;
  rt: string | null;
  rw: string | null;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  namaOrtu: string | null;
  user: { id: string; nama: string; email: string | null; fotoProfil?: string | null } | null;
};

const HERO_GRADIENT = "#0082FB";
const ACCENT_VIOLET = "#0082FB";
const ACCENT_ORANGE = "#C3F84A";
const PROFILE_CARD_GRADIENT = "#0082FB";

function getNama(s: SiswaProfil): string { return s.nama ?? s.user?.nama ?? "—"; }
function toTitleCase(str: string): string {
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function kelasShort(kelas: string): string {
  return kelas
    .replace("Pengembangan Perangkat Lunak dan Gim", "PPLG")
    .replace("Pengembangan Gim", "Gim")
    .replace("Rekayasa Perangkat Lunak", "RPL");
}
function formatTanggal(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:border-[#0064E0] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0064E0]/12 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-600 dark:focus:bg-slate-800";

function EditProfilModal({
  siswa, kelasGradient, onClose, onSave,
}: {
  siswa: SiswaProfil;
  kelasGradient: string;
  onClose: () => void;
  onSave: (updated: SiswaProfil) => void;
}) {
  const toast = useToast();
  const [jenisKelamin, setJenisKelamin] = useState(siswa.jenisKelamin ?? "");
  const [tempatLahir, setTempatLahir] = useState(siswa.tempatLahir ?? "");
  const [tanggalLahir, setTanggalLahir] = useState(siswa.tanggalLahir ? siswa.tanggalLahir.slice(0, 10) : "");
  const [namaOrtu, setNamaOrtu] = useState(siswa.namaOrtu ?? "");
  const [noHp, setNoHp] = useState(siswa.noHp ?? "");
  const [dukuh, setDukuh] = useState(siswa.dukuh ?? "");
  const [rt, setRt] = useState(siswa.rt ?? "");
  const [rw, setRw] = useState(siswa.rw ?? "");
  const [desa, setDesa] = useState(siswa.desa ?? "");
  const [kecamatan, setKecamatan] = useState(siswa.kecamatan ?? "");
  const [kabupaten, setKabupaten] = useState(siswa.kabupaten ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/siswa/saya", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenisKelamin: jenisKelamin || undefined,
          tempatLahir: tempatLahir || undefined,
          tanggalLahir: tanggalLahir || undefined,
          namaOrtu: namaOrtu || undefined,
          noHp: noHp || undefined,
          dukuh: dukuh || undefined,
          rt: rt || undefined,
          rw: rw || undefined,
          desa: desa || undefined,
          kecamatan: kecamatan || undefined,
          kabupaten: kabupaten || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : (data?.message ?? `Error ${res.status}`);
        throw new Error(msg);
      }
      toast.success("Profil berhasil diperbarui!", "Data diri kamu telah disimpan.");
      onSave(data as SiswaProfil);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : "Gagal menyimpan. Coba lagi.";
      setError(msg);
      toast.error("Gagal memperbarui profil", msg);
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2B33]"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ background: kelasGradient }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                <Pencil size={15} className="text-white" />
              </div>
              <h2 className="text-base font-semibold text-white">Edit Profil</h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
            >
              <X size={15} />
            </button>
          </div>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
            <p className="rounded-xl bg-blue-50 px-3.5 py-2.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
              Lengkapi data diri kamu di bawah ini.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Jenis Kelamin</label>
              <select value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)} className={INPUT}>
                <option value="">— pilih —</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tempat Lahir</label>
                <input type="text" value={tempatLahir} onChange={(e) => setTempatLahir(e.target.value)}
                  placeholder="Kota" className={INPUT} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tanggal Lahir</label>
                <input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Nama Orang Tua</label>
              <input type="text" value={namaOrtu} onChange={(e) => setNamaOrtu(e.target.value)}
                placeholder="Nama orang tua/wali" className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">No. HP</label>
              <input type="tel" value={noHp} onChange={(e) => setNoHp(e.target.value)}
                placeholder="Contoh: 08123456789" className={INPUT} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-700 dark:bg-white/4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Alamat Lengkap</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Dukuh/Dusun</label>
                  <input type="text" value={dukuh} onChange={(e) => setDukuh(e.target.value)}
                    placeholder="Dukuh" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">RT</label>
                  <input type="text" value={rt} onChange={(e) => setRt(e.target.value)}
                    placeholder="003" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">RW</label>
                  <input type="text" value={rw} onChange={(e) => setRw(e.target.value)}
                    placeholder="005" className={INPUT} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Desa/Kelurahan</label>
                  <input type="text" value={desa} onChange={(e) => setDesa(e.target.value)}
                    placeholder="Desa" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Kecamatan</label>
                  <input type="text" value={kecamatan} onChange={(e) => setKecamatan(e.target.value)}
                    placeholder="Kecamatan" className={INPUT} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Kabupaten/Kota</label>
                  <input type="text" value={kabupaten} onChange={(e) => setKabupaten(e.target.value)}
                    placeholder="Kabupaten" className={INPUT} />
                </div>
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700/50">
            <button onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/5">
              Batal
            </button>
            <motion.button
              onClick={handleSave} disabled={saving}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,100,224,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: kelasGradient }}
            >
              {saving
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <Check size={15} />}
              Simpan
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}

function InfoField({
  icon: Icon, label, value, iconBg, iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: iconBg }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-white" title={value || "—"}>{value || "—"}</p>
      </div>
    </div>
  );
}

function SectionCard({
  title, gradient, icon: Icon, children, action,
}: {
  title: string;
  gradient: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-[#1C2B33]">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ background: gradient, color: gradient === "#C3F84A" ? "#1C2B33" : "#FFFFFF", borderBottom: "1px solid rgba(255,255,255,0.15)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: gradient === "#C3F84A" ? "#1C2B331A" : "#FFFFFF33" }}>
            <Icon size={14} />
          </div>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {action}
      </div>
      <div className="space-y-2.5 p-4">{children}</div>
    </div>
  );
}

function MiniStat({
  label, value, gradient, icon: Icon,
}: { label: string; value: string; gradient: string; icon: React.ElementType }) {
  const fg = gradient === "#C3F84A" ? "#1C2B33" : "#FFFFFF";
  return (
    <div className="relative overflow-hidden rounded-xl p-3 text-center" style={{ background: gradient, color: fg }}>
      <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full" style={{ backgroundColor: `${fg}1a` }} />
      <div className="relative flex items-center justify-center gap-1">
        <Icon size={11} style={{ color: `${fg}B3` }} />
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: `${fg}B3` }}>{label}</p>
      </div>
      <p className="relative mt-0.5 text-sm font-extrabold leading-tight">{value}</p>
    </div>
  );
}

export default function SiswaProfilPage() {
  const [profil, setProfil] = useState<SiswaProfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showChangeFoto, setShowChangeFoto] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/siswa/saya")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProfil)
      .catch(() => setError("Profil tidak ditemukan. Hubungi admin."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#0082FB] border-t-violet-600" />
      </div>
    );
  }

  if (error || !profil) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <User size={32} className="text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm text-slate-400">{error || "Profil tidak ditemukan."}</p>
      </div>
    );
  }

  const nama = toTitleCase(getNama(profil));
  const isP = profil.jenisKelamin === "Perempuan";
  const kelasGrad = PROFILE_CARD_GRADIENT;
  const avatarGrad = isP
    ? "#0082FB"
    : kelasGrad;
  const tglLahir = [profil.tempatLahir, formatTanggal(profil.tanggalLahir)].filter(Boolean).join(", ") || "—";
  const jurusanShort = (profil.jurusan ?? "—")
    .replace("Pengembangan Perangkat Lunak dan Gim", "PPLG")
    .replace("Rekayasa Perangkat Lunak", "RPL")
    .replace("Pengembangan Gim", "Gim");

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
              <User size={22} className="text-white sm:hidden" />
              <User size={26} className="hidden text-white sm:block" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Profil Saya</span>
              <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Profil Saya</h1>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-5 lg:grid-cols-3"
      >
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700/50 dark:bg-[#1C2B33]">
          <div className="relative h-24" style={{ background: kelasGrad }}>
            <span className="absolute right-3 top-3 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {kelasShort(profil.kelas.nama)}
            </span>
          </div>

          <div className="flex flex-col items-center px-6 pb-6">
            <div className="relative -mt-12 mb-4">
              <div className="rounded-full shadow-xl ring-4 ring-white dark:ring-[#1C2B33]">
                <Avatar
                  src={profil.user?.fotoProfil}
                  nama={nama}
                  sizePx={96}
                  fallbackBg={avatarGrad}
                  textClassName="text-2xl font-extrabold"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowChangeFoto(true)}
                title="Ganti foto profil"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition hover:brightness-90 dark:border-[#1C2B33]"
                style={{ background: kelasGrad }}
              >
                <Camera size={13} />
              </button>
            </div>

            <h2 className="text-center text-lg font-extrabold text-slate-800 dark:text-white">{nama}</h2>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600/10 px-3.5 py-1.5 dark:bg-blue-400/15">
              <IdCard size={14} className="text-blue-600 dark:text-blue-300" />
              <span className="font-mono text-sm font-extrabold tracking-wide text-blue-600 dark:text-blue-300">
                NIS {profil.nis}
              </span>
            </div>
            {profil.user?.email && (
              <div className="mt-1 flex items-center gap-1.5">
                <Mail size={11} className="text-slate-400" />
                <span className="text-xs text-slate-400 dark:text-slate-500">{profil.user.email}</span>
              </div>
            )}

            {profil.jenisKelamin && (
              <span className={`mt-3 rounded-lg px-3.5 py-1.5 text-[11px] font-bold ${
                isP
                  ? "bg-[#0082FB] text-[#0082FB] dark:bg-[#0064E0]/20 dark:text-[#0082FB]"
                  : "bg-[#0082FB] text-[#0082FB] dark:bg-[#0064E0]/20 dark:text-[#0082FB]"
              }`}>
                {profil.jenisKelamin}
              </span>
            )}

            <div className="my-5 w-full border-t border-slate-100 dark:border-slate-700/50" />

            <div className="grid w-full grid-cols-2 gap-2.5">
              <MiniStat label="Angkatan" value={String(profil.angkatan)}
                gradient={ACCENT_VIOLET} icon={Calendar} />
              <MiniStat label="Jurusan" value={jurusanShort}
                gradient={ACCENT_ORANGE} icon={BookOpen} />
            </div>

            <motion.button
              onClick={() => setShowEdit(true)}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,100,224,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
              style={{ background: kelasGrad }}
            >
              <Pencil size={14} />
              Edit Profil
            </motion.button>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <SectionCard
            title="Informasi Pribadi"
            icon={User}
            gradient={ACCENT_VIOLET}
          >
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoField icon={Users} label="Jenis Kelamin" value={profil.jenisKelamin}
                iconBg={isP ? "#EAF3FF" : "#EAF3FF"} iconColor={isP ? "#1C2B33" : "#0082FB"} />
              <InfoField icon={Calendar} label="Tempat, Tgl Lahir" value={tglLahir}
                iconBg="#EAF3FF" iconColor="#0064E0" />
              <InfoField icon={GraduationCap} label="Kelas" value={profil.kelas.nama}
                iconBg="#EAF3FF" iconColor="#0064E0" />
              <InfoField icon={BookOpen} label="Jurusan" value={profil.jurusan}
                iconBg="#EAF3FF" iconColor="#0064E0" />
              <InfoField icon={Users} label="Nama Orang Tua" value={profil.namaOrtu}
                iconBg="#E3FBF0" iconColor="#00D67F" />
              <InfoField icon={Hash} label="NIS" value={profil.nis}
                iconBg="#EAF3FF" iconColor="#0082FB" />
            </div>
          </SectionCard>

          <SectionCard
            title="Kontak & Lokasi"
            icon={Phone}
            gradient={ACCENT_ORANGE}
            action={
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/30"
              >
                <Pencil size={11} />
                Edit
              </button>
            }
          >
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoField icon={Phone} label="No. HP" value={profil.noHp}
                iconBg="#EAF3FF" iconColor="#0082FB" />
              <InfoField icon={MapPin} label="Alamat Lengkap" value={formatAlamatLengkap(profil)}
                iconBg="#EAF3FF" iconColor="#0082FB" />
            </div>
          </SectionCard>
        </div>
      </motion.div>

      {showEdit && (
        <EditProfilModal
          siswa={profil}
          kelasGradient={kelasGrad}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => { setProfil(updated); setShowEdit(false); }}
        />
      )}

      {showChangeFoto && (
        <ChangeFotoProfilModal gradient={kelasGrad} onClose={() => setShowChangeFoto(false)} />
      )}
    </div>
  );
}
