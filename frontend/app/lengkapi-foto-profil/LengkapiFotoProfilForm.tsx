"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { motion, type Variants } from "framer-motion";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Upload, RotateCcw, ImagePlus } from "lucide-react";
import { getCroppedImg } from "@/lib/getCroppedImg";

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

export function LengkapiFotoProfilForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format file harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB.");
      return;
    }

    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function reset() {
    setImageSrc(null);
    setCroppedAreaPixels(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!imageSrc || !croppedAreaPixels || loading) return;
    setLoading(true);
    setError(null);

    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("foto", file);

      const res = await fetch("/api/auth/foto-profil", {
        method: "PATCH",
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || "Gagal menyimpan foto profil.");
        setLoading(false);
        return;
      }

      window.location.replace("/dashboard");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setLoading(false);
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="mt-6 flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />

      {!imageSrc ? (
        <motion.button
          variants={item}
          type="button"
          onClick={() => inputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue/25 bg-blue/5 px-6 py-14 text-center transition-colors hover:border-blue/45 hover:bg-blue/8"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue/10">
            <ImagePlus size={24} className="text-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black/80">Pilih foto dari galeri atau kamera</p>
            <p className="mt-1 text-xs text-black/45">JPG, PNG, atau WEBP — maksimal 5MB</p>
          </div>
        </motion.button>
      ) : (
        <motion.div variants={item} className="flex flex-col gap-4">
          <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-black/90 sm:h-80">
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
            <span className="shrink-0 text-xs font-medium text-black/50">Perbesar</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-black/10 accent-[#0082FB]"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold text-black/60 transition-colors hover:bg-black/5"
            >
              <RotateCcw size={15} />
              Pilih Ulang
            </button>
          </div>
        </motion.div>
      )}

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
        type="button"
        onClick={handleSubmit}
        disabled={!imageSrc || !croppedAreaPixels || loading}
        whileHover={imageSrc ? { scale: 1.02 } : undefined}
        whileTap={imageSrc ? { scale: 0.98 } : undefined}
        className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(0,130,251,0.55)] transition-all hover:shadow-[0_14px_40px_-8px_rgba(0,130,251,0.70)] hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "#0082FB" }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Menyimpan...
          </>
        ) : (
          <>
            <Upload size={16} />
            Simpan Foto Profil
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
