"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, RotateCcw, AlertTriangle } from "lucide-react";

const INSECURE_CONTEXT_MSG = "Akses kamera memerlukan koneksi aman. Silakan buka lewat domain https, jangan menggunakan alamat IP langsung.";

export function CameraCapture({ onCapture, disabled }: { onCapture: (file: File) => void; disabled?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const startCamera = useCallback(async () => {
    setError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(INSECURE_CONTEXT_MSG);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Perangkat/browser ini tidak mendukung akses kamera langsung.");
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (e) {
      if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
        setError("Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser, lalu coba lagi.");
      } else if (e instanceof DOMException && e.name === "NotFoundError") {
        setError("Kamera tidak ditemukan di perangkat ini.");
      } else {
        setError("Kamera tidak dapat diakses. Coba lagi.");
      }
    } finally {
      setStarting(false);
    }
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || capturing || video.videoWidth === 0) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setCapturing(false); return; }
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        setCapturing(false);
        if (!blob) return;
        stopStream();
        onCapture(new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" }));
      }, "image/jpeg", 0.92);
    } catch {
      setCapturing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-56 w-56 overflow-hidden rounded-2xl bg-black shadow-md" style={active ? { boxShadow: "0 0 0 3px #EF4444" } : undefined}>
        <video ref={videoRef} playsInline muted
          className={`h-full w-full object-cover ${active ? "" : "hidden"}`}
          style={{ transform: "scaleX(-1)" }} />

        {error ? (
          <div className="flex h-56 w-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-4 text-center dark:border-red-900/50 dark:bg-red-950/20">
            <AlertTriangle size={24} className="text-red-500" />
            <p className="text-xs font-medium text-red-500">{error}</p>
            <button type="button" onClick={startCamera}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:brightness-95">
              <RotateCcw size={12} /> Coba Lagi
            </button>
          </div>
        ) : !active ? (
          <button type="button" onClick={startCamera} disabled={disabled || starting}
            className="flex h-56 w-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-[#EF4444] hover:text-[#EF4444] disabled:cursor-wait disabled:opacity-70 dark:border-slate-600">
            {starting ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                <span className="text-xs font-semibold">Membuka kamera...</span>
              </>
            ) : (
              <>
                <Camera size={28} />
                <span className="text-xs font-semibold">Buka Kamera</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      {active && (
        <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={handleCapture} disabled={capturing}
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg disabled:opacity-60"
          style={{ backgroundColor: "#EF4444" }}>
          {capturing ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
        </motion.button>
      )}
    </div>
  );
}
