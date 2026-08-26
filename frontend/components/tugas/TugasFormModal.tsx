"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ClipboardList, Loader2, Upload, File as FileIcon, CalendarClock, Send, Code2,
  ListChecks, PenLine, Plus, Trash2, CheckCircle2, Timer, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { CodePracticeCanvas } from "@/components/materi/CodePracticeCanvas";
import { formatTglJam } from "./types";
import type { TugasItem, TugasTipe } from "./types";

type KelasOption = { id: string; nama: string };

type SoalDraft = {
  pertanyaan: string;
  pilihanA: string;
  pilihanB: string;
  pilihanC: string;
  pilihanD: string;
  jawabanBenar: string;
};

function emptySoal(): SoalDraft {
  return { pertanyaan: "", pilihanA: "", pilihanB: "", pilihanC: "", pilihanD: "", jawabanBenar: "" };
}

const INPUT_CLS = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-[#0082FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082FB]/15 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-700";

// Selalu baca/tulis nilai datetime-local sebagai jam dinding WIB (Asia/Jakarta),
// bukan timezone lokal browser/OS — server & sebagian browser testing berjalan
// di UTC, jadi getHours()/getFullYear() bawaan JS bisa salah 7 jam kalau dipakai
// langsung. Pola ini sama seperti jakartaNow() di LiveClock.tsx.
function toLocalInputValue(iso?: string | null) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3600 * 1000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// datetime-local tidak membawa info zona waktu sama sekali — nilainya harus
// ditafsirkan eksplisit sebagai WIB (+07:00), bukan diserahkan ke `new Date()`
// yang akan memakainya sebagai timezone lokal runtime (bisa UTC di server/browser testing).
function wibInputToIso(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}

const TIPE_OPTIONS: { value: TugasTipe; label: string; icon: typeof Send; gradient: string; desc: string }[] = [
  { value: "SUBMIT", label: "Kirim File", icon: Send, gradient: "#0082FB", desc: "Siswa mengunggah file jawaban (PDF/PPT/ZIP), tanpa mode pengerjaan di LMS." },
  { value: "PRAKTIK", label: "Praktik Kode", icon: Code2, gradient: "#00D67F", desc: "Siswa mengetik HTML/CSS/JS langsung di LMS dan hasilnya tampil live." },
  { value: "PILIHAN_GANDA", label: "Pilihan Ganda", icon: ListChecks, gradient: "#C3F84A", desc: "Siswa memilih jawaban A–D untuk tiap soal." },
  { value: "ESSAY", label: "Essay", icon: PenLine, gradient: "#0064E0", desc: "Siswa mengetik jawaban esai untuk tiap soal." },
];

export function TugasFormModal({
  open, tugas, onClose, onSaved, mapelOptions,
}: {
  open: boolean;
  tugas?: TugasItem | null;
  onClose: () => void;
  onSaved: (t: TugasItem) => void;
  // Bila diisi, field Mata Pelajaran jadi dropdown terbatas pada daftar ini
  // (dipakai di halaman Guru — mapel yang benar-benar diampu, dari mapel.xlsx).
  // Kosongkan/undefined untuk tetap pakai input teks bebas (halaman Admin).
  mapelOptions?: string[];
}) {
  const isEdit = !!tugas;
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deadlineInputRef = useRef<HTMLInputElement>(null);

  function openDeadlinePicker() {
    const el = deadlineInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch { /* fall through to focus */ }
    }
    el.focus();
  }

  const [mapel, setMapel] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [deadline, setDeadline] = useState(toLocalInputValue());
  const [tipe, setTipe] = useState<TugasTipe>("SUBMIT");
  const [durasiMenit, setDurasiMenit] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [code, setCode] = useState({ html: "", css: "", js: "" });
  const [soalList, setSoalList] = useState<SoalDraft[]>([emptySoal()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSoalBased = tipe === "PILIHAN_GANDA" || tipe === "ESSAY";

  useEffect(() => {
    if (open) {
      setMapel(tugas?.mapel ?? "");
      setKelasId(tugas?.kelasId ?? "");
      setJudul(tugas?.judul ?? "");
      setDeskripsi(tugas?.deskripsi ?? "");
      setDeadline(toLocalInputValue(tugas?.deadline));
      setTipe((tugas?.tipe as TugasTipe) ?? "SUBMIT");
      setDurasiMenit(tugas?.durasiMenit ? String(tugas.durasiMenit) : "");
      setFile(null);
      setCode({ html: tugas?.starterHtml ?? "", css: tugas?.starterCss ?? "", js: tugas?.starterJs ?? "" });
      setSoalList(
        tugas?.soal?.length
          ? tugas.soal.map((s) => ({
              pertanyaan: s.pertanyaan,
              pilihanA: s.pilihanA ?? "",
              pilihanB: s.pilihanB ?? "",
              pilihanC: s.pilihanC ?? "",
              pilihanD: s.pilihanD ?? "",
              jawabanBenar: s.jawabanBenar ?? "",
            }))
          : [emptySoal()]
      );
      setError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetch("/api/kelas").then((r) => r.json()).then((d) => setKelasList(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [open, tugas]);

  function updateSoal(idx: number, patch: Partial<SoalDraft>) {
    setSoalList((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function addSoal() {
    setSoalList((prev) => [...prev, emptySoal()]);
  }
  function removeSoal(idx: number) {
    setSoalList((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim() || !mapel.trim() || !deadline) {
      setError("Mata pelajaran, judul, dan deadline wajib diisi.");
      return;
    }
    if (isSoalBased && soalList.every((s) => !s.pertanyaan.trim())) {
      setError("Minimal 1 soal dengan pertanyaan wajib diisi.");
      return;
    }
    if (tipe === "PILIHAN_GANDA" && soalList.some((s) => s.pertanyaan.trim() && !s.jawabanBenar)) {
      setError("Setiap soal pilihan ganda wajib punya jawaban benar — klik salah satu huruf di samping pilihan.");
      return;
    }
    if (tipe === "ESSAY" && soalList.some((s) => s.pertanyaan.trim() && !s.jawabanBenar.trim())) {
      setError("Setiap soal essay wajib punya kunci jawaban sebagai acuan penilaian.");
      return;
    }
    if (isSoalBased && (!durasiMenit.trim() || Number(durasiMenit) < 1)) {
      setError("Durasi pengerjaan wajib diisi (dalam menit) untuk tugas Pilihan Ganda/Essay.");
      return;
    }
    if (tipe === "PRAKTIK" && durasiMenit.trim() && Number(durasiMenit) < 1) {
      setError("Durasi pengerjaan harus lebih dari 0 menit.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("mapel", mapel);
      fd.append("kelasId", kelasId);
      fd.append("judul", judul);
      fd.append("deskripsi", deskripsi);
      fd.append("deadline", wibInputToIso(deadline));
      fd.append("tipe", tipe);
      if (tipe !== "SUBMIT" && durasiMenit.trim()) fd.append("durasiMenit", durasiMenit.trim());
      if (tipe === "PRAKTIK") {
        fd.append("starterHtml", code.html);
        fd.append("starterCss", code.css);
        fd.append("starterJs", code.js);
      }
      if (isSoalBased) {
        const payload = soalList
          .filter((s) => s.pertanyaan.trim())
          .map((s) =>
            tipe === "PILIHAN_GANDA"
              ? { pertanyaan: s.pertanyaan, pilihanA: s.pilihanA, pilihanB: s.pilihanB, pilihanC: s.pilihanC, pilihanD: s.pilihanD, jawabanBenar: s.jawabanBenar }
              : { pertanyaan: s.pertanyaan, jawabanBenar: s.jawabanBenar }
          );
        fd.append("soal", JSON.stringify(payload));
      }
      if (file) fd.append("file", file);

      const url = isEdit ? `/api/tugas/${tugas!.id}` : "/api/tugas";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, { method, body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = Array.isArray(d.message) ? d.message.join(", ") : (d.message ?? "Gagal menyimpan tugas.");
        setError(msg);
        toast.error("Gagal menyimpan", msg);
        return;
      }
      const saved = await res.json();
      toast.success(isEdit ? "Tugas diperbarui!" : "Tugas ditambahkan!", judul);
      onSaved(saved);
      onClose();
    } catch {
      const msg = "Server tidak dapat dijangkau.";
      setError(msg);
      toast.error("Koneksi bermasalah", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800 ${tipe === "PRAKTIK" || isSoalBased ? "max-w-3xl" : "max-w-lg"}`}
          >
            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-[#0082FB] px-6 py-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <ClipboardList size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Tugas</p>
                <h2 className="text-base font-extrabold text-white">{isEdit ? "Edit Tugas" : "Tambah Tugas"}</h2>
              </div>
              <button onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  {mapelOptions ? (
                    <select value={mapel} onChange={(e) => setMapel(e.target.value)} className={INPUT_CLS}>
                      <option value="">Pilih mata pelajaran…</option>
                      {(mapel && !mapelOptions.includes(mapel) ? [mapel, ...mapelOptions] : mapelOptions).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={mapel} onChange={(e) => setMapel(e.target.value)}
                      placeholder="Contoh: Pemrograman Web" className={INPUT_CLS} />
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Kelas Target</label>
                  <select value={kelasId} onChange={(e) => setKelasId(e.target.value)} className={INPUT_CLS}>
                    <option value="">Semua Kelas</option>
                    {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Judul Tugas <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={judul} onChange={(e) => setJudul(e.target.value)}
                    placeholder="Contoh: Membuat Landing Page" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
                    <CalendarClock size={12} /> Deadline <span className="text-red-500">*</span>
                  </label>
                  {/* Widget datetime-local bawaan browser menampilkan angka mentah ala
                      ISO/UTC (bukan format Indonesia) dan tidak bisa di-restyle — jadi
                      disembunyikan, tombol ini yang tampil dan menampilkan hasilnya
                      dalam format Indonesia + WIB, sambil tetap membuka picker native. */}
                  <button type="button" onClick={openDeadlinePicker}
                    className={INPUT_CLS + " flex items-center justify-between text-left"}>
                    <span className={deadline ? "" : "text-gray-400"}>
                      {deadline ? formatTglJam(wibInputToIso(deadline)) : "Pilih deadline…"}
                    </span>
                    <CalendarClock size={14} className="shrink-0 text-gray-400" />
                  </button>
                  <input ref={deadlineInputRef} type="datetime-local" value={deadline}
                    onChange={(e) => setDeadline(e.target.value)} tabIndex={-1}
                    className="pointer-events-none absolute h-0 w-0 opacity-0" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Jenis Pengerjaan</label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {TIPE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setTipe(opt.value)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-xs font-bold transition-all ${
                        tipe === opt.value ? "shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                      style={tipe === opt.value ? { background: opt.gradient, color: opt.gradient === "#C3F84A" ? "#1C2B33" : "#FFFFFF" } : {}}>
                      <opt.icon size={14} /> {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-slate-500">
                  {TIPE_OPTIONS.find((o) => o.value === tipe)?.desc}
                </p>
              </div>

              {tipe !== "SUBMIT" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/40 dark:bg-amber-900/10">
                  <div className="mb-2 flex items-start gap-2">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                      Tugas jenis ini dikerjakan siswa di <strong>lembar pengerjaan terkunci</strong> (halaman penuh, anti salin-tempel, siswa otomatis keluar &amp; jawaban tersimpan bila meninggalkan halaman) — maksimal 2 percobaan.
                    </p>
                  </div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
                    <Timer size={12} /> Durasi Pengerjaan (menit) {isSoalBased && <span className="text-red-500">*</span>}
                  </label>
                  <input type="number" min={1} value={durasiMenit} onChange={(e) => setDurasiMenit(e.target.value)}
                    placeholder={isSoalBased ? "Contoh: 60" : "Kosongkan jika tanpa batas waktu"} className={INPUT_CLS} />
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                    {isSoalBased ? "Wajib diisi — timer berjalan otomatis di lembar pengerjaan siswa." : "Opsional untuk Praktik Kode — kosongkan untuk tanpa batas waktu (lockdown tetap aktif)."}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Instruksi / Deskripsi</label>
                <textarea rows={3} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Jelaskan instruksi pengerjaan tugas ini…" className={INPUT_CLS + " resize-none"} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                  File Soal / Lampiran <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-[#0082FB]/40 hover:bg-[#0082FB]/5 dark:border-slate-600 dark:bg-slate-700/40">
                  <Upload size={16} className="shrink-0 text-[#0082FB]" />
                  <div className="min-w-0 flex-1">
                    {file ? (
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-800 dark:text-slate-200">
                        <FileIcon size={13} className="shrink-0" /> {file.name}
                      </p>
                    ) : tugas?.fileName ? (
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-200">{tugas.fileName} <span className="font-normal text-gray-400">(saat ini, pilih untuk ganti)</span></p>
                    ) : (
                      <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Klik untuk unggah PDF/PPT/ZIP (maks. 20MB)</p>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx,.zip,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              </div>

              {tipe === "PRAKTIK" && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                    Kode Awal Praktik <span className="font-normal text-gray-400">(tampil sebagai starter code siswa)</span>
                  </label>
                  <CodePracticeCanvas
                    initialHtml={tugas?.starterHtml ?? ""}
                    initialCss={tugas?.starterCss ?? ""}
                    initialJs={tugas?.starterJs ?? ""}
                    onChange={setCode}
                    minHeight={320}
                  />
                </div>
              )}

              {isSoalBased && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                      Daftar Soal <span className="text-red-500">*</span>
                    </label>
                    <button type="button" onClick={addSoal}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm"
                      style={{ background: "#0082FB" }}>
                      <Plus size={12} /> Tambah Soal
                    </button>
                  </div>
                  <div className="space-y-3">
                    {soalList.map((s, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 dark:border-slate-600 dark:bg-slate-700/30">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">Soal {idx + 1}</span>
                          {soalList.length > 1 && (
                            <button type="button" onClick={() => removeSoal(idx)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <textarea rows={2} value={s.pertanyaan} onChange={(e) => updateSoal(idx, { pertanyaan: e.target.value })}
                          placeholder="Tulis pertanyaan..." className={INPUT_CLS + " resize-none mb-2"} />
                        {tipe === "PILIHAN_GANDA" && (
                          <div>
                            <label className="mb-1.5 block text-[11px] font-bold text-gray-500 dark:text-slate-400">
                              Pilihan Jawaban <span className="text-red-500">*</span>{" "}
                              <span className="font-normal text-gray-400">(klik lingkaran di samping pilihan untuk menandai jawaban yang benar)</span>
                            </label>
                            <div className="space-y-1.5">
                              {(["A", "B", "C", "D"] as const).map((huruf) => {
                                const isKey = s.jawabanBenar === huruf;
                                return (
                                  <div key={huruf} className="flex items-center gap-2">
                                    <button type="button" onClick={() => updateSoal(idx, { jawabanBenar: huruf })}
                                      title="Tandai sebagai jawaban benar"
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                                        isKey ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white text-gray-400 hover:border-emerald-400 dark:bg-slate-700 dark:border-slate-600"
                                      }`}>
                                      {isKey ? <CheckCircle2 size={15} /> : huruf}
                                    </button>
                                    <input value={s[`pilihan${huruf}` as keyof SoalDraft]}
                                      onChange={(e) => updateSoal(idx, { [`pilihan${huruf}`]: e.target.value } as Partial<SoalDraft>)}
                                      placeholder={`Pilihan ${huruf}`}
                                      className={`w-full rounded-lg border bg-white px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-[#0082FB] dark:bg-slate-800 dark:text-slate-100 ${
                                        isKey ? "border-emerald-300 dark:border-emerald-700" : "border-gray-200 dark:border-slate-600"
                                      }`} />
                                    {isKey && <span className="shrink-0 text-[10px] font-bold text-emerald-500">Jawaban Benar</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {s.pertanyaan.trim() && !s.jawabanBenar ? (
                              <p className="mt-1.5 pl-9 text-[10px] font-bold text-red-500">⚠ Belum ada jawaban benar yang ditandai untuk soal ini</p>
                            ) : (
                              <p className="mt-1.5 pl-9 text-[10px] text-gray-400">Klik lingkaran huruf untuk menandai jawaban benar</p>
                            )}
                          </div>
                        )}
                        {tipe === "ESSAY" && (
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-500 dark:text-slate-400">
                              Kunci Jawaban <span className="text-red-500">*</span>{" "}
                              <span className="font-normal text-gray-400">(acuan untuk kamu cocokkan saat menilai, tidak dikirim ke siswa)</span>
                            </label>
                            <textarea rows={2} value={s.jawabanBenar} onChange={(e) => updateSoal(idx, { jawabanBenar: e.target.value })}
                              placeholder="Tulis jawaban ideal / poin kunci yang harus ada..."
                              className={`w-full resize-none rounded-lg border bg-emerald-50/50 px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-emerald-400 dark:bg-emerald-900/10 dark:text-slate-100 ${
                                s.pertanyaan.trim() && !s.jawabanBenar.trim() ? "border-red-300 dark:border-red-800" : "border-emerald-200 dark:border-emerald-800"
                              }`} />
                            {s.pertanyaan.trim() && !s.jawabanBenar.trim() && (
                              <p className="mt-1.5 text-[10px] font-bold text-red-500">⚠ Belum ada kunci jawaban untuk soal ini</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>
              )}
            </form>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 p-6 pt-4 dark:border-slate-700">
              <button type="button" onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                Batal
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
                style={{ background: "#0082FB" }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Tugas"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
