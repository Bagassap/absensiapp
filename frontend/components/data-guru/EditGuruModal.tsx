"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper, { type Area } from "react-easy-crop";
import { Pencil, X, Loader2, ImagePlus, Eye, RotateCcw, Upload } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { resolveMediaSrc } from "@/lib/media";
import { getCroppedImg } from "@/lib/getCroppedImg";
import type { GuruRow } from "./DataGuruTable";

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition-all focus:border-[#00C853] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500";

export function EditGuruModal({ guru, onClose, onSaved }: {
  guru: GuruRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nama, setNama] = useState(guru.nama);
  const [loginId, setLoginId] = useState(guru.loginId ?? "");
  const [nip, setNip] = useState(guru.guru?.nip ?? "");
  const [noWa, setNoWa] = useState(guru.guru?.noWa ?? "");
  const [saving, setSaving] = useState(false);

  // Sama seperti alur "Lengkapi Foto Profil" awal (react-easy-crop bulat +
  // slider zoom) — dipakai ulang di sini supaya pengalaman ganti foto guru
  // konsisten dengan pengalaman pertama kali mengisi foto.
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [viewingExisting, setViewingExisting] = useState(false);
  const fotoSrc = resolveMediaSrc(guru.fotoProfil);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Format tidak didukung", "Gunakan foto JPG, PNG, atau WEBP");
      return;
    }
    // Sengaja tanpa batas ukuran — getCroppedImg() selalu mengompres ke
    // ≤1MB sebelum diunggah, jadi foto galeri HP yang aslinya belasan MB
    // tidak perlu ditolak lebih dulu di sini.
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function resetFoto() {
    setImageSrc(null);
    setCroppedAreaPixels(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !loginId.trim()) {
      toast.error("Data belum lengkap", "Nama dan NPY wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (imageSrc && croppedAreaPixels) {
        const fotoFile = await getCroppedImg(imageSrc, croppedAreaPixels);
        const formData = new FormData();
        formData.set("foto", fotoFile);
        const fotoRes = await fetch(`/api/users/guru/${guru.id}/foto`, { method: "PATCH", body: formData });
        const fotoData = await fotoRes.json().catch(() => null);
        if (!fotoRes.ok) throw new Error(fotoData?.message ?? "Gagal mengunggah foto");
      }

      const res = await fetch(`/api/users/guru/${guru.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: nama.trim(), loginId: loginId.trim(), nip: nip.trim(), noWa: noWa.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan perubahan");
      toast.success("Data guru diperbarui", data?.message ?? "");
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Gagal menyimpan perubahan", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {viewingExisting && fotoSrc && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setViewingExisting(false)}
          className="fixed inset-0 z-110 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
          <img src={fotoSrc} alt={guru.nama} className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-2xl" />
          <button onClick={() => setViewingExisting(false)}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
            <X size={14} /> Tutup
          </button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#3B82F6" }}>
                <Pencil size={16} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Edit Data Guru</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">{guru.nama}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className={LABEL}>Foto Profil</label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFotoChange} />

              {imageSrc ? (
                <div className="flex flex-col gap-3">
                  <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-black/90 sm:h-64">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <div className="flex items-center gap-3 px-1">
                    <span className="shrink-0 text-xs font-medium text-slate-400">Perbesar</span>
                    <input type="range" min={1} max={3} step={0.01} value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-100 accent-[#3B82F6] dark:bg-slate-700" />
                  </div>
                  <button type="button" onClick={resetFoto}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50">
                    <RotateCcw size={14} /> Pilih Ulang
                  </button>
                </div>
              ) : fotoSrc ? (
                <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/30">
                  <img src={fotoSrc} alt={guru.nama} className="h-20 w-20 shrink-0 rounded-full object-cover shadow-sm" />
                  <div className="flex flex-1 flex-col gap-2">
                    <button type="button" onClick={() => setViewingExisting(true)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                      <Eye size={13} /> Lihat Foto
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-colors hover:brightness-95"
                      style={{ background: "#3B82F6" }}>
                      <ImagePlus size={13} /> Ganti Foto
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#3B82F6]/25 bg-[#3B82F6]/5 px-6 py-8 text-center transition-colors hover:border-[#3B82F6]/45 hover:bg-[#3B82F6]/8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "#3B82F618" }}>
                    <ImagePlus size={22} style={{ color: "#3B82F6" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pilih foto dari galeri atau kamera</p>
                    <p className="mt-1 text-xs text-slate-400">JPG, PNG, atau WEBP — otomatis dikompres</p>
                  </div>
                </button>
              )}
            </div>

            <div>
              <label className={LABEL}>Nama</label>
              <input type="text" required value={nama} onChange={(e) => setNama(e.target.value)} className={INPUT} />
            </div>

            <div>
              <label className={LABEL}>NPY (Login ID)</label>
              <input type="text" required value={loginId} onChange={(e) => setLoginId(e.target.value)} className={INPUT} />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={LABEL}>NIP</label>
                <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} placeholder="Opsional" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>No. WA</label>
                <input type="text" value={noWa} onChange={(e) => setNoWa(e.target.value)} placeholder="Opsional" className={INPUT} />
              </div>
            </div>

            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300">
                Batal
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                style={{ backgroundColor: "#3B82F6" }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
