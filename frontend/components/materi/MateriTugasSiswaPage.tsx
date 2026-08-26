"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, Send } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { MateriSiswaPage } from "./MateriSiswaPage";
import { TugasListCardSiswa } from "@/components/tugas/TugasListCardSiswa";
import { SubmitTugasModal } from "@/components/tugas/SubmitTugasModal";
import { SubmisiSayaModal } from "@/components/tugas/SubmisiSayaModal";
import { isTugasActive, LOCKDOWN_TIPE } from "@/components/tugas/types";
import type { TugasItem, TugasSubmisiItem } from "@/components/tugas/types";

type Category = "materi" | "tugas";

export function MateriTugasSiswaPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [materiCount, setMateriCount] = useState(0);
  const [tugasList, setTugasList] = useState<TugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Notifikasi Tugas/Materi baru mengarah ke ?tab=tugas / ?tab=materi supaya
  // langsung membuka kategori yang relevan, bukan selalu default ke Materi.
  const [category, setCategory] = useState<Category>(() => (searchParams.get("tab") === "tugas" ? "tugas" : "materi"));

  const [submitTarget, setSubmitTarget] = useState<TugasItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ s: TugasSubmisiItem; t: TugasItem } | null>(null);
  const [currentUserNama, setCurrentUserNama] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setCurrentUserNama(d?.nama ?? "")).catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        fetch("/api/materi").then((r) => r.json()),
        fetch("/api/tugas").then((r) => r.json()),
      ]);
      setMateriCount(Array.isArray(m) ? m.length : 0);
      setTugasList(Array.isArray(t) ? t : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Tugas PRAKTIK/PILIHAN_GANDA/ESSAY dikerjakan di lembar pengerjaan lockdown
  // (halaman penuh), bukan modal — SUBMIT (kirim file) tetap pakai modal biasa.
  function handleKumpulkan(t: TugasItem) {
    if (LOCKDOWN_TIPE.has(t.tipe)) {
      router.push(`/siswa/materi/kerjakan/${t.id}`);
      return;
    }
    setSubmitTarget(t);
  }

  async function doSubmit(fd: FormData) {
    const res = await fetch("/api/tugas/submisi", { method: "POST", body: fd });
    if (res.ok) {
      const submisi: TugasSubmisiItem = await res.json();
      const tugas = submitTarget;
      if (tugas?.tipe === "PILIHAN_GANDA" && typeof submisi.nilai === "number") {
        toast.success(`Nilai kamu: ${submisi.nilai}`, submisi.nilai === 100 ? "Semua jawaban benar!" : "Tugas berhasil dikumpulkan dan langsung dinilai.");
        setSubmitTarget(null);
        setDetailTarget({ s: submisi, t: tugas });
      } else {
        toast.success("Tugas berhasil dikumpulkan!", "Guru/Admin akan mereview tugasmu.");
        setSubmitTarget(null);
      }
      loadAll();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error("Gagal mengumpulkan", d.message ?? "Coba lagi");
    }
  }

  const active = tugasList.filter((t) => isTugasActive(t));
  const perluDikerjakan = active.filter((t) => !t.submisi || t.submisi.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "#0082FB" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 right-32 w-36 h-36 rounded-full bg-white/8" />
        <div className="pointer-events-none absolute bottom-4 -left-6 w-24 h-24 rounded-full bg-white/6" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg">
            <BookOpen size={22} className="text-white sm:hidden" />
            <BookOpen size={26} className="text-white hidden sm:block" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Belajar & Praktik</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">Materi & Tugas</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_2.3fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Kategori</p>
          <div className="flex flex-col gap-4">
            <button type="button" onClick={() => setCategory("materi")}
              className="relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl px-5 py-5 text-left text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "#0082FB",
                boxShadow: category === "materi" ? "0 8px 24px rgba(0,130,251,0.35)" : "0 8px 24px rgba(0,0,0,0.15)",
                outline: category === "materi" ? "2px solid #0082FB" : "none",
                outlineOffset: "3px",
              }}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
                <BookOpen size={16} />
              </div>
              <div className="relative">
                <p className="text-xl font-black leading-tight">Materi</p>
                <p className="mt-0.5 text-[11px] font-medium text-white/75">{materiCount} materi tersedia</p>
              </div>
            </button>

            <button type="button" onClick={() => setCategory("tugas")}
              className="relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl px-5 py-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "#C3F84A",
                color: "#1C2B33",
                boxShadow: category === "tugas" ? "0 8px 24px rgba(195,248,74,0.35)" : "0 8px 24px rgba(0,0,0,0.15)",
                outline: category === "tugas" ? "2px solid #C3F84A" : "none",
                outlineOffset: "3px",
              }}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#1C2B33]/10" />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1C2B33]/15">
                <Send size={16} />
              </div>
              <div className="relative">
                <p className="text-xl font-black leading-tight">Tugas</p>
                <p className="mt-0.5 text-[11px] font-medium text-[#1C2B33]/75">
                  {tugasList.length} tugas · {perluDikerjakan > 0 ? `${perluDikerjakan} belum dikerjakan` : "semua sudah dikumpulkan"}
                </p>
              </div>
            </button>
          </div>
        </div>

        {category === "materi" ? (
          <MateriSiswaPage embedded />
        ) : (
          <TugasListCardSiswa
            tugasList={tugasList}
            loading={loading}
            onKumpulkan={handleKumpulkan}
            onLihatDetail={(s, t) => setDetailTarget({ s, t })}
          />
        )}
      </div>

      <SubmitTugasModal tugas={submitTarget} onClose={() => setSubmitTarget(null)} onSubmit={doSubmit} currentUserNama={currentUserNama} />

      <SubmisiSayaModal
        target={detailTarget?.s ?? null}
        judul={detailTarget?.t.judul}
        tipe={detailTarget?.t.tipe}
        onClose={() => setDetailTarget(null)}
        onKirimUlang={() => {
          const t = detailTarget?.t;
          setDetailTarget(null);
          if (t) handleKumpulkan(t);
        }}
      />
    </div>
  );
}
