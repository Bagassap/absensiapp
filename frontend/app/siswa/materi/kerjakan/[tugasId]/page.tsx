"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2, Lock, ShieldAlert, Timer, Send, Code2, ListChecks, PenLine,
  CheckCircle2, LogOut, ClipboardList,
} from "lucide-react";
import { CodePracticeCanvas } from "@/components/materi/CodePracticeCanvas";
import { useToast } from "@/components/shared/ToastSystem";
import { LOCKDOWN_TIPE, MAKSIMAL_PERCOBAAN } from "@/components/tugas/types";
import type { TugasItem, TugasSoalItem } from "@/components/tugas/types";

type Phase = "loading" | "error" | "intro" | "locked" | "diterima" | "active" | "submitted";

type JawabanState = Record<string, string>;

function formatSisaWaktu(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function KerjakanTugasPage() {
  const params = useParams<{ tugasId: string }>();
  const tugasId = params.tugasId;
  const router = useRouter();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [tugas, setTugas] = useState<TugasItem | null>(null);
  const [percobaanKe, setPercobaanKe] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSelesai, setShowConfirmSelesai] = useState(false);
  const [deadlineTs, setDeadlineTs] = useState<number | null>(null);
  const [sisaMs, setSisaMs] = useState<number | null>(null);

  const [code, setCode] = useState({ html: "", css: "", js: "" });
  const [jawaban, setJawaban] = useState<JawabanState>({});
  const [catatan, setCatatan] = useState("");

  const codeRef = useRef(code);
  const jawabanRef = useRef(jawaban);
  const catatanRef = useRef(catatan);
  const phaseRef = useRef<Phase>("loading");
  const firedRef = useRef(false);
  const tugasIdRef = useRef(tugasId);

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { jawabanRef.current = jawaban; }, [jawaban]);
  useEffect(() => { catatanRef.current = catatan; }, [catatan]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const loadTugas = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/tugas/${tugasId}`, { cache: "no-store" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.message ?? "Tugas tidak ditemukan");
        setPhase("error");
        return;
      }
      const t: TugasItem = await res.json();
      if (!LOCKDOWN_TIPE.has(t.tipe)) {
        router.replace("/siswa/materi?tab=tugas");
        return;
      }
      setTugas(t);
      const mySubmisi = t.submisi?.[0];

      if (mySubmisi?.status === "DITERIMA") {
        setPhase("diterima");
        return;
      }
      if (mySubmisi?.waktuMulai) {
        // Percobaan sedang berjalan (misal halaman ter-refresh) — lanjutkan
        // memakai deadline yang sudah tersimpan di server, jangan konsumsi
        // percobaan baru.
        setPercobaanKe(mySubmisi.jumlahPercobaan ?? 1);
        setCode({ html: t.starterHtml ?? "", css: t.starterCss ?? "", js: t.starterJs ?? "" });
        setJawaban({});
        setDeadlineTs(mySubmisi.deadlineWaktu ? new Date(mySubmisi.deadlineWaktu).getTime() : null);
        setPhase("active");
        return;
      }
      if (mySubmisi?.terkunci) {
        setPhase("locked");
        return;
      }
      setPercobaanKe((mySubmisi?.jumlahPercobaan ?? 0) + 1);
      setPhase("intro");
    } catch {
      setErrorMsg("Server tidak dapat dijangkau");
      setPhase("error");
    }
  }, [tugasId, router]);

  useEffect(() => { loadTugas(); }, [loadTugas]);

  // Timer countdown — dihitung dari deadline yang dikirim server, bukan durasi
  // lokal, supaya tidak bisa dimanipulasi lewat jam/JS di sisi klien.
  useEffect(() => {
    if (phase !== "active" || deadlineTs == null) return;
    const tick = () => setSisaMs(deadlineTs - Date.now());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [phase, deadlineTs]);

  const buildPayload = useCallback((dipaksa: boolean) => {
    const t = tugas;
    const isPraktik = t?.tipe === "PRAKTIK";
    const isSoalBased = t?.tipe === "PILIHAN_GANDA" || t?.tipe === "ESSAY";
    const isPg = t?.tipe === "PILIHAN_GANDA";
    const payload: Record<string, unknown> = { dipaksa, catatan: catatanRef.current || undefined };
    if (isPraktik) {
      payload.submittedHtml = codeRef.current.html;
      payload.submittedCss = codeRef.current.css;
      payload.submittedJs = codeRef.current.js;
    }
    if (isSoalBased) {
      const soalList = t?.soal ?? [];
      const arr = soalList.map((s) => ({
        soalId: s.id,
        ...(isPg ? { jawabanPilihan: jawabanRef.current[s.id] ?? "" } : { jawabanEssay: jawabanRef.current[s.id] ?? "" }),
      }));
      payload.jawaban = JSON.stringify(arr);
    }
    return payload;
  }, [tugas]);

  // Kirim jawaban paksa (beacon, tetap terkirim walau halaman langsung
  // ditutup) LALU logout — urutan ini penting supaya beacon sempat terkirim
  // sebelum cookie sesi dihapus. redirectAfter=false dipakai di beforeunload
  // karena memaksa navigasi saat halaman sedang unload itu sia-sia/berisiko.
  const fireForcedKeluar = useCallback((redirectAfter: boolean) => {
    if (firedRef.current || phaseRef.current !== "active") return;
    firedRef.current = true;
    const payload = JSON.stringify(buildPayload(true));
    const url = `/api/tugas/${tugasIdRef.current}/paksa-keluar`;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    } catch {
      // sendBeacon jarang melempar error, tapi jaga-jaga agar tidak crash halaman.
    }
    if (redirectAfter) {
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        window.location.href = "/login";
      });
    }
  }, [buildPayload]);

  // Deteksi keluar halaman: visibilitychange (ganti tab/minimize/tutup) adalah
  // sinyal paling andal; beforeunload untuk penutupan tab langsung; cleanup
  // saat unmount untuk navigasi SPA internal (tombol back, dsb).
  useEffect(() => {
    if (phase !== "active") return;
    function onVisibility() {
      if (document.hidden) fireForcedKeluar(true);
    }
    function onBeforeUnload(e: BeforeUnloadEvent) {
      fireForcedKeluar(false);
      e.preventDefault();
      e.returnValue = "";
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      fireForcedKeluar(true);
    };
  }, [phase, fireForcedKeluar]);

  // Anti salin-tempel di seluruh halaman selama mengerjakan.
  useEffect(() => {
    if (phase !== "active") return;
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [phase]);

  async function handleMulai() {
    setStarting(true);
    try {
      const res = await fetch(`/api/tugas/${tugasId}/mulai-percobaan`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Tidak bisa memulai", d.message ?? "Coba lagi");
        loadTugas();
        return;
      }
      firedRef.current = false;
      setPercobaanKe(d.percobaanKe);
      setDeadlineTs(d.deadlineWaktu ? new Date(d.deadlineWaktu).getTime() : null);
      setCode({ html: d.tugas.starterHtml ?? "", css: d.tugas.starterCss ?? "", js: d.tugas.starterJs ?? "" });
      setJawaban({});
      setCatatan("");
      setTugas((prev) => (prev ? { ...prev, soal: d.tugas.soal ?? prev.soal } : prev));
      setPhase("active");
    } catch {
      toast.error("Server tidak dapat dijangkau");
    } finally {
      setStarting(false);
    }
  }

  const doSubmit = useCallback(async (dipaksa: boolean) => {
    firedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tugas/${tugasId}/submit-percobaan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(dipaksa)),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error("Gagal mengumpulkan", d.message ?? "Coba lagi");
        firedRef.current = false;
        return;
      }
      setPhase("submitted");
    } catch {
      toast.error("Server tidak dapat dijangkau");
      firedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [tugasId, buildPayload, toast]);

  useEffect(() => {
    if (phase === "active" && sisaMs != null && sisaMs <= 0 && !submitting) {
      doSubmit(false);
    }
  }, [phase, sisaMs, submitting, doSubmit]);

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-slate-900">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-slate-900">
        <ShieldAlert size={40} className="text-red-400" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{errorMsg}</p>
        <button onClick={() => router.replace("/siswa/materi?tab=tugas")}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#0082FB" }}>
          Kembali ke Materi
        </button>
      </div>
    );
  }

  if (phase === "diterima") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-slate-900">
        <CheckCircle2 size={40} className="text-[#00D67F]" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tugas ini sudah diterima, tidak perlu dikerjakan lagi.</p>
        <button onClick={() => router.replace("/siswa/materi?tab=tugas")}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#0082FB" }}>
          Kembali ke Materi
        </button>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-slate-900">
        <CheckCircle2 size={40} className="text-[#00D67F]" />
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">Jawaban berhasil dikumpulkan!</p>
        <p className="text-xs text-slate-400">Guru/Admin akan mereview tugasmu.</p>
        <button onClick={() => router.replace("/siswa/materi?tab=tugas")}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#0082FB" }}>
          Kembali ke Materi
        </button>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white p-6 text-center dark:bg-slate-900">
        <Lock size={40} className="text-slate-300" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Percobaan kamu untuk tugas ini sudah habis (maksimal {MAKSIMAL_PERCOBAAN}x).
        </p>
        <p className="text-xs text-slate-400">Hubungi guru mapel jika butuh kesempatan ulang.</p>
        <button onClick={() => router.replace("/siswa/materi?tab=tugas")}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: "#0082FB" }}>
          Kembali ke Materi
        </button>
      </div>
    );
  }

  if (!tugas) return null;

  const isPraktik = tugas.tipe === "PRAKTIK";
  const isPg = tugas.tipe === "PILIHAN_GANDA";
  const isSoalBased = isPg || tugas.tipe === "ESSAY";
  const soalList = tugas.soal ?? [];
  const warna = isPraktik ? "#00D67F" : isPg ? "#C3F84A" : "#0064E0";
  const textOnWarna = isPg ? "#1C2B33" : "#FFFFFF";
  const Icon = isPraktik ? Code2 : isPg ? ListChecks : PenLine;

  if (phase === "intro") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-white p-6 text-center dark:bg-slate-900">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: warna, color: textOnWarna }}>
          <Icon size={26} />
        </div>
        <div>
          <p className="text-lg font-black text-slate-800 dark:text-white">{tugas.judul}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{tugas.mapel}</p>
        </div>
        {tugas.deskripsi && (
          <p className="max-w-md rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {tugas.deskripsi}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Percobaan ke-{percobaanKe} dari {MAKSIMAL_PERCOBAAN}
          </span>
          {tugas.durasiMenit ? (
            <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Timer size={11} /> {tugas.durasiMenit} menit
            </span>
          ) : null}
        </div>
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-left text-[11px] leading-relaxed text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-400">
          Lembar pengerjaan ini <strong>terkunci</strong>: tidak bisa salin-tempel, dan jika kamu meninggalkan halaman ini
          (pindah tab, menutup jendela, atau menekan tombol kembali) kamu akan <strong>otomatis logout</strong> dan jawaban
          yang sudah terisi <strong>langsung tersimpan</strong> sebagai jawaban akhir. Kesempatan mengerjakan hanya {MAKSIMAL_PERCOBAAN}x.
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.replace("/siswa/materi?tab=tugas")}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Batal
          </button>
          <button onClick={handleMulai} disabled={starting}
            className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-sm disabled:opacity-60"
            style={{ background: warna, color: textOnWarna }}>
            {starting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Mulai Mengerjakan
          </button>
        </div>
      </div>
    );
  }

  // phase === "active"
  const habisSebentarLagi = sisaMs != null && sisaMs <= 60_000;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#F1F5F8] dark:bg-slate-900" style={{ userSelect: "none" }}>
      <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-5 py-3.5" style={{ background: warna, color: textOnWarna }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: isPg ? "#1C2B3326" : "#FFFFFF26" }}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{tugas.judul}</p>
          <p className="flex items-center gap-1.5 text-[11px]" style={{ opacity: 0.75 }}>
            <Lock size={10} /> Mode terkunci · Percobaan {percobaanKe}/{MAKSIMAL_PERCOBAAN}
          </p>
        </div>
        {sisaMs != null && (
          <span className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black tabular-nums ${habisSebentarLagi ? "animate-pulse" : ""}`}
            style={{ backgroundColor: habisSebentarLagi ? "#EF4444" : (isPg ? "#1C2B3326" : "#FFFFFF26"), color: habisSebentarLagi ? "#FFFFFF" : textOnWarna }}>
            <Timer size={12} /> {formatSisaWaktu(sisaMs)}
          </span>
        )}
        <button onClick={() => setShowConfirmSelesai(true)} disabled={submitting}
          className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-sm disabled:opacity-60"
          style={{ backgroundColor: isPg ? "#1C2B33" : "#FFFFFF", color: isPg ? "#FFFFFF" : "#1C2B33" }}>
          <Send size={12} /> Selesai
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tugas.deskripsi && (
          <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            {tugas.deskripsi}
          </p>
        )}

        {isPraktik && (
          <CodePracticeCanvas
            key={tugas.id}
            initialHtml={code.html}
            initialCss={code.css}
            initialJs={code.js}
            onChange={setCode}
            minHeight={520}
            restrictPaste
          />
        )}

        {isSoalBased && (
          soalList.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada soal pada tugas ini.</p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {soalList.map((s: TugasSoalItem, idx: number) => (
                <div key={s.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
                  <p className="mb-3 text-sm font-bold text-slate-800 dark:text-white">{idx + 1}. {s.pertanyaan}</p>
                  {isPg ? (
                    <div className="space-y-1.5">
                      {(["A", "B", "C", "D"] as const).map((huruf) => {
                        const teks = s[`pilihan${huruf}` as "pilihanA" | "pilihanB" | "pilihanC" | "pilihanD"];
                        if (!teks) return null;
                        const active = jawaban[s.id] === huruf;
                        return (
                          <button key={huruf} type="button"
                            onClick={() => setJawaban((prev) => ({ ...prev, [s.id]: huruf }))}
                            className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                              active ? "border-[#C3F84A] bg-[#F1F5F8] dark:bg-[#1C2B33]/20" : "border-slate-200 hover:border-[#F1F5F8] dark:border-slate-600"
                            }`}>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              active ? "bg-[#C3F84A] text-[#1C2B33]" : "bg-slate-100 text-slate-500 dark:bg-slate-700"
                            }`}>{huruf}</span>
                            <span className="text-slate-700 dark:text-slate-200">{teks}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea rows={4} value={jawaban[s.id] ?? ""}
                      onChange={(e) => setJawaban((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Tulis jawabanmu..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showConfirmSelesai && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <p className="mb-2 text-base font-extrabold text-slate-800 dark:text-white">Kumpulkan sekarang?</p>
            <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
              Setelah dikumpulkan, jawaban ini tidak bisa diubah lagi kecuali guru meminta revisi.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmSelesai(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-500 dark:border-slate-600 dark:text-slate-400">
                Batal
              </button>
              <button onClick={() => { setShowConfirmSelesai(false); doSubmit(false); }} disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "#00D67F" }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Ya, Kumpulkan
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
