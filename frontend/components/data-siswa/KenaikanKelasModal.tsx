"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpCircle, GraduationCap, Loader2, Users, ArrowRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import type { KelasRef } from "./shared";

// dark:[color-scheme:dark] penting di sini — tanpa itu, browser tetap
// merender popup <option> pakai tema terang bawaan OS meski <select>-nya
// sendiri sudah gelap (Tailwind dark: tidak bisa menjangkau elemen <option>),
// sehingga daftar kelas jadi teks gelap di atas background gelap saat dibuka.
const SELECT_CLS = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#0082FB] focus:bg-white focus:ring-2 focus:ring-[#0082FB]/15 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:[color-scheme:dark]";

// Jumlah siswa AKTIF di satu kelas — dihitung langsung dari /api/siswa
// (sudah difilter AKTIF di backend) supaya preview di modal ini selalu
// akurat, tidak pakai _count.siswa dari /api/kelas yang menghitung semua
// siswa termasuk yang sudah LULUS.
function useJumlahSiswaAktif(kelasId: string) {
  const [jumlah, setJumlah] = useState<number | null>(null);
  useEffect(() => {
    if (!kelasId) { setJumlah(null); return; }
    let cancelled = false;
    setJumlah(null);
    fetch(`/api/siswa?kelasId=${kelasId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setJumlah(Array.isArray(d) ? d.length : 0); })
      .catch(() => { if (!cancelled) setJumlah(0); });
    return () => { cancelled = true; };
  }, [kelasId]);
  return jumlah;
}

function NaikkanKelasTab({ kelasList, onDone }: { kelasList: KelasRef[]; onDone: () => void }) {
  const toast = useToast();
  const [dariKelasId, setDariKelasId] = useState("");
  const [keKelasId, setKeKelasId] = useState("");
  const [saving, setSaving] = useState(false);
  const jumlah = useJumlahSiswaAktif(dariKelasId);
  const dariNama = kelasList.find((k) => k.id === dariKelasId)?.nama;
  const keNama = kelasList.find((k) => k.id === keKelasId)?.nama;

  async function submit() {
    if (!dariKelasId || !keKelasId || !jumlah) return;
    const ok = await toast.confirm(
      "Naikkan semua siswa?",
      `${jumlah} siswa dari "${dariNama}" akan dipindahkan ke "${keNama}". Aksi ini tidak bisa dibatalkan otomatis — pastikan kelas tujuan sudah benar.`,
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/siswa/naikkan-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dariKelasId, keKelasId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error("Gagal menaikkan kelas", data?.message ?? ""); return; }
      toast.success("Kenaikan kelas berhasil!", `${data.jumlahSiswa} siswa dipindah ke ${data.keKelas}`);
      setDariKelasId(""); setKeKelasId("");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Pindahkan semua siswa aktif dari satu kelas ke kelas lain sekaligus (mis. akhir tahun ajaran, kelas X naik ke XI). Buat dulu kelas tujuannya lewat &ldquo;Kelola Kelas&rdquo; kalau belum ada.
      </p>
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">Dari Kelas</label>
          <select value={dariKelasId} onChange={(e) => setDariKelasId(e.target.value)} className={SELECT_CLS}>
            <option value="">Pilih kelas asal…</option>
            {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
        <ArrowRight size={18} className="mx-auto hidden text-slate-300 sm:block" />
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">Ke Kelas</label>
          <select value={keKelasId} onChange={(e) => setKeKelasId(e.target.value)} className={SELECT_CLS}>
            <option value="">Pilih kelas tujuan…</option>
            {kelasList.filter((k) => k.id !== dariKelasId).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
      </div>

      {dariKelasId && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Users size={14} />
          {jumlah === null ? "Menghitung…" : jumlah === 0 ? "Tidak ada siswa aktif di kelas ini" : `${jumlah} siswa aktif akan dipindahkan`}
        </div>
      )}

      <button onClick={submit} disabled={!dariKelasId || !keKelasId || !jumlah || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0082FB] px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpCircle size={15} />}
        {saving ? "Memproses…" : "Naikkan Semua Siswa"}
      </button>
    </div>
  );
}

function LuluskanKelasTab({ kelasList, onDone }: { kelasList: KelasRef[]; onDone: () => void }) {
  const toast = useToast();
  const [kelasId, setKelasId] = useState("");
  const [saving, setSaving] = useState(false);
  const jumlah = useJumlahSiswaAktif(kelasId);
  const nama = kelasList.find((k) => k.id === kelasId)?.nama;

  async function submit() {
    if (!kelasId || !jumlah) return;
    const ok = await toast.confirm(
      "Luluskan seluruh kelas ini?",
      `${jumlah} siswa dari "${nama}" akan ditandai LULUS dan akun login mereka akan DINONAKTIFKAN. Data & riwayat mereka tetap tersimpan, tapi tidak akan muncul lagi di Data Siswa aktif. Lanjutkan?`,
    );
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch("/api/siswa/luluskan-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error("Gagal meluluskan kelas", data?.message ?? ""); return; }
      toast.success("Kelulusan berhasil dicatat!", `${data.jumlahSiswa} siswa dari ${data.kelas} sekarang berstatus Lulus`);
      setKelasId("");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-[#F1F5F8] px-4 py-3 text-xs text-[#1C2B33] dark:bg-[#1C2B33]/20 dark:text-[#C3F84A]">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>Aksi ini menonaktifkan akun login semua siswa di kelas terpilih. Pastikan ini benar-benar kelas yang sudah menyelesaikan sekolah (biasanya kelas XII).</span>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">Kelas yang Lulus</label>
        <select value={kelasId} onChange={(e) => setKelasId(e.target.value)} className={SELECT_CLS}>
          <option value="">Pilih kelas…</option>
          {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {kelasId && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
          <Users size={14} />
          {jumlah === null ? "Menghitung…" : jumlah === 0 ? "Tidak ada siswa aktif di kelas ini" : `${jumlah} siswa aktif akan diluluskan`}
        </div>
      )}

      <button onClick={submit} disabled={!kelasId || !jumlah || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EF4444] px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <GraduationCap size={15} />}
        {saving ? "Memproses…" : "Luluskan Kelas Ini"}
      </button>
    </div>
  );
}

export function KenaikanKelasModal({
  open, onClose, kelasList, onDone,
}: {
  open: boolean;
  onClose: () => void;
  kelasList: KelasRef[];
  onDone: () => void;
}) {
  const [tab, setTab] = useState<"naik" | "lulus">("naik");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between gap-3 bg-[#0082FB] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <ArrowUpCircle size={18} className="text-white" />
                </span>
                <h2 className="text-sm font-extrabold text-white">Kenaikan Kelas &amp; Kelulusan</h2>
              </div>
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                <X size={15} />
              </button>
            </div>

            <div className="flex shrink-0 gap-1 border-b border-slate-100 px-5 pt-3 dark:border-slate-700">
              <button onClick={() => setTab("naik")}
                className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-xs font-bold transition-colors ${tab === "naik" ? "bg-blue-50 text-[#0082FB] dark:bg-blue-900/20" : "text-slate-400 hover:text-slate-600"}`}>
                <ArrowUpCircle size={13} /> Naikkan Kelas
              </button>
              <button onClick={() => setTab("lulus")}
                className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-xs font-bold transition-colors ${tab === "lulus" ? "bg-red-50 text-red-600 dark:bg-red-900/20" : "text-slate-400 hover:text-slate-600"}`}>
                <GraduationCap size={13} /> Luluskan Kelas
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tab === "naik"
                ? <NaikkanKelasTab kelasList={kelasList} onDone={onDone} />
                : <LuluskanKelasTab kelasList={kelasList} onDone={onDone} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
