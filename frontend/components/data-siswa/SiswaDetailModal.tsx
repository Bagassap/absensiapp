"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, User, GraduationCap, BookOpen, Phone, UserCheck, Users, Pencil, X, MapPin, CheckCircle2, Hash,
} from "lucide-react";
import {
  type SiswaCardData, toTitleCase, getNama, kelasShort, formatTempatTanggalLahir, formatAlamatLengkap,
  completeness, missingFields, waLink,
} from "./shared";
import { Avatar } from "@/components/shared/Avatar";
import { ProgressRing } from "./ProgressRing";

const HEADER_GRADIENT = "#0082FB";
// Warna persis dari referensi Nasabah - lihat catatan yang sama di FilterBar.tsx.
const REF_PRIMARY = "#0082FB";

function FieldItem({ icon: Icon, label, value, full, href }: {
  icon: React.ElementType; label: string; value: string | null | undefined; full?: boolean; href?: string | null;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        <Icon size={12} className="shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title="Kirim pesan WhatsApp"
          className="mt-1.5 inline-block break-words text-[15px] font-bold text-emerald-600 transition-colors hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1.5 break-words text-[15px] font-bold text-slate-800 dark:text-white">
          {value || "—"}
        </p>
      )}
    </div>
  );
}

export function SiswaDetailModal({ siswa, onEdit, onClose }: {
  siswa: SiswaCardData; onEdit?: () => void; onClose: () => void;
}) {
  const displayNama = toTitleCase(getNama(siswa));
  const tempatTanggal = formatTempatTanggalLahir(siswa.tempatLahir, siswa.tanggalLahir);
  const waliKelas = siswa.kelas.waliKelasGuru?.user.nama ?? null;
  const alamatLengkap = formatAlamatLengkap(siswa);
  const pct = completeness(siswa);
  const missing = missingFields(siswa);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-slate-800 sm:mx-0">

          {/* Bagian 1 — header profil (~30%) */}
          <div className="relative shrink-0 overflow-hidden px-6 py-5" style={{ background: HEADER_GRADIENT }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/8" />

            <button onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30">
              <X size={15} />
            </button>

            <div className="relative flex items-center gap-4">
              <div className="rounded-full border border-white/40" style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.18)" }}>
                <Avatar
                  src={siswa.user?.fotoProfil}
                  nama={displayNama}
                  sizePx={64}
                  fallbackBg="rgba(255,255,255,0.22)"
                  textClassName="text-lg font-extrabold"
                />
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-[19px] font-extrabold leading-tight text-white">{displayNama}</h2>
                <p className="mt-1 font-mono text-xs text-white/70">NIS: {siswa.nis}</p>
                <span className="mt-2 inline-flex items-center rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                  {kelasShort(siswa.kelas.nama)}
                </span>
              </div>
            </div>
          </div>

          {/* Bagian 2 — detail informasi (~70%) */}
          <div className="px-4 py-5 sm:px-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <Hash size={12} style={{ color: REF_PRIMARY }} />
                    Informasi Rekening
                  </p>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-700/50">
                    <FieldItem icon={Hash} label="NIS" value={siswa.nis} />
                    <FieldItem icon={GraduationCap} label="Kelas" value={kelasShort(siswa.kelas.nama)} />
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <User size={12} style={{ color: REF_PRIMARY }} />
                    Informasi Pribadi
                  </p>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-700/50">
                    <FieldItem icon={CalendarDays} label="Tempat & Tanggal Lahir" value={tempatTanggal} full />
                    <FieldItem icon={User} label="Jenis Kelamin" value={siswa.jenisKelamin} />
                    <FieldItem icon={Phone} label="No. HP" value={siswa.noHp} href={waLink(siswa.noHp)} />
                    <FieldItem icon={MapPin} label="Alamat" value={alamatLengkap} full />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-700/30">
                  <ProgressRing percent={pct} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-white">Kelengkapan Data {pct}%</p>
                    {missing.length === 0 ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} /> Semua data sudah lengkap
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        Belum lengkap: {missing.map((m) => m.label).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: REF_PRIMARY }}>
                    <GraduationCap size={12} />
                    Informasi Sekolah
                  </p>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl p-3" style={{ borderWidth: 1, borderColor: `${REF_PRIMARY}33`, backgroundColor: `${REF_PRIMARY}0d` }}>
                    <FieldItem icon={BookOpen} label="Jurusan" value={siswa.jurusan} full />
                    <FieldItem icon={GraduationCap} label="Angkatan" value={String(siswa.angkatan)} />
                    <FieldItem icon={UserCheck} label="Wali Kelas" value={waliKelas} full />
                    <FieldItem icon={Users} label="Nama Orang Tua" value={siswa.namaOrtu} full />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-3.5 dark:border-slate-700/50">
              <button
                type="button" onClick={onClose}
                className="rounded-lg border-2 border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={12} className="mr-1 inline" /> Tutup
              </button>
              {onEdit && (
                <motion.button
                  type="button" onClick={onEdit}
                  whileHover={{ scale: 1.03, boxShadow: "0 8px 20px rgba(0,100,224,0.4)" }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
                  style={{ background: HEADER_GRADIENT }}
                >
                  <Pencil size={12} /> Edit Data
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
