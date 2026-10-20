"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, MapPin, Camera, CheckCircle2, Loader2, Clock,
  FileSignature, ArrowRight, ChevronLeft, ChevronRight, CalendarX2, UserCheck, FileText,
  Check, StickyNote, X, ExternalLink, Play, Lock,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { SignaturePad } from "@/components/absensi-harian/SignaturePad";
import { CameraCapture } from "@/components/absensi-harian/CameraCapture";
import { todayJakarta, parseLokasi, resolveMediaSrc, formatTgl } from "@/components/absensi-harian/shared";
import { StatistikAbsensiChart } from "@/components/absensi-harian/StatistikAbsensiChart";
import type { KegiatanUntukGuru } from "@/components/absensi-harian/types";
import { LiveClock } from "@/components/shared/LiveClock";
import { GradientStatScroller, SectionHeading } from "@/components/dashboard/GradientStatScroller";
import { compressImage, readAsDataUrl, describePhotoError } from "@/lib/compressImage";

const INSECURE_CONTEXT_MSG = "Akses GPS memerlukan koneksi aman. Silakan buka lewat domain https, jangan menggunakan alamat IP langsung.";

type Step = "SELFIE" | "FORM" | "DONE";
type KehadiranStats = { totalKegiatanDiikuti: number; totalKegiatan: number };

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

  const [mobileWizardOpen, setMobileWizardOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [mobileDirection, setMobileDirection] = useState(1);
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);
  const [absensiTab, setAbsensiTab] = useState<"BELUM" | "SUDAH">("BELUM");

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

  const belumList = useMemo(() => kegiatanList.filter((k) => !k.sudahAbsen), [kegiatanList]);
  const sudahList = useMemo(() => kegiatanList.filter((k) => k.sudahAbsen), [kegiatanList]);

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
    if (step === "FORM" || mobileWizardOpen) requestLokasi();
  }, [step, mobileWizardOpen, requestLokasi]);

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
    setMobileWizardOpen(false);
  }

  function openMobileWizard(kegiatanId: string) {
    setSelectedId(kegiatanId);
    setFotoFile(null);
    setFotoPreview(null);
    setLokasi(null);
    setLokasiError(null);
    setTtd(null);
    setStatus("HADIR");
    setMobileDirection(1);
    setMobileStep(0);
    setMobileWizardOpen(true);
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
        if (mobileWizardOpen) {
          setMobileWizardOpen(false);
        } else {
          setStep("DONE");
        }
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
        className="relative hidden overflow-hidden rounded-2xl p-6 lg:block"
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

      <div className="hidden lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
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
                  Semua kegiatan hari ini sudah Anda ikuti. Terima kasih! Lihat rinciannya di bawah.
                </p>
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

      {kegiatanList.some((k) => k.sudahAbsen) && (
        <div className="hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:block">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Riwayat Absensi Hari Ini</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Kegiatan yang sudah Anda absen, termasuk catatan dari Ketenagaan (jika ada)</p>
          <div className="mt-4 space-y-2">
            {kegiatanList.filter((k) => k.sudahAbsen).map((k) => (
              <div key={k.id} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-700">
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
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B82F6" }}>Catatan dari Ketenagaan</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300">{k.catatan}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative -m-4 lg:hidden">
        <div className="space-y-4 bg-transparent p-4 dark:bg-slate-900">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-[#00C853]" />
            </div>
          ) : kegiatanList.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:bg-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#EF444418" }}>
                <CalendarX2 size={24} style={{ color: "#EF4444" }} />
              </div>
              <h2 className="mt-3 text-sm font-extrabold text-slate-800 dark:text-white">Belum Ada Kegiatan</h2>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Belum ada kegiatan yang dijadwalkan admin untuk hari ini.</p>
            </div>
          ) : (
            <>
              <GradientStatScroller
                items={[
                  { key: "progres", label: "Progres", value: kegiatanList.length > 0 ? Math.round((sudahList.length / kegiatanList.length) * 100) : 0, suffix: "%", tone: "indigo", caption: `${sudahList.length} dari ${kegiatanList.length} kegiatan` },
                  { key: "sudah", label: "Sudah Absen", value: sudahList.length, tone: "green", caption: "kegiatan diikuti", onClick: () => setAbsensiTab("SUDAH") },
                  { key: "belum", label: "Belum Absen", value: belumList.length, tone: "orange", caption: "kegiatan tersisa", onClick: () => setAbsensiTab("BELUM") },
                ]}
              />

              <SectionHeading title="Kegiatan Hari Ini" action={formatTgl(today)} onAction={() => {}} />

              <div className="relative rounded-full bg-white p-1 shadow-[0_2px_6px_rgba(0,0,0,0.06)] dark:bg-slate-800">
                <motion.div className="absolute inset-y-1 rounded-full" style={{ width: "50%", background: absensiTab === "BELUM" ? "#EF4444" : "#00C853" }}
                  animate={{ x: absensiTab === "BELUM" ? "0%" : "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} />
                <div className="relative z-10 grid grid-cols-2">
                  <button type="button" onClick={() => setAbsensiTab("BELUM")}
                    className="rounded-full py-2.5 text-center text-xs font-bold transition-colors"
                    style={{ color: absensiTab === "BELUM" ? "#fff" : "#64748B" }}>
                    Belum Absen ({belumList.length})
                  </button>
                  <button type="button" onClick={() => setAbsensiTab("SUDAH")}
                    className="rounded-full py-2.5 text-center text-xs font-bold transition-colors"
                    style={{ color: absensiTab === "SUDAH" ? "#fff" : "#64748B" }}>
                    Sudah Absen ({sudahList.length})
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white px-4 dark:bg-slate-800">
                {(absensiTab === "BELUM" ? belumList : sudahList).length === 0 ? (
                  <p className="py-8 text-center text-xs font-medium text-slate-400">
                    {absensiTab === "BELUM" ? "Semua kegiatan hari ini sudah Anda absen." : "Belum ada kegiatan yang Anda absen hari ini."}
                  </p>
                ) : (
                  (absensiTab === "BELUM" ? belumList : sudahList).map((k) => (
                    <KegiatanListRow key={k.id} k={k}
                      onAction={() => openMobileWizard(k.id)}
                      onDetail={() => setMobileDetailId(k.id)}
                    />
                  ))
                )}
              </div>

              <motion.button type="button" whileTap={{ scale: 0.98 }}
                onClick={() => kegiatanBisaAbsen[0] && openMobileWizard(kegiatanBisaAbsen[0].id)}
                disabled={kegiatanBisaAbsen.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-sm font-bold text-white shadow-[0_10px_20px_-8px_rgba(239,68,68,0.55)] disabled:opacity-50 disabled:shadow-none"
                style={{ backgroundColor: "#EF4444" }}>
                <Clock size={16} />
                {kegiatanBisaAbsen.length === 0 ? "Tidak Ada Kegiatan Dibuka" : `Absensi Sekarang — ${kegiatanBisaAbsen[0].nama}`}
              </motion.button>
            </>
          )}

          <MobileKegiatanWizard
            open={mobileWizardOpen}
            onClose={() => { if (!submitting) setMobileWizardOpen(false); }}
            kegiatan={selectedKegiatan}
            step={mobileStep} setStep={setMobileStep}
            direction={mobileDirection} setDirection={setMobileDirection}
            fotoPreview={fotoPreview} onCaptureFoto={processFotoFile} compressingFoto={compressingFoto}
            onFotoClear={() => { setFotoFile(null); setFotoPreview(null); }}
            lokasi={lokasi} lokasiLoading={lokasiLoading} lokasiError={lokasiError} onRetryLokasi={requestLokasi}
            status={status} setStatus={setStatus}
            ttd={ttd} setTtd={setTtd}
            submitting={submitting} onSubmit={handleSubmit}
          />

          <AnimatePresence>
            {mobileDetailId && (() => {
              const k = kegiatanList.find((x) => x.id === mobileDetailId);
              if (!k) return null;
              return <MobileDetailSheet key="detail" onClose={() => setMobileDetailId(null)} k={k} />;
            })()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function KegiatanListRow({ k, onAction, onDetail }: {
  k: KegiatanUntukGuru;
  onAction: () => void;
  onDetail: () => void;
}) {
  const done = k.sudahAbsen;
  const actionable = !done && k.window === "BUKA";
  const isIzin = k.status === "IZIN";
  const accent = done ? (isIzin ? "#F59E0B" : "#00C853") : actionable ? "#00C853" : "#94A3B8";

  return (
    <button type="button" onClick={done ? onDetail : actionable ? onAction : undefined}
      disabled={!done && !actionable}
      className="flex w-full items-center gap-3 border-b border-slate-100 py-3.5 text-left last:border-0 disabled:cursor-default dark:border-slate-700/50">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1E` }}>
        {done ? <Check size={18} strokeWidth={3} style={{ color: accent }} />
          : actionable ? <Play size={16} fill={accent} style={{ color: accent }} />
          : <Lock size={15} style={{ color: accent }} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{k.nama}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
          {done ? `Diabsen ${k.waktuAbsen}${isIzin ? " · Izin" : ""}` : k.window === "BELUM_MULAI" ? `Mulai ${k.jamLabel}` : actionable ? k.jamLabel : `Ditutup · ${k.jamLabel}`}
        </p>
        {done && k.catatan && (
          <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug" style={{ color: "#3B82F6" }}>
            <StickyNote size={11} className="mt-0.5 shrink-0" />
            <span className="min-w-0 truncate">{k.catatan}</span>
          </p>
        )}
      </div>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1E` }}>
        {done ? <ChevronRight size={14} style={{ color: accent }} />
          : actionable ? <ChevronRight size={14} style={{ color: accent }} />
          : <Lock size={11} style={{ color: accent }} />}
      </span>
    </button>
  );
}

function MobileKegiatanWizard({
  open, onClose, kegiatan, step, setStep, direction, setDirection,
  fotoPreview, onCaptureFoto, compressingFoto, onFotoClear,
  lokasi, lokasiLoading, lokasiError, onRetryLokasi,
  status, setStatus,
  ttd, setTtd,
  submitting, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  kegiatan: KegiatanUntukGuru | null;
  step: number; setStep: (n: number) => void;
  direction: number; setDirection: (n: number) => void;
  fotoPreview: string | null; onCaptureFoto: (f: File) => void; compressingFoto: boolean; onFotoClear: () => void;
  lokasi: string | null; lokasiLoading: boolean; lokasiError: string | null; onRetryLokasi: () => void;
  status: "HADIR" | "IZIN"; setStatus: (s: "HADIR" | "IZIN") => void;
  ttd: string | null; setTtd: (v: string | null) => void;
  submitting: boolean; onSubmit: () => void;
}) {
  const steps = ["foto", "lokasi", "status", "ttd"] as const;
  const stepLabels: Record<(typeof steps)[number], string> = { foto: "Foto Selfie", lokasi: "Lokasi", status: "Status Kehadiran", ttd: "Tanda Tangan" };
  const stepKey = steps[step] ?? steps[0];
  const lastStep = step === steps.length - 1;
  const fotoMissing = !fotoPreview;
  const lokasiMissing = !lokasi;
  const ttdMissing = !ttd;
  const stepValid =
    stepKey === "foto" ? !fotoMissing && !compressingFoto :
    stepKey === "lokasi" ? !lokasiMissing :
    stepKey === "status" ? true :
    !ttdMissing;

  function goNext() {
    if (!stepValid) return;
    if (lastStep) { onSubmit(); return; }
    setDirection(1);
    setStep(step + 1);
  }
  function goBack() {
    setDirection(-1);
    setStep(Math.max(0, step - 1));
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-100 flex items-end justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && onClose()} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-slate-800"
            style={{ maxHeight: "92vh" }}>

            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-1.5">
                {steps.map((s, i) => (
                  <span key={s} className="h-1.5 w-6 rounded-full transition-colors" style={{ background: i <= step ? "#00C853" : "#E2E8F0" }} />
                ))}
              </div>
              <button type="button" onClick={() => !submitting && onClose()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-2 px-5 pb-2 pt-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#00C853" }}>
                <ClipboardCheck size={16} />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-[10.5px] font-bold uppercase tracking-wider" style={{ color: "#00C853" }}>
                  {kegiatan?.nama ?? "Kegiatan"} · {step + 1}/{steps.length}
                </span>
                <h3 className="text-lg font-extrabold leading-tight text-slate-800 dark:text-white">{stepLabels[stepKey]}</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div key={stepKey}
                  initial={{ opacity: 0, x: direction * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -28 }}
                  transition={{ duration: 0.22 }}>

                  {stepKey === "foto" && (
                    <div>
                      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <Camera size={12} /> Foto Selfie <span className="text-red-400 normal-case">*wajib</span>
                      </p>
                      <p className="mb-2.5 text-[11px] font-medium text-red-500">Jika absensi kurang sesuai dengan kegiatan maka tidak terverifikasi.</p>
                      {fotoPreview ? (
                        <div className="relative">
                          <img src={fotoPreview} alt="Preview selfie" className="h-56 w-full rounded-2xl object-cover shadow-sm" />
                          <button onClick={onFotoClear}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
                            <X size={14} />
                          </button>
                        </div>
                      ) : compressingFoto ? (
                        <div className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 dark:border-slate-600">
                          <Loader2 size={30} className="animate-spin" />
                          <span className="text-xs font-bold">Memproses foto...</span>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <CameraCapture onCapture={onCaptureFoto} disabled={compressingFoto} />
                        </div>
                      )}
                    </div>
                  )}

                  {stepKey === "lokasi" && (
                    <div>
                      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <MapPin size={12} /> Lokasi <span className="text-red-400 normal-case">*wajib</span>
                      </p>
                      <div className={`flex items-center gap-2.5 rounded-2xl border bg-slate-50 px-3.5 py-4 dark:bg-slate-900/40 ${
                        lokasiMissing ? "border-red-300 dark:border-red-800" : "border-slate-100 dark:border-slate-700"
                      }`}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: lokasi ? "#00D67F18" : "#EF444418" }}>
                          <MapPin size={16} className={lokasi ? "text-emerald-500" : "text-red-400"} />
                        </span>
                        {lokasiLoading ? (
                          <span className="text-xs text-slate-400">Mendeteksi lokasi...</span>
                        ) : lokasi ? (
                          <span className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">{lokasi}</span>
                        ) : (
                          <div className="flex flex-1 items-center justify-between gap-2">
                            <span className="text-xs text-red-500">{lokasiError ?? "Lokasi belum terdeteksi"}</span>
                            <button type="button" onClick={onRetryLokasi} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#00C853] shadow-sm dark:bg-slate-800">
                              Coba lagi
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {stepKey === "status" && (
                    <div className="space-y-2.5">
                      {(["HADIR", "IZIN"] as const).map((s) => {
                        const active = status === s;
                        const c = s === "HADIR"
                          ? { clr: "#00C853", bg: "#00C85318", icon: UserCheck, desc: "Saya hadir untuk kegiatan ini" }
                          : { clr: "#F59E0B", bg: "#F59E0B18", icon: FileText, desc: "Saya izin untuk kegiatan ini" };
                        const Icon = c.icon;
                        return (
                          <button key={s} type="button" onClick={() => setStatus(s)}
                            className="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors"
                            style={active ? { borderColor: c.clr, background: c.bg } : { borderColor: "#F1F5F9", background: "transparent" }}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg }}>
                              <Icon size={18} style={{ color: c.clr }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold" style={{ color: active ? c.clr : "#334155" }}>{s === "HADIR" ? "Hadir" : "Izin"}</p>
                              <p className="text-[11px] text-slate-400">{c.desc}</p>
                            </div>
                            {active && <CheckCircle2 size={18} className="shrink-0" style={{ color: c.clr }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {stepKey === "ttd" && (
                    <div>
                      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <FileSignature size={12} /> Tanda Tangan <span className="text-red-400 normal-case">*wajib</span>
                      </p>
                      <div className={ttdMissing ? "rounded-xl ring-2 ring-red-300" : ""}>
                        <SignaturePad onChange={setTtd} />
                      </div>
                      {ttdMissing && <p className="mt-2 text-[11px] font-semibold text-red-500">Tanda tangan wajib diisi</p>}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-700">
              {step > 0 && (
                <button type="button" onClick={goBack}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  <ChevronLeft size={18} />
                </button>
              )}
              <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={goNext}
                disabled={!stepValid || submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-50"
                style={{ background: "#EF4444" }}>
                {lastStep
                  ? (submitting ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />)
                  : <ChevronRight size={16} />}
                {lastStep ? (submitting ? "Menyimpan..." : "Absen Sekarang") : "Lanjut"}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MobileDetailSheet({ onClose, k }: { onClose: () => void; k: KegiatanUntukGuru }) {
  const isIzin = k.status === "IZIN";
  const accent = isIzin ? "#F59E0B" : "#00C853";
  const titik = parseLokasi(k.lokasi);
  const fotoSrc = resolveMediaSrc(k.foto);
  const ttdSrc = k.ttd;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-[#F5F7FB] shadow-[0_-12px_40px_rgba(15,23,42,0.18)] dark:bg-slate-900"
        style={{ maxHeight: "90dvh" }}>
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Riwayat Absen</p>
            <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">{k.nama}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 dark:bg-slate-800">
              <p className="text-[11px] font-semibold text-slate-400">Status</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${accent}1F`, color: accent }}>
                <CheckCircle2 size={13} /> {isIzin ? "Izin" : "Hadir"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 dark:bg-slate-800">
              <p className="text-[11px] font-semibold text-slate-400">Waktu Absen</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-lg font-bold tabular-nums text-slate-800 dark:text-white">
                <Clock size={15} className="text-slate-400" /> {k.waktuAbsen ?? "—"}
              </p>
            </div>
          </div>

          {(fotoSrc || ttdSrc) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {fotoSrc && (
                <div className="rounded-2xl bg-white p-3 dark:bg-slate-800">
                  <img src={fotoSrc} alt="Foto Selfie" className="aspect-square w-full rounded-xl object-cover" />
                  <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">Foto Selfie</p>
                </div>
              )}
              {ttdSrc && (
                <div className="rounded-2xl bg-white p-3 dark:bg-slate-800">
                  <img src={ttdSrc} alt="Tanda tangan" className="aspect-square w-full rounded-xl border border-slate-100 bg-white object-contain dark:border-slate-700" />
                  <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">Tanda Tangan</p>
                </div>
              )}
            </div>
          )}

          {k.lokasi && titik && (
            <div className="mt-3 overflow-hidden rounded-2xl bg-white dark:bg-slate-800">
              <iframe src={`https://maps.google.com/maps?q=${titik.lat},${titik.lng}&output=embed`}
                className="h-36 w-full border-0" loading="lazy" title="Lokasi absen" />
              <a href={`https://maps.google.com/maps?q=${titik.lat},${titik.lng}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{k.lokasi}</span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold" style={{ color: accent }}>
                  <ExternalLink size={11} /> Buka Maps
                </span>
              </a>
            </div>
          )}

          {k.catatan && (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-white p-4 dark:bg-slate-800">
              <StickyNote size={15} className="mt-0.5 shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400">Catatan dari Ketenagaan</p>
                <p className="mt-0.5 text-sm leading-snug text-slate-700 dark:text-slate-200">{k.catatan}</p>
              </div>
            </div>
          )}

          <button type="button" onClick={onClose}
            className="mt-4 w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-bold text-white active:scale-[0.99] dark:bg-white dark:text-slate-900">
            Tutup
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
