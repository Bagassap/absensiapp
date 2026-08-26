"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Upload, File as FileIcon, CalendarClock, Code2, ListChecks, PenLine, Download } from "lucide-react";
import { CodePracticeCanvas } from "@/components/materi/CodePracticeCanvas";
import type { TugasItem } from "./types";
import { formatTgl } from "./types";

// Lampiran (soal/materi pendukung) yang diunggah guru/admin saat membuat
// tugas — tampil di setiap mode pengerjaan (Kirim File/Praktik/Pilihan
// Ganda/Essay) supaya siswa selalu bisa mengunduhnya sebelum mengerjakan.
function LampiranGuru({ tugas }: { tugas: TugasItem }) {
  if (!tugas.fileUrl) return null;
  return (
    <a href={tugas.fileUrl} target="_blank" rel="noopener noreferrer"
      className="mb-4 flex shrink-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200 dark:hover:bg-slate-700">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400">
        <Download size={14} />
      </span>
      <span className="min-w-0 flex-1 truncate">
        {tugas.fileName ?? "Lampiran dari guru"}
      </span>
    </a>
  );
}

// Akun demo/showcase yang dikecualikan dari pembatasan anti-copas mode
// Praktik Kode — nama harus cocok persis dengan data user di database.
const PASTE_RESTRICTION_EXEMPT_NAMA = "Bagas Demo";

function SubmitPraktikModal({
  tugas, onClose, onSubmit, restrictPaste,
}: {
  tugas: TugasItem;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
  restrictPaste: boolean;
}) {
  const mySubmisi = tugas.submisi?.[0];
  const [code, setCode] = useState({
    html: mySubmisi?.submittedHtml ?? tugas.starterHtml ?? "",
    css: mySubmisi?.submittedCss ?? tugas.starterCss ?? "",
    js: mySubmisi?.submittedJs ?? tugas.starterJs ?? "",
  });
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const fd = new FormData();
    fd.append("tugasId", tugas.id);
    fd.append("submittedHtml", code.html);
    fd.append("submittedCss", code.css);
    fd.append("submittedJs", code.js);
    if (catatan.trim()) fd.append("catatan", catatan.trim());
    await onSubmit(fd);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
        className="relative flex h-[95dvh] w-full max-w-[1400px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-6 py-4"
          style={{ background: "#00D67F" }}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Code2 size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold text-white">{tugas.judul}</h2>
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <CalendarClock size={11} /> Deadline {formatTgl(tugas.deadline)}
            </p>
          </div>
          <button onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-5">
          <LampiranGuru tugas={tugas} />
          {tugas.deskripsi && (
            <p className="mb-4 shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
              {tugas.deskripsi}
            </p>
          )}
          <div className="min-h-0 flex-1">
            <CodePracticeCanvas
              key={tugas.id}
              initialHtml={code.html}
              initialCss={code.css}
              initialJs={code.js}
              onChange={setCode}
              minHeight={560}
              restrictPaste={restrictPaste}
            />
          </div>
          <div className="mt-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Catatan (opsional)</label>
              <input value={catatan} onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tambahkan keterangan jika diperlukan..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
            </div>
            <button onClick={submit} disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
              style={{ background: "#00D67F" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Mengirim...</> : <><Send size={14} /> Kirim Tugas</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SubmitFileModal({
  tugas, onClose, onSubmit,
}: {
  tugas: TugasItem;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [catatan, setCatatan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("tugasId", tugas.id);
    if (catatan.trim()) fd.append("catatan", catatan.trim());
    fd.append("file", file);
    await onSubmit(fd);
    setSaving(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="relative px-6 py-5 overflow-hidden" style={{ background: "#00D67F" }}>
          <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Send size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Kumpulkan Tugas</p>
                <p className="text-base font-extrabold text-white leading-tight line-clamp-1">{tugas.judul}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
              <X size={15} />
            </button>
          </div>
          <p className="relative mt-2 flex items-center gap-1.5 text-[11px] text-white/80">
            <CalendarClock size={11} /> Deadline {formatTgl(tugas.deadline)}
          </p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <LampiranGuru tugas={tugas} />
          {tugas.deskripsi && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 px-3.5 py-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {tugas.deskripsi}
            </div>
          )}
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 transition-colors">
            <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx,.zip,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <FileIcon size={16} className="text-emerald-500" /><span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div><Upload size={26} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-500">Klik untuk upload PDF/PPT/ZIP jawaban</p></div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Catatan (opsional)</label>
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
              placeholder="Tambahkan keterangan jika diperlukan..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-emerald-400 placeholder:text-slate-400" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Batal
            </button>
            <button type="submit" disabled={saving || !file}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "#00D67F" }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Mengirim...</> : <><Send size={14} /> Kumpulkan</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function SubmitSoalModal({
  tugas, onClose, onSubmit,
}: {
  tugas: TugasItem;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const isPg = tugas.tipe === "PILIHAN_GANDA";
  const soalList = tugas.soal ?? [];
  const prevJawaban = tugas.submisi?.[0]?.jawaban ?? [];
  const [jawaban, setJawaban] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const j of prevJawaban) init[j.soalId] = (isPg ? j.jawabanPilihan : j.jawabanEssay) ?? "";
    return init;
  });
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const warna = isPg ? "#C3F84A" : "#0064E0";

  async function submit() {
    setSaving(true);
    const fd = new FormData();
    fd.append("tugasId", tugas.id);
    const payload = soalList.map((s) => ({
      soalId: s.id,
      ...(isPg ? { jawabanPilihan: jawaban[s.id] ?? "" } : { jawabanEssay: jawaban[s.id] ?? "" }),
    }));
    fd.append("jawaban", JSON.stringify(payload));
    if (catatan.trim()) fd.append("catatan", catatan.trim());
    await onSubmit(fd);
    setSaving(false);
  }

  const answeredCount = soalList.filter((s) => (jawaban[s.id] ?? "").trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: "spring", damping: 24, stiffness: 320 }}
        className="relative flex h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">
        <div className="relative flex shrink-0 items-center gap-3 overflow-hidden px-6 py-4" style={{ background: warna, color: isPg ? "#1C2B33" : "#FFFFFF" }}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full" style={{ backgroundColor: isPg ? "#1C2B331A" : "#FFFFFF1A" }} />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: isPg ? "#1C2B3326" : "#FFFFFF26" }}>
            {isPg ? <ListChecks size={18} /> : <PenLine size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-extrabold">{tugas.judul}</h2>
            <p className="flex items-center gap-1.5 text-xs" style={{ opacity: 0.75 }}>
              <CalendarClock size={11} /> Deadline {formatTgl(tugas.deadline)} · {answeredCount}/{soalList.length} terjawab
            </p>
          </div>
          <button onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{ backgroundColor: isPg ? "#1C2B3326" : "#FFFFFF26" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <LampiranGuru tugas={tugas} />
          {tugas.deskripsi && (
            <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
              {tugas.deskripsi}
            </p>
          )}
          {soalList.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada soal pada tugas ini.</p>
          ) : (
            <div className="space-y-4">
              {soalList.map((s, idx) => (
                <div key={s.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
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
                    <textarea rows={3} value={jawaban[s.id] ?? ""}
                      onChange={(e) => setJawaban((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder="Tulis jawabanmu..."
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 p-5 dark:border-slate-700 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Catatan (opsional)</label>
            <input value={catatan} onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tambahkan keterangan jika diperlukan..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </div>
          <button onClick={submit} disabled={saving || soalList.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            style={{ background: warna }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Mengirim...</> : <><Send size={14} /> Kirim Jawaban</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function SubmitTugasModal({
  tugas, onClose, onSubmit, currentUserNama,
}: {
  tugas: TugasItem | null;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
  // Nama siswa yang sedang login (dari /api/auth/me) — dipakai untuk
  // mengecualikan akun demo dari pembatasan anti-copas mode Praktik Kode.
  currentUserNama?: string;
}) {
  const restrictPaste = currentUserNama !== PASTE_RESTRICTION_EXEMPT_NAMA;
  return (
    <AnimatePresence>
      {tugas && (
        tugas.tipe === "PRAKTIK" ? <SubmitPraktikModal tugas={tugas} onClose={onClose} onSubmit={onSubmit} restrictPaste={restrictPaste} />
        : tugas.tipe === "PILIHAN_GANDA" || tugas.tipe === "ESSAY" ? <SubmitSoalModal tugas={tugas} onClose={onClose} onSubmit={onSubmit} />
        : <SubmitFileModal tugas={tugas} onClose={onClose} onSubmit={onSubmit} />
      )}
    </AnimatePresence>
  );
}
