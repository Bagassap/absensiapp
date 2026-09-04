"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, MapPin, Camera, CheckCircle2, Loader2, Clock,
  FileSignature, ArrowRight, ChevronLeft, CalendarX2, UserCheck, FileText,
  Check, StickyNote,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { SignaturePad } from "@/components/absensi-harian/SignaturePad";
import { CameraCapture } from "@/components/absensi-harian/CameraCapture";
import { todayJakarta } from "@/components/absensi-harian/shared";
import { StatistikAbsensiChart } from "@/components/absensi-harian/StatistikAbsensiChart";
import type { KegiatanUntukGuru } from "@/components/absensi-harian/types";
import { LiveClock } from "@/components/shared/LiveClock";
import { compressImage, readAsDataUrl, describePhotoError } from "@/lib/compressImage";

const INSECURE_CONTEXT_MSG = "Akses GPS memerlukan koneksi aman. Silakan buka lewat domain https, jangan menggunakan alamat IP langsung.";

type Step = "SELFIE" | "FORM" | "DONE";
type KehadiranStats = { totalKegiatanDiikuti: number; totalKegiatan: number };

// Wizard absen kegiatan — dipakai bersama oleh guru (/guru/absensi-harian)
// dan admin (/admin/absensi-saya), karena admin juga berstatus guru dan
// perlu bisa mencatat kehadirannya sendiri untuk kegiatan yang sama.
export function AbsensiSayaWizard() {
  const toast = useToast();
  const today = todayJakarta();

  const [kegiatanList, setKegiatanList] = useState<KegiatanUntukGuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("SELFIE");
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<KegiatanUntukGuru | null>(null);
  const [stats, setStats] = useState<KehadiranStats | null>(null);

  const [selectedId, setSelectedId] = useState<string>("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [compressingFoto, setCompressingFoto] = useState(false);
  const [lokasi, setLokasi] = useState<string | null>(null);
  const [lokasiLoading, setLokasiLoading] = useState(false);
  const [lokasiError, setLokasiError] = useState<string | null>(null);
  const [ttd, setTtd] = useState<string | null>(null);
  const [status, setStatus] = useState<"HADIR" | "IZIN">("HADIR");

  const loadKegiatan = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/absensi-harian/saya?tanggal=${today}`);
      const d = await res.json().catch(() => null);
      setKegiatanList(Array.isArray(d?.kegiatan) ? d.kegiatan : []);
    } catch {
      if (!silent) toast.error("Gagal memuat kegiatan hari ini", "");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [today]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/guru");
      const d = await res.json().catch(() => null);
      if (d?.kehadiran) {
        setStats({ totalKegiatanDiikuti: d.kehadiran.totalKegiatanDiikuti ?? 0, totalKegiatan: d.kehadiran.totalKegiatan ?? 0 });
      }
    } catch {
      // Statistik bersifat pelengkap — kegagalan diam-diam, wizard absen tetap jalan
    }
  }, []);

  useEffect(() => { loadKegiatan(); loadStats(); }, [loadKegiatan, loadStats]);

  useEffect(() => {
    const id = setInterval(() => loadKegiatan(true), 60_000);
    return () => clearInterval(id);
  }, [loadKegiatan]);

  const kegiatanBisaAbsen = useMemo(
    () => kegiatanList.filter((k) => k.window === "BUKA" && !k.sudahAbsen),
    [kegiatanList],
  );

  // Beda dengan "tidak ada kegiatan terbuka" (bisa berarti guru kelewatan
  // absen) — kalau SEMUA kegiatan hari ini sudah diabsen, itu kabar baik,
  // jadi tampilannya dibuat positif (centang biru), bukan ikon merah.
  const allSudahAbsen = kegiatanList.length > 0 && kegiatanBisaAbsen.length === 0
    && kegiatanList.every((k) => k.sudahAbsen);

  useEffect(() => {
    if (kegiatanBisaAbsen.length > 0 && !selectedId) {
      setSelectedId(kegiatanBisaAbsen[0].id);
    }
  }, [kegiatanBisaAbsen, selectedId]);

  const requestLokasi = useCallback(() => {
    setLokasi(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLokasiError(INSECURE_CONTEXT_MSG);
      return;
    }
    if (!navigator.geolocation) {
      setLokasiError("Perangkat/browser ini tidak mendukung deteksi lokasi GPS.");
      return;
    }
    setLokasiError(null);
    setLokasiLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLokasi(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        setLokasiError(null);
        setLokasiLoading(false);
      },
      (err) => {
        setLokasiLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLokasiError("Izin lokasi ditolak. Aktifkan izin GPS untuk situs ini di pengaturan browser, lalu coba lagi.");
        } else if (err.code === err.TIMEOUT) {
          setLokasiError("Deteksi lokasi timeout. Pastikan GPS aktif dan sinyal memadai, lalu coba lagi.");
        } else {
          setLokasiError("Lokasi tidak dapat dideteksi. Coba lagi.");
        }
      },
      { timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (step === "FORM") requestLokasi();
  }, [step, requestLokasi]);

  async function processFotoFile(file: File) {
    setCompressingFoto(true);
    try {
      const compressed = await compressImage(file);
      const preview = await readAsDataUrl(compressed);
      setFotoFile(compressed);
      setFotoPreview(preview);
    } catch {
      const { title, detail } = describePhotoError();
      toast.error(title, detail);
      setFotoFile(null);
      setFotoPreview(null);
    } finally {
      setCompressingFoto(false);
    }
  }

  function goToForm() {
    if (!fotoFile) { toast.error("Foto selfie wajib diambil", ""); return; }
    setStep("FORM");
  }

  function resetForNext() {
    setStep("SELFIE");
    setFotoFile(null);
    setFotoPreview(null);
    setLokasi(null);
    setLokasiError(null);
    setTtd(null);
    setSelectedId("");
    setStatus("HADIR");
  }

  async function handleSubmit() {
    if (!selectedId) { toast.error("Pilih kegiatan terlebih dahulu", ""); return; }
    if (!lokasi) { toast.error("Lokasi (GPS) wajib diisi", ""); return; }
    if (!fotoFile) { toast.error("Foto selfie wajib diisi", ""); return; }
    if (!ttd) { toast.error("Tanda tangan wajib diisi", ""); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("kegiatanId", selectedId);
      formData.set("lokasi", lokasi);
      formData.set("ttd", ttd);
      formData.set("foto", fotoFile);
      formData.set("status", status);

      const res = await fetch("/api/absensi-harian/saya", { method: "POST", body: formData });
      if (res.ok) {
        const kegiatan = kegiatanList.find((k) => k.id === selectedId) ?? null;
        toast.success("Absensi kegiatan berhasil dicatat!", kegiatan ? kegiatan.nama : "");
        setLastSubmitted(kegiatan);
        setStep("DONE");
        loadKegiatan(true);
        loadStats();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal mencatat absensi", "");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedKegiatan = kegiatanList.find((k) => k.id === selectedId) ?? null;
  const sisaKegiatan = kegiatanBisaAbsen.filter((k) => k.id !== selectedId).length;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "#013920" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 right-28 h-52 w-52 rounded-full bg-white/6" />

        <div className="relative flex items-center gap-3 sm:gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.05 }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
            <ClipboardCheck size={22} className="text-white sm:hidden" />
            <ClipboardCheck size={26} className="hidden text-white sm:block" />
          </motion.div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Presensi Kegiatan</span>
            <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Absensi Kegiatan</h1>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-8">
      <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#000000]" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {step === "DONE" ? (
              <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center px-6 py-12 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, delay: 0.1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: "#00C853" }}>
                  <CheckCircle2 size={30} className="text-white" />
                </motion.div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-800 dark:text-white">Absensi Tercatat</h2>
                <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  Kehadiran Anda untuk kegiatan <b>{lastSubmitted?.nama ?? "-"}</b> berhasil dicatat.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  {sisaKegiatan > 0 && (
                    <button onClick={resetForNext}
                      className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md"
                      style={{ backgroundColor: "#00C853" }}>
                      Absen Kegiatan Lain ({sisaKegiatan})
                    </button>
                  )}
                  <button onClick={resetForNext}
                    className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                    style={{ backgroundColor: "#EF4444" }}>
                    Selesai
                  </button>
                </div>
              </motion.div>
            ) : allSudahAbsen ? (
              <motion.div key="all-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center px-6 py-12 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 11, stiffness: 260, delay: 0.05 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full shadow-lg" style={{ backgroundColor: "#3B82F6" }}>
                  <Check size={38} className="text-white" strokeWidth={3.5} />
                </motion.div>
                <h2 className="mt-5 text-xl font-extrabold text-slate-800 dark:text-white">Sudah Absen</h2>
                <p className="mt-1.5 max-w-sm text-sm text-slate-400 dark:text-slate-500">
                  Semua kegiatan hari ini sudah Anda ikuti. Terima kasih!
                </p>
                <div className="mt-6 w-full max-w-sm space-y-2 text-left">
                  {kegiatanList.map((k) => (
                    <div key={k.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-bold text-slate-700 dark:text-slate-200">{k.nama}</span>
                        <span className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ backgroundColor: "#3B82F6" }}>
                          <Check size={10} strokeWidth={3.5} /> {k.waktuAbsen}
                        </span>
                      </div>
                      {k.status === "IZIN" && (
                        <span className="mt-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold text-white" style={{ backgroundColor: "#F59E0B" }}>
                          Izin
                        </span>
                      )}
                      {k.catatan && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 dark:bg-blue-950/30">
                          <StickyNote size={12} className="mt-0.5 shrink-0" style={{ color: "#3B82F6" }} />
                          <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">{k.catatan}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : kegiatanBisaAbsen.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "#EF4444" }}>
                  <CalendarX2 size={26} className="text-white" />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-800 dark:text-white">
                  {kegiatanList.length === 0 ? "Belum Ada Kegiatan" : "Tidak Ada Kegiatan Terbuka"}
                </h2>
                <p className="mt-1.5 max-w-sm text-sm text-slate-400 dark:text-slate-500">
                  {kegiatanList.length === 0
                    ? "Belum ada kegiatan yang dijadwalkan admin untuk hari ini."
                    : "Semua kegiatan hari ini sudah Anda absen atau sudah di luar jam yang ditentukan."}
                </p>
                {kegiatanList.length > 0 && (
                  <div className="mt-5 w-full max-w-sm space-y-1.5 text-left">
                    {kegiatanList.map((k) => (
                      <div key={k.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-700/30">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{k.nama}</span>
                        <span className="font-medium text-slate-400">{k.jamLabel}{k.sudahAbsen ? " · Sudah absen" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : step === "SELFIE" ? (
              <motion.div key="selfie" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center gap-3 px-6 pt-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#00C85318" }}>
                    <Camera size={26} style={{ color: "#00C853" }} />
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Ambil Foto Selfie</h2>
                  <p className="max-w-xs text-[11px] font-medium text-red-500">
                    Jika absensi kurang sesuai dengan kegiatan maka tidak terverifikasi.
                  </p>
                  <LiveClock variant="header" />
                </div>

                <div className="flex flex-col items-center gap-4 px-6 py-8">
                  {fotoPreview ? (
                    <div className="relative">
                      <img src={fotoPreview} alt="Preview selfie" className="h-48 w-48 rounded-2xl object-cover shadow-md" style={{ boxShadow: "0 0 0 3px #00C853" }} />
                      <button onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                        className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md" style={{ backgroundColor: "#EF4444" }}>
                        ×
                      </button>
                    </div>
                  ) : compressingFoto ? (
                    <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 dark:border-slate-600">
                      <Loader2 size={28} className="animate-spin" />
                      <span className="text-xs font-semibold">Memproses foto...</span>
                    </div>
                  ) : (
                    <CameraCapture onCapture={processFotoFile} disabled={compressingFoto} />
                  )}

                  <motion.button whileTap={{ scale: 0.98 }} onClick={goToForm}
                    disabled={!fotoFile || compressingFoto}
                    className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                    style={{ backgroundColor: "#EF4444" }}>
                    Lanjut <ArrowRight size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4">
                <div className="flex items-center gap-3 px-5 pt-5">
                  <button onClick={() => setStep("SELFIE")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white hover:brightness-110" style={{ backgroundColor: "#00C853" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-800 dark:text-white">Isi Absensi Kegiatan</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Pilih kegiatan, lengkapi lokasi & tanda tangan</p>
                  </div>
                </div>

                <div className="space-y-4 px-5 pb-5">
                  {selectedKegiatan && (
                    <div className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5" style={{ borderColor: "#00C85340", backgroundColor: "#00C85312" }}>
                      <ClipboardCheck size={16} className="shrink-0" style={{ color: "#00C853" }} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Anda sedang absen untuk kegiatan</p>
                        <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">{selectedKegiatan.nama} <span className="font-semibold text-slate-400">· {selectedKegiatan.jamLabel}</span></p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <ClipboardCheck size={12} /> Kegiatan <span className="text-red-400 normal-case">*wajib</span>
                    </p>
                    <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200">
                      {kegiatanBisaAbsen.map((k) => (
                        <option key={k.id} value={k.id}>{k.nama} ({k.jamLabel})</option>
                      ))}
                    </select>
                    {selectedKegiatan?.keterangan && (
                      <p className="mt-1 text-[11px] text-slate-400">{selectedKegiatan.keterangan}</p>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <UserCheck size={12} /> Status Kehadiran <span className="text-red-400 normal-case">*wajib</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setStatus("HADIR")}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-bold transition-colors ${
                          status === "HADIR" ? "border-transparent text-white" : "border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                        }`}
                        style={status === "HADIR" ? { backgroundColor: "#00C853" } : {}}>
                        <UserCheck size={15} /> Hadir
                      </button>
                      <button type="button" onClick={() => setStatus("IZIN")}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-bold transition-colors ${
                          status === "IZIN" ? "border-transparent text-white" : "border-slate-200 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                        }`}
                        style={status === "IZIN" ? { backgroundColor: "#F59E0B" } : {}}>
                        <FileText size={15} /> Izin
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <MapPin size={12} /> Lokasi <span className="text-red-400 normal-case">*wajib</span>
                    </p>
                    <div className={`flex h-12 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2.5 dark:bg-slate-900/40 ${
                      !lokasi ? "border-red-300 dark:border-red-800" : "border-slate-100 dark:border-slate-700"
                    }`}>
                      <MapPin size={15} className={lokasi ? "text-emerald-500" : "text-red-400"} />
                      {lokasiLoading ? (
                        <span className="text-xs text-slate-400">Mendeteksi lokasi...</span>
                      ) : lokasi ? (
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{lokasi}</span>
                      ) : (
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <span className="text-xs text-red-500">{lokasiError ?? "Lokasi belum terdeteksi"}</span>
                          <button type="button" onClick={requestLokasi} className="shrink-0 text-[11px] font-bold text-[#000000] hover:underline">
                            Coba lagi
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <FileSignature size={12} /> Tanda Tangan <span className="text-red-400 normal-case">*wajib</span>
                    </p>
                    <div className={!ttd ? "rounded-xl ring-2 ring-red-300" : ""}>
                      <SignaturePad onChange={setTtd} />
                    </div>
                  </div>

                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit}
                    disabled={submitting || !selectedId || !lokasi || !ttd}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                    style={{ backgroundColor: "#EF4444" }}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                    {submitting ? "Menyimpan..." : "Absen Sekarang"}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Statistik Absensi</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Rekap kegiatan yang sudah Anda ikuti</p>
        {stats && stats.totalKegiatan > 0 ? (
          <StatistikAbsensiChart
            diikuti={stats.totalKegiatanDiikuti}
            belum={Math.max(0, stats.totalKegiatan - stats.totalKegiatanDiikuti)}
            total={stats.totalKegiatan}
          />
        ) : (
          <p className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">Belum ada data kegiatan</p>
        )}
      </div>
      </div>
    </div>
  );
}
