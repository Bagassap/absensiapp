"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, MapPin, Camera, CheckCircle2, Loader2, Clock, RefreshCw,
  FileSignature, MessageSquareText, LogIn, LogOut, Briefcase, AlertCircle,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { SignaturePad } from "@/components/absensi-harian/SignaturePad";
import { STATUS_CFG, PULANG_CFG, BRAND_GRADIENT, formatTgl, resolveMediaSrc, todayJakarta } from "@/components/absensi-harian/shared";
import type { StatusAbsensi } from "@/components/absensi-magang/types";
import { compressImage, readAsDataUrl, describePhotoError } from "@/lib/compressImage";

type StatusSaya = {
  hasPenempatan: boolean;
  tempatMagang?: { id: string; namaTempat: string; alamat: string } | null;
  sudahAbsen: boolean;
  sudahPulang: boolean;
  status: StatusAbsensi | null;
  tanggal?: string;
  record?: {
    waktuAbsen?: string | null;
    lokasi?: string | null;
    foto?: string | null;
    ttd?: string | null;
    catatan?: string | null;
    waktuPulang?: string | null;
    lokasiPulang?: string | null;
    fotoPulang?: string | null;
    ttdPulang?: string | null;
    catatanPulang?: string | null;
  } | null;
};

type Tab = "DATANG" | "PULANG";

// GPS is mandatory for Hadir/Pulang — there is no fallback that lets a
// submission through without real coordinates. getCurrentPosition() is
// blocked outright by browsers on non-HTTPS, non-localhost origins.
const INSECURE_CONTEXT_MSG = "Akses GPS memerlukan koneksi aman. Silakan buka melalui https://pplg.smklimpung.id, jangan menggunakan alamat IP langsung.";

export default function SiswaMagangAbsensiPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = todayJakarta();

  const [data, setData] = useState<StatusSaya | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("DATANG");

  const [lokasi, setLokasi] = useState<string | null>(null);
  const [lokasiLoading, setLokasiLoading] = useState(false);
  const [lokasiError, setLokasiError] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [compressingFoto, setCompressingFoto] = useState(false);
  const [ttd, setTtd] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [statusPilihan, setStatusPilihan] = useState<"HADIR" | "IZIN" | "SAKIT">("HADIR");

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/magang/absensi/saya?tanggal=${today}`);
      const d: StatusSaya = await res.json();
      setData(d);
    } catch {
      if (!silent) toast.error("Gagal memuat status absensi PKL", "");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [today]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const hasPenempatan = data?.hasPenempatan ?? false;
  const needsActionDatang = hasPenempatan && !data?.sudahAbsen;
  const needsActionPulang = hasPenempatan && !data?.sudahPulang;
  const needsAction = activeTab === "DATANG" ? needsActionDatang : needsActionPulang;
  const activeTipe = activeTab === "PULANG" ? "PULANG" : statusPilihan;

  useEffect(() => {
    setLokasi(null);
    setLokasiError(null);
    setFotoFile(null);
    setFotoPreview(null);
    setTtd(null);
    setCatatan("");
    setStatusPilihan("HADIR");
  }, [activeTab]);

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
    if (!needsAction) return;
    requestLokasi();
  }, [needsAction, requestLokasi]);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
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

  async function handleSubmit() {
    if (!needsAction) return;
    const tipe = activeTipe;
    if (!lokasi) { toast.error("Lokasi (GPS) wajib diisi", ""); return; }
    if (tipe === "IZIN" || tipe === "SAKIT") {
      if (!catatan.trim()) { toast.error("Keterangan wajib diisi", ""); return; }
    }
    if (!fotoFile) { toast.error("Foto wajib diisi", ""); return; }
    if (!ttd) { toast.error("Tanda tangan wajib diisi", ""); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("tipe", tipe);
      formData.set("waktuAbsen", new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }));
      if (lokasi) formData.set("lokasi", lokasi);
      if (catatan) formData.set("catatan", catatan);
      if (ttd) formData.set("ttd", ttd);
      if (fotoFile) formData.set("foto", fotoFile);

      const res = await fetch("/api/magang/absensi/saya", { method: "POST", body: formData });
      if (res.ok) {
        const successMsg =
          tipe === "HADIR" ? "Absen datang PKL berhasil dicatat!" :
          tipe === "PULANG" ? "Absen pulang PKL berhasil dicatat!" :
          tipe === "IZIN" ? "Izin berhasil dicatat!" : "Sakit berhasil dicatat!";
        toast.success(successMsg, "");
        loadStatus();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal mencatat absensi", "");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const status = (data?.status ?? "HADIR") as StatusAbsensi;
  const cfg = STATUS_CFG[status];

  const TABS: { key: Tab; label: string; icon: typeof LogIn }[] = [
    { key: "DATANG", label: "Absen Datang", icon: LogIn },
    { key: "PULANG", label: "Absen Pulang", icon: LogOut },
  ];

  return (
    <div className="space-y-5">

      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: BRAND_GRADIENT }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-60 w-60 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 right-28 h-52 w-52 rounded-full bg-white/6" />
        <div className="pointer-events-none absolute top-3 left-[45%] h-24 w-24 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div
              initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 300, delay: 0.05 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
              <ClipboardCheck size={22} className="text-white sm:hidden" />
              <ClipboardCheck size={26} className="hidden text-white sm:block" />
            </motion.div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Presensi PKL</span>
              <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Absensi PKL</h1>
            </div>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 dark:border-slate-700 dark:bg-slate-800">
          <Loader2 size={24} className="animate-spin text-[#0082FB]" />
        </div>
      ) : !hasPenempatan ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-slate-800 dark:text-white">Belum Ada Penempatan PKL</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400 dark:text-slate-500">
            Anda belum memiliki penempatan PKL yang aktif. Hubungi admin untuk ditempatkan di tempat PKL terlebih dahulu.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-4 md:gap-5">

            <div className="col-span-12 xl:col-span-7">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">{formatTgl(today)}</span>
                {data?.tempatMagang && (
                  <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Briefcase size={11} /> {data.tempatMagang.namaTempat}
                  </span>
                )}
              </div>

              <div className="mb-4 flex gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/60">
                {TABS.map((t) => {
                  const active = activeTab === t.key;
                  const Icon = t.icon;
                  return (
                    <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all"
                      style={active
                        ? { background: t.key === "PULANG" ? PULANG_CFG.clr : BRAND_GRADIENT, color: "#fff" }
                        : { background: "transparent", color: "#94a3b8" }}>
                      <Icon size={15} /> {t.label}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "DATANG" ? (
                  data?.sudahAbsen ? (
                    <motion.div key="datang-sudah" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="overflow-hidden rounded-2xl shadow-lg" style={{ background: BRAND_GRADIENT }}>
                      <RingkasanAbsen
                        title={`${cfg.label} Tercatat`}
                        desc={<>Anda tercatat <b>{cfg.label}</b> PKL hari ini</>}
                        waktu={data?.record?.waktuAbsen}
                        foto={data?.record?.foto}
                        fotoLabel={status !== "HADIR" ? "Foto Surat Izin/Sakit" : "Foto Selfie"}
                        ttd={data?.record?.ttd}
                        lokasi={data?.record?.lokasi}
                        catatan={data?.record?.catatan}
                        onReload={() => loadStatus()}
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="datang-form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <FormAbsen
                        activeTipe={activeTipe}
                        statusPilihan={statusPilihan} setStatusPilihan={setStatusPilihan}
                        showStatusPicker
                        lokasi={lokasi} lokasiLoading={lokasiLoading} lokasiError={lokasiError} onRetryLokasi={requestLokasi}
                        fotoPreview={fotoPreview} fileInputRef={fileInputRef}
                        onFotoChange={handleFotoChange} compressingFoto={compressingFoto}
                        onFotoClear={() => { setFotoFile(null); setFotoPreview(null); }}
                        catatan={catatan} setCatatan={setCatatan}
                        ttd={ttd} setTtd={setTtd}
                        submitting={submitting} onSubmit={handleSubmit}
                      />
                    </motion.div>
                  )
                ) : (
                  data?.sudahPulang ? (
                    <motion.div key="pulang-sudah" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="overflow-hidden rounded-2xl shadow-lg" style={{ background: PULANG_CFG.clr }}>
                      <RingkasanAbsen
                        title="Kepulangan Tercatat"
                        desc={<>Anda tercatat <b>Pulang</b> PKL hari ini</>}
                        waktu={data?.record?.waktuPulang}
                        foto={data?.record?.fotoPulang}
                        ttd={data?.record?.ttdPulang}
                        lokasi={data?.record?.lokasiPulang}
                        catatan={data?.record?.catatanPulang}
                        onReload={() => loadStatus()}
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="pulang-form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <FormAbsen
                        activeTipe="PULANG"
                        statusPilihan={statusPilihan} setStatusPilihan={setStatusPilihan}
                        showStatusPicker={false}
                        lokasi={lokasi} lokasiLoading={lokasiLoading} lokasiError={lokasiError} onRetryLokasi={requestLokasi}
                        fotoPreview={fotoPreview} fileInputRef={fileInputRef}
                        onFotoChange={handleFotoChange} compressingFoto={compressingFoto}
                        onFotoClear={() => { setFotoFile(null); setFotoPreview(null); }}
                        catatan={catatan} setCatatan={setCatatan}
                        ttd={ttd} setTtd={setTtd}
                        submitting={submitting} onSubmit={handleSubmit}
                      />
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>

            {data?.tempatMagang && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="col-span-12 rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:bg-[#1C2B33] xl:col-span-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                  <Briefcase size={16} className="text-[#0082FB]" /> Tempat PKL
                </h2>
                <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{data.tempatMagang.namaTempat}</p>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <MapPin size={12} className="mt-0.5 shrink-0" /> {data.tempatMagang.alamat}
                </p>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RingkasanAbsen({
  title, desc, waktu, foto, fotoLabel = "Foto Selfie", ttd, lokasi, catatan, onReload,
}: {
  title: string;
  desc: React.ReactNode;
  waktu?: string | null;
  foto?: string | null;
  fotoLabel?: string;
  ttd?: string | null;
  lokasi?: string | null;
  catatan?: string | null;
  onReload: () => void;
}) {
  return (
    <>
      <div className="relative px-6 py-8 text-center">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/8" />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, delay: 0.1 }}
          className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/25 shadow-lg">
          <CheckCircle2 size={30} className="text-white" />
        </motion.div>
        <h2 className="mt-4 text-lg font-extrabold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/80">{desc}</p>
        <div className="mx-auto mt-5 flex max-w-xs items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 backdrop-blur-sm">
          <Clock size={14} className="text-white/70" />
          <span className="font-mono text-xl font-extrabold text-white">{waktu ?? "—"}</span>
        </div>

        <div className="relative mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          {foto && (
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <img src={resolveMediaSrc(foto) ?? undefined} alt={fotoLabel}
                className="h-24 w-24 rounded-xl border-2 border-white/30 object-cover shadow-md" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{fotoLabel}</span>
            </div>
          )}
          {ttd && (
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <img src={resolveMediaSrc(ttd) ?? undefined} alt="Tanda tangan"
                className="h-24 w-full rounded-xl border-2 border-white/30 bg-white object-contain shadow-md" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Tanda Tangan</span>
            </div>
          )}
        </div>

        {(lokasi || catatan) && (
          <div className="relative mx-auto mt-4 max-w-md space-y-2 text-left">
            {lokasi && (
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <MapPin size={13} className="shrink-0 text-white/70" />
                <span className="truncate font-mono text-[11px] text-white/80">{lokasi}</span>
              </div>
            )}
            {catatan && (
              <div className="flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <MessageSquareText size={13} className="mt-0.5 shrink-0 text-white/70" />
                <span className="text-[11px] text-white/80">{catatan}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="bg-white/10 px-6 py-3 text-center backdrop-blur-sm">
        <button onClick={onReload} className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white">
          <RefreshCw size={12} /> Muat ulang
        </button>
      </div>
    </>
  );
}

function FormAbsen({
  activeTipe, statusPilihan, setStatusPilihan, showStatusPicker,
  lokasi, lokasiLoading, lokasiError, onRetryLokasi, fotoPreview, fileInputRef, onFotoChange, compressingFoto, onFotoClear,
  catatan, setCatatan, ttd, setTtd, submitting, onSubmit,
}: {
  activeTipe: "HADIR" | "IZIN" | "SAKIT" | "PULANG";
  statusPilihan: "HADIR" | "IZIN" | "SAKIT";
  setStatusPilihan: (s: "HADIR" | "IZIN" | "SAKIT") => void;
  showStatusPicker: boolean;
  lokasi: string | null;
  lokasiLoading: boolean;
  lokasiError: string | null;
  onRetryLokasi: () => void;
  fotoPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  compressingFoto: boolean;
  onFotoClear: () => void;
  catatan: string;
  setCatatan: (v: string) => void;
  ttd: string | null;
  setTtd: (v: string | null) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const isIzinSakit = activeTipe === "IZIN" || activeTipe === "SAKIT";
  const fotoMissing = !fotoPreview;
  const lokasiMissing = !lokasi;
  const ttdMissing = !ttd;
  const catatanMissing = isIzinSakit && !catatan.trim();
  const disabled = submitting || compressingFoto || fotoMissing || lokasiMissing || ttdMissing || catatanMissing;

  const fotoLabel = isIzinSakit ? "Foto Surat Izin/Sakit" : "Foto Selfie";
  const fotoField = (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Camera size={12} /> {fotoLabel} <span className="text-red-400 normal-case">*wajib</span>
      </p>
      {fotoPreview ? (
        <div className="relative flex h-18 items-center">
          <img src={fotoPreview} alt="Preview" className="h-18 w-18 rounded-xl object-cover shadow-sm" />
          <button onClick={onFotoClear}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md">
            ×
          </button>
        </div>
      ) : (
        <button onClick={() => fileInputRef.current?.click()} disabled={compressingFoto}
          className={`flex h-18 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed text-slate-400 transition-colors hover:border-[#0082FB] hover:text-[#0082FB] disabled:cursor-wait disabled:opacity-70 ${
            fotoMissing ? "border-red-300 dark:border-red-800" : "border-slate-200 dark:border-slate-600"
          }`}>
          {compressingFoto ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-semibold">Memproses foto...</span>
            </>
          ) : (
            <>
              <Camera size={18} />
              <span className="text-xs font-semibold">{isIzinSakit ? "Unggah Foto" : "Ambil Foto"}</span>
            </>
          )}
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" {...(isIzinSakit ? {} : { capture: "user" as const })}
        className="hidden" onChange={onFotoChange} />
      {fotoMissing && <p className="mt-1 text-[11px] font-semibold text-red-500">{fotoLabel} wajib diisi</p>}
    </div>
  );

  const lokasiField = (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <MapPin size={12} /> Lokasi <span className="text-red-400 normal-case">*wajib</span>
      </p>
      <div className={`flex h-18 items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2.5 dark:bg-slate-900/40 ${
        lokasiMissing ? "border-red-300 dark:border-red-800" : "border-slate-100 dark:border-slate-700"
      }`}>
        <MapPin size={15} className={lokasi ? "text-emerald-500" : "text-red-400"} />
        {lokasiLoading ? (
          <span className="text-xs text-slate-400">Mendeteksi lokasi...</span>
        ) : lokasi ? (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{lokasi}</span>
        ) : (
          <div className="flex flex-1 items-center justify-between gap-2">
            <span className="text-xs text-red-500">{lokasiError ?? "Lokasi belum terdeteksi"}</span>
            <button type="button" onClick={onRetryLokasi} className="shrink-0 text-[11px] font-bold text-[#0082FB] hover:underline">
              Coba lagi
            </button>
          </div>
        )}
      </div>
      {lokasiMissing && !lokasiLoading && (
        <p className="mt-1 text-[11px] font-semibold text-red-500">{lokasiError ?? "Lokasi (GPS) wajib diisi"}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: activeTipe === "PULANG" ? PULANG_CFG.clr : BRAND_GRADIENT }}>
          {activeTipe === "PULANG" ? <LogOut size={18} /> : activeTipe === "HADIR" ? <LogIn size={18} /> : (() => { const Icon = STATUS_CFG[activeTipe].icon; return <Icon size={18} />; })()}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white">
            {activeTipe === "PULANG" ? "Absen Pulang" : `Absen ${STATUS_CFG[activeTipe].label}`}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {activeTipe === "PULANG" ? "Catat waktu pulang PKL-mu untuk hari ini" :
             activeTipe === "HADIR" ? "Catat kehadiran PKL-mu untuk hari ini" :
             `Laporkan ${STATUS_CFG[activeTipe].label.toLowerCase()} untuk hari ini`}
          </p>
        </div>
      </div>

      {showStatusPicker && (
        <div className="flex gap-2 px-5">
          {(["HADIR", "IZIN", "SAKIT"] as const).map((s) => {
            const c = STATUS_CFG[s];
            const active = statusPilihan === s;
            return (
              <button key={s} type="button" onClick={() => setStatusPilihan(s)}
                className="flex-1 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-colors"
                style={active
                  ? { borderColor: c.clr, background: c.bg, color: c.clr }
                  : { borderColor: "transparent", background: "transparent", color: "#94a3b8" }}>
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-4 px-5 pb-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {lokasiField}
          {fotoField}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <MessageSquareText size={12} />
            {isIzinSakit
              ? <>Keterangan / Alasan <span className="text-red-400 normal-case">*wajib</span></>
              : "Keterangan (opsional)"}
          </p>
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
            placeholder={isIzinSakit ? "Tulis alasan izin/sakit..." : "Tulis keterangan tambahan..."}
            className={`w-full resize-none rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 dark:bg-slate-900/40 dark:text-slate-200 ${
              catatanMissing ? "border-red-300 focus:ring-red-300 dark:border-red-800" : "border-slate-200 focus:ring-[#0082FB] dark:border-slate-600"
            }`} />
          {catatanMissing && <p className="mt-1 text-[11px] font-semibold text-red-500">Keterangan wajib diisi</p>}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <FileSignature size={12} /> Tanda Tangan <span className="text-red-400 normal-case">*wajib</span>
          </p>
          <div className={ttdMissing ? "rounded-xl ring-2 ring-red-300" : ""}>
            <SignaturePad onChange={setTtd} />
          </div>
          {ttdMissing && <p className="mt-1 text-[11px] font-semibold text-red-500">Tanda tangan wajib diisi</p>}
        </div>

        <motion.button whileTap={{ scale: 0.98 }} onClick={onSubmit}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
          style={{ background: activeTipe === "PULANG" ? PULANG_CFG.clr : BRAND_GRADIENT }}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : (activeTipe === "PULANG" ? <LogOut size={16} /> : <LogIn size={16} />)}
          {submitting ? "Menyimpan..." : activeTipe === "PULANG" ? "Absen Pulang Sekarang" : `Absen ${STATUS_CFG[activeTipe].label} Sekarang`}
        </motion.button>
      </div>
    </div>
  );
}
