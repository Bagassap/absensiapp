"use client";

import { motion } from "framer-motion";
import { Eye, ScanEye, KeyRound, Pencil, CheckCircle2, XCircle, GraduationCap, MessageCircle } from "lucide-react";
import {
  type SiswaCardData, toTitleCase, getNama, avatarColorFor, formatTempatTanggalLahir, completeness, waLink,
} from "./shared";
import { Avatar } from "@/components/shared/Avatar";
import { ProgressRing } from "./ProgressRing";

const TH = "whitespace-nowrap px-4 py-3 text-xs font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500";
const TD = "whitespace-nowrap px-4 py-3";
const TEXT = "text-sm font-medium text-slate-800 dark:text-white";

// Warna persis dari referensi Nasabah - lihat catatan yang sama di FilterBar.tsx.
const REF_PRIMARY = "#0082FB";
const REF_SUCCESS = "#00D67F";
const REF_DANGER = "#EF4444";

export function SiswaTableHead() {
  return (
    <tr>
      <th className={TH}>Nama Siswa</th>
      <th className={TH}>Status Password</th>
      <th className={TH}>Tempat & Tgl Lahir</th>
      <th className={TH}>No. HP</th>
      <th className={TH}>Kelengkapan Data</th>
      <th className={TH}>Aksi</th>
    </tr>
  );
}

export function SiswaTableRow({
  siswa, index, onEdit, onResetPassword, onImpersonate, onViewDetail,
}: {
  siswa: SiswaCardData;
  index: number;
  onEdit?: (s: SiswaCardData) => void;
  onResetPassword?: (s: SiswaCardData) => void;
  onImpersonate?: (s: SiswaCardData) => void;
  onViewDetail: (s: SiswaCardData) => void;
}) {
  const displayNama = toTitleCase(getNama(siswa));
  const accent = avatarColorFor(siswa.id || displayNama);
  const tempatTanggal = formatTempatTanggalLahir(siswa.tempatLahir, siswa.tanggalLahir);
  const pct = completeness(siswa);
  const sudahGanti = siswa.user ? siswa.user.mustChangePassword === false : null;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (index % 15) * 0.02 }}
      className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20"
    >
      <td className={TD}>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <Avatar src={siswa.user?.fotoProfil} nama={displayNama} sizePx={36} fallbackBg={accent} textClassName="text-[10px] font-extrabold" />
          </div>
          <div className="min-w-0">
            <p className={TEXT} title={displayNama}>{displayNama}</p>
            <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <GraduationCap size={11} />
              Siswa &middot; <span className="font-mono">{siswa.nis}</span>
            </p>
          </div>
        </div>
      </td>

      <td className={TD}>
        {sudahGanti === null ? (
          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
        ) : sudahGanti ? (
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${REF_SUCCESS}26`, color: REF_SUCCESS }}
          >
            <CheckCircle2 size={12} />
            Sudah Ganti
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <XCircle size={12} />
            Masih NIS
          </span>
        )}
      </td>

      <td className={`${TD} ${TEXT}`} title={tempatTanggal}>{tempatTanggal}</td>

      <td className={TD}>
        {siswa.noHp ? (
          <a
            href={waLink(siswa.noHp)!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Kirim pesan WhatsApp"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            <MessageCircle size={13} className="shrink-0" />
            {siswa.noHp}
          </a>
        ) : (
          <span className={TEXT}>—</span>
        )}
      </td>

      <td className={TD}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <ProgressRing percent={pct} />
            <span className="text-xs text-slate-400 dark:text-slate-500">{pct}%</span>
          </div>
          <button
            onClick={() => onViewDetail(siswa)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:brightness-95"
            style={{ backgroundColor: `${REF_PRIMARY}1a`, color: REF_PRIMARY }}
          >
            <Eye size={12} />
            Lihat Data
          </button>
        </div>
      </td>

      <td className={TD}>
        <div className="flex gap-2">
          {onEdit && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onEdit(siswa)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-95"
              style={{ backgroundColor: REF_PRIMARY }}
            >
              <Pencil size={12} />
              Edit
            </motion.button>
          )}
          {onImpersonate && siswa.user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onImpersonate(siswa)}
              className="flex items-center gap-1 rounded-lg bg-[#C3F84A] px-2.5 py-1.5 text-xs font-bold text-[#1C2B33] shadow-sm transition-colors hover:brightness-95"
            >
              <ScanEye size={12} />
              Pantau
            </motion.button>
          )}
          {onResetPassword && siswa.user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onResetPassword(siswa)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-95"
              style={{ backgroundColor: REF_DANGER }}
            >
              <KeyRound size={12} />
              Reset
            </motion.button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}
