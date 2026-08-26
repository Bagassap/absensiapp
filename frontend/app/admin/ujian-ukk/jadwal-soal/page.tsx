"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, FileText, FileSpreadsheet, Download, Trash2, Plus, Clock,
  MapPin, User, ChevronDown, ChevronUp, Send, CheckCircle,
  AlertCircle, X, Pencil, Upload, BookOpen, ChevronLeft,
  ChevronRight, CloudUpload, Loader2, PieChart, Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useToast } from "@/components/shared/ToastSystem";
import { todayJakarta } from "@/components/absensi-harian/shared";

const SoalPdfViewer = dynamic(() => import("./SoalPdfViewer"), { ssr: false, loading: () => (
  <div className="flex-1 flex items-center justify-center py-20">
    <Loader2 size={28} className="animate-spin text-[#C3F84A]"/>
  </div>
)});

const PRIMARY = "#0082FB";

const PALETTE = [
  { bg: "#EAF3FF", text: "#0082FB",  bar: "#0082FB",  gradient: "#0082FB" },
  { bg: "#E3FBF0", text: "#00D67F",  bar: "#00D67F",  gradient: "#00D67F" },
  { bg: "#FEE9EA", text: "#EF4444",  bar: "#EF4444",  gradient: "#EF4444" },
  { bg: "#F1F5F8", text: "#8A9E1F",  bar: "#8A9E1F",  gradient: "#C3F84A" }, // lime — text/bar dipakaikan varian gelap supaya kontras
  { bg: "#EAF3FF", text: "#0064E0",  bar: "#0064E0",  gradient: "#0082FB" },
];
function rowPalette(idx: number) { return PALETTE[idx % PALETTE.length]; }

type StatusSubmisi = "TERKIRIM" | "DITERIMA" | "REVISI";

interface Soal { id: string; judul: string; deskripsi?: string; fileUrl: string; fileName: string; _count?: { submisi: number }; }
interface Tahapan { id: string; hariKe: number; judul: string; tanggal: string; jamMulai: string; jamSelesai: string; lokasi: string; penguji?: string; keterangan?: string; soal: Soal[]; }
interface Submisi { id: string; fileUrl: string; fileName: string; catatan?: string; pesanRevisi?: string; status: StatusSubmisi; submittedAt: string; soal: { id: string; judul: string }; siswa: { id: string; nama: string; user: { id: string; nama: string } }; }
function formatTgl(s: string) { return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }); }
function statusBadge(s: StatusSubmisi) {
  if (s === "DITERIMA") return { bg: "#E3FBF0", text: "#00D67F", icon: <CheckCircle size={10} /> };
  if (s === "REVISI")   return { bg: "#F1F5F8", text: "#8A9E1F", icon: <AlertCircle size={10} /> };
  return { bg: "#EAF3FF", text: "#0082FB", icon: <Clock size={10} /> };
}
function roleAvatar(role: string) { const m: Record<string, string> = { ADMIN: "#0082FB", GURU: "#0082FB", SISWA: "#00D67F" }; return m[role] ?? "#64748b"; }

function Calendar({ tahapanList }: { tahapanList: Tahapan[] }) {
  // "Hari ini" dibaca dari todayJakarta() (WIB), bukan new Date() lokal — server
  // SSR berjalan di UTC, jadi getter lokal biasa bisa salah hari saat dini hari WIB.
  const [tYear, tMonth, tDate] = todayJakarta().split("-").map(Number);
  const today = new Date(tYear, tMonth - 1, tDate);

  const ukkDateObjs = tahapanList
    .map((t) => { const d = new Date(t.tanggal); d.setHours(0,0,0,0); return d; })
    .sort((a, b) => a.getTime() - b.getTime());
  const ukkDateStrings = new Set(ukkDateObjs.map((d) => d.toDateString()));

  function getMondayOf(d: Date) {
    const day = d.getDay(); 
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0,0,0,0);
    return mon;
  }

  const initMonday = getMondayOf(ukkDateObjs[0] ?? today);
  const [weekStart, setWeekStart] = useState<Date>(initMonday);

  useEffect(() => {
    setWeekStart(getMondayOf(ukkDateObjs[0] ?? today));
  }, [tahapanList.length]); 

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const week: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthLabel = weekStart.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  const byDate: Record<string, Tahapan[]> = {};
  for (const t of tahapanList) {
    const key = new Date(t.tanggal).toDateString();
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(t);
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">{monthLabel}</span>
        <div className="flex gap-1">
          <button onClick={prevWeek}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <ChevronLeft size={13} />
          </button>
          <button onClick={nextWeek}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {week.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const isUkk   = ukkDateStrings.has(d.toDateString());
          const tasks   = byDate[d.toDateString()] ?? [];
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 relative group">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{dayNames[i]}</span>
              <div
                className="w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all cursor-default select-none"
                style={{
                  background: isUkk ? "#0082FB" : "transparent",
                  color:      isUkk ? "#fff" : isToday ? "#0082FB" : "inherit",
                  fontWeight: isUkk || isToday ? 700 : 400,
                }}>
                {d.getDate()}
              </div>
              {isUkk && tasks.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col gap-0.5 z-20 pointer-events-none">
                  {tasks.map((tk) => (
                    <div key={tk.id}
                      className="whitespace-nowrap text-[10px] font-semibold px-2.5 py-1 rounded-lg shadow-lg text-white"
                      style={{ background: "#0082FB" }}>
                      {tk.judul}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TahapanForm { hariKe: number; judul: string; tanggal: string; jamMulai: string; jamSelesai: string; lokasi: string; penguji: string; keterangan: string; }

const INPUT_CLS = "w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:border-[#0082FB] focus:ring-2 focus:ring-[#0082FB] dark:focus:ring-[#0064E0]/30 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500";

function TahapanModal({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (d: TahapanForm) => Promise<void>; initial?: Partial<TahapanForm>; }) {
  const [form, setForm] = useState<TahapanForm>({ hariKe: 1, judul: "", tanggal: "", jamMulai: "08:00", jamSelesai: "12:00", lokasi: "", penguji: "", keterangan: "", ...initial });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.judul;
  useEffect(() => { if (open) setForm({ hariKe: 1, judul: "", tanggal: "", jamMulai: "08:00", jamSelesai: "12:00", lokasi: "", penguji: "", keterangan: "", ...initial }); }, [open, initial]);
  function set(k: keyof TahapanForm, v: string | number) { setForm((p) => ({ ...p, [k]: v })); }
  async function submit(e: React.FormEvent) { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ scale: 0.93, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 24 }} transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "92vh" }}>

            <div className="relative flex items-center gap-4 overflow-hidden bg-[#0082FB] px-6 py-5">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none"/>
              <div className="absolute -bottom-6 right-20 w-28 h-28 rounded-full bg-white/7 pointer-events-none"/>
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-sm">
                <CalendarDays size={20} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">My Task</p>
                <h2 className="text-base font-extrabold text-white mt-0.5">{isEdit ? "Edit Task UKK" : "Tambah Task UKK"}</h2>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors shrink-0">
                <X size={16}/>
              </button>
            </div>

            <form onSubmit={submit} className="overflow-y-auto" style={{ maxHeight: "calc(92vh - 88px)" }}>
              <div className="px-6 py-5 space-y-5">

                <div className="grid grid-cols-[1fr_96px] gap-3">
                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 block">Judul Task</label>
                    <input required value={form.judul} onChange={(e) => set("judul", e.target.value)}
                      placeholder="mis. UKK Internal Hari 1"
                      className={INPUT_CLS}/>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 block">Hari Ke</label>
                    <input type="number" min={1} max={3} value={form.hariKe} onChange={(e) => set("hariKe", parseInt(e.target.value))}
                      className={INPUT_CLS + " text-center font-bold"}/>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-700/60"/></div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-bold tracking-widest text-slate-300 dark:text-slate-600 uppercase">Waktu & Tempat</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <CalendarDays size={11}/> Tanggal
                  </label>
                  <input required type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)}
                    className={INPUT_CLS}/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                      <Clock size={11}/> Jam Mulai
                    </label>
                    <input type="time" value={form.jamMulai} onChange={(e) => set("jamMulai", e.target.value)}
                      className={INPUT_CLS}/>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                      <Clock size={11}/> Jam Selesai
                    </label>
                    <input type="time" value={form.jamSelesai} onChange={(e) => set("jamSelesai", e.target.value)}
                      className={INPUT_CLS}/>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <MapPin size={11}/> Lokasi
                  </label>
                  <input required value={form.lokasi} onChange={(e) => set("lokasi", e.target.value)}
                    placeholder="mis. Lab Komputer 1"
                    className={INPUT_CLS}/>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-700/60"/></div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-bold tracking-widest text-slate-300 dark:text-slate-600 uppercase">Detail</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <User size={11}/> Penguji
                  </label>
                  <input value={form.penguji} onChange={(e) => set("penguji", e.target.value)}
                    placeholder="Nama penguji (opsional)"
                    className={INPUT_CLS}/>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2 block">Keterangan</label>
                  <textarea value={form.keterangan} onChange={(e) => set("keterangan", e.target.value)} rows={3}
                    placeholder="Catatan tambahan (opsional)..."
                    className={INPUT_CLS + " resize-none"}/>
                </div>
              </div>

              <div className="sticky bottom-0 px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/60 flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Batal
                </button>
                <motion.button type="submit" disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "#0082FB" }}>
                  {saving ? <><Loader2 size={14} className="animate-spin"/> Menyimpan...</> : <><Send size={13}/> {isEdit ? "Perbarui" : "Simpan Task"}</>}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TambahFileModal({ open, onClose, onUpload, tahapanList, title, warna, showTahapan }: {
  open: boolean; onClose: () => void; onUpload: (fd: FormData) => Promise<void>;
  tahapanList: Tahapan[]; title: string; warna: string; showTahapan?: boolean;
}) {
  const [judul, setJudul]           = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tahapanId, setTahapanId]   = useState("");
  const [file, setFile]             = useState<File | null>(null);
  const [saving, setSaving]         = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setJudul(""); setKeterangan(""); setFile(null); setTahapanId(tahapanList[0]?.id ?? ""); }
  }, [open, tahapanList]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const tid = showTahapan ? tahapanId : (tahapanList[0]?.id ?? "");
    // Untuk upload berkas umum (showTahapan=false / "Tambah Jadwal" & "Upload
    // Soal" dari kartu Kategori), tid boleh kosong — backend otomatis
    // membuatkan wadah hariKe:0 saat instalasi belum pernah punya berkas
    // umum sama sekali. Hanya alur task-spesifik (showTahapan=true) yang
    // wajib admin pilih tahapan-nya sendiri.
    if (!file || (showTahapan && !tid)) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("tahapanId", tid);
    fd.append("judul", judul);
    fd.append("deskripsi", keterangan);
    fd.append("file", file);
    await onUpload(fd);
    setSaving(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}>
          <motion.div initial={{scale:0.95,opacity:0,y:16}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:16}}
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e)=>e.stopPropagation()}>

            <div className="relative px-6 py-5 overflow-hidden" style={{background: warna, color: warna === "#C3F84A" ? "#1C2B33" : "#FFFFFF"}}>
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full pointer-events-none" style={{backgroundColor: warna === "#C3F84A" ? "#1C2B331A" : "#FFFFFF1A"}}/>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold">{title}</h2>
                <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80" style={{backgroundColor: warna === "#C3F84A" ? "#1C2B3326" : "#FFFFFF26"}}>
                  <X size={14}/>
                </button>
              </div>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {showTahapan && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Tahapan UKK</label>
                  <select required value={tahapanId} onChange={(e)=>setTahapanId(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none">
                    <option value="">Pilih tahapan...</option>
                    {tahapanList.map((t)=><option key={t.id} value={t.id}>{t.judul}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Judul</label>
                <input required value={judul} onChange={(e)=>setJudul(e.target.value)}
                  placeholder="Masukkan judul..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Keterangan</label>
                <textarea value={keterangan} onChange={(e)=>setKeterangan(e.target.value)} rows={3}
                  placeholder="Keterangan tambahan (opsional)..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-blue-400"/>
              </div>
              <div onClick={()=>fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e)=>setFile(e.target.files?.[0]??null)}/>
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={16} style={{color:PRIMARY}}/>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <CloudUpload size={26} className="mx-auto text-slate-300 mb-1.5"/>
                    <p className="text-sm text-slate-500">Klik untuk upload <span className="font-semibold">PDF</span></p>
                  </>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Batal
                </button>
                <button type="submit" disabled={saving || !file || (showTahapan ? !tahapanId : false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{background: warna, color: warna === "#C3F84A" ? "#1C2B33" : "#FFFFFF"}}>
                  {saving ? "Mengupload..." : "Upload"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UploadSoalModal({ open, onClose, onUpload, tahapanList }: { open: boolean; onClose: () => void; onUpload: (f: FormData) => Promise<void>; tahapanList: Tahapan[]; }) {
  const [tahapanId, setTahapanId] = useState("");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setTahapanId(""); setJudul(""); setDeskripsi(""); setFile(null); } }, [open]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !tahapanId) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("tahapanId", tahapanId); fd.append("judul", judul); fd.append("deskripsi", deskripsi); fd.append("file", file);
    await onUpload(fd);
    setSaving(false);
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Upload Soal</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X size={16} className="text-slate-500" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Tahapan UKK</label>
                <select required value={tahapanId} onChange={(e) => setTahapanId(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none">
                  <option value="">Pilih tahapan...</option>
                  {tahapanList.map((t) => <option key={t.id} value={t.id}>{t.judul}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Judul Soal</label>
                <input required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="mis. Soal Praktik UKK Internal"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Deskripsi (opsional)</label>
                <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none resize-none" />
              </div>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                <input ref={fileRef} type="file" accept=".pdf,.zip" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <FileText size={16} style={{ color: PRIMARY }} /><span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div><CloudUpload size={28} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-500">Klik untuk upload PDF/ZIP</p></div>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300">Batal</button>
                <button type="submit" disabled={saving || !file || !tahapanId}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: PRIMARY }}>
                  {saving ? "Mengupload..." : "Upload"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminJadwalSoalPage() {
  const [tahapanList, setTahapanList] = useState<Tahapan[]>([]);
  const [filePool,    setFilePool]    = useState<Tahapan | null>(null); 
  const [submisiList, setSubmisiList] = useState<Submisi[]>([]);
  const [loading, setLoading]         = useState(true);
  const [openTahapan, setOpenTahapan]               = useState(false);
  const [openSoal, setOpenSoal]                     = useState(false);
  const [openJadwalModal, setOpenJadwalModal]       = useState(false);
  const [openSoalModal, setOpenSoalModal]           = useState(false);
  const [openTambahJadwal, setOpenTambahJadwal]     = useState(false);
  const [openTambahSoal, setOpenTambahSoal]         = useState(false);
  const [editTarget, setEditTarget]                 = useState<Tahapan | null>(null);
  const [tab, setTab]                               = useState<"active"|"completed">("active");
  const [taskSearch, setTaskSearch]                 = useState("");
  const [submisiModalTahapan, setSubmisiModalTahapan] = useState<Tahapan | null>(null);
  const [soalJadwalIdx, setSoalJadwalIdx]           = useState(0);
  const [soalSoalIdx,   setSoalSoalIdx]             = useState(0);
  const [revisiTarget,  setRevisiTarget]            = useState<Submisi | null>(null);
  const [pesanRevisi,   setPesanRevisi]             = useState("");
  const toast = useToast();

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      fetch("/api/ujian-ukk/tahapan").then((r) => r.json()),
      fetch("/api/ujian-ukk/submisi").then((r) => r.json()),
    ]);
    const all: Tahapan[]  = Array.isArray(t) ? t : [];
    setFilePool(all.find(x => x.hariKe === 0) ?? null);       
    setTahapanList(all.filter(x => x.hariKe !== 0));           
    setSubmisiList(Array.isArray(s) ? s : []);
    setLoading(false);
    const nowCheck = new Date();
    const todayCheck = todayJakarta();
    const tasks = all.filter(x => x.hariKe !== 0);
    const hasActive = tasks.some((tk) => {
      const tglStr = tk.tanggal.slice(0, 10);
      if (tglStr > todayCheck) return true;
      if (tglStr < todayCheck) return false;
      const [h, m] = tk.jamSelesai.split(":").map(Number);
      const selesai = new Date(); selesai.setHours(h, m, 0, 0);
      return nowCheck < selesai;
    });
    if (!hasActive && tasks.length > 0) setTab("completed");
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveTahapan(data: TahapanForm) {
    const url  = editTarget ? `/api/ujian-ukk/tahapan/${editTarget.id}` : "/api/ujian-ukk/tahapan";
    const meth = editTarget ? "PUT" : "POST";
    const r = await fetch(url, { method: meth, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, hariKe: Number(data.hariKe) }) });
    if (r.ok) {
      toast.success(editTarget ? "Task diperbarui" : "Task ditambahkan", "");
      setOpenTahapan(false);
      setEditTarget(null);
      await loadAll();
      const tgl = data.tanggal;
      const todayS = todayJakarta();
      if (tgl > todayS) {
        setTab("active");
      } else if (tgl < todayS) {
        setTab("completed");
      } else {
        const [h, m] = data.jamSelesai.split(":").map(Number);
        const selesai = new Date(); selesai.setHours(h, m, 0, 0);
        setTab(new Date() < selesai ? "active" : "completed");
      }
    } else {
      const e = await r.json().catch(() => ({}));
      const msg = Array.isArray(e.message) ? e.message.join(", ") : (e.message ?? "Terjadi kesalahan");
      toast.error("Gagal menyimpan", msg);
    }
  }

  async function deleteTahapan(id: string) {
    if (!await toast.confirm("Hapus tahapan ini?", "Semua soal terkait juga akan dihapus.")) return;
    const r = await fetch(`/api/ujian-ukk/tahapan/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Task dihapus", ""); loadAll(); }
  }

  async function uploadSoal(fd: FormData) {
    const r = await fetch("/api/ujian-ukk/soal", { method: "POST", body: fd });
    if (r.ok) { toast.success("Soal berhasil diupload", ""); setOpenSoal(false); loadAll(); }
    else toast.error("Gagal upload", "");
  }

  async function deleteSoal(id: string) {
    if (!await toast.confirm("Hapus soal ini?", "Soal yang dihapus tidak dapat dikembalikan.")) return;
    const r = await fetch(`/api/ujian-ukk/soal/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Soal dihapus", ""); loadAll(); }
  }

  async function updateStatus(id: string, status: StatusSubmisi, pesan?: string) {
    const r = await fetch(`/api/ujian-ukk/submisi/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(pesan ? { pesanRevisi: pesan } : {}) }),
    });
    if (r.ok) { toast.success(status === "DITERIMA" ? "Project diterima!" : "Revisi dikirim ke siswa", ""); loadAll(); }
  }

  async function kirimRevisi() {
    if (!revisiTarget || !pesanRevisi.trim()) return;
    await updateStatus(revisiTarget.id, "REVISI", pesanRevisi.trim());
    setRevisiTarget(null);
    setPesanRevisi("");
  }

  const jadwalFiles = (filePool?.soal ?? []).filter(s => s.deskripsi?.startsWith("__jadwal__:"));
  const soalFiles   = (filePool?.soal ?? []).filter(s => !s.deskripsi?.startsWith("__jadwal__:"));
  const totalSoal   = soalFiles.length;
  const now       = new Date();
  const todayStr  = todayJakarta();
  const active    = tahapanList.filter((t) => {
    const tglStr = t.tanggal.slice(0, 10);
    if (tglStr > todayStr) return true;   
    if (tglStr < todayStr) return false;  
    const [h, m] = t.jamSelesai.split(":").map(Number);
    const selesai = new Date(); selesai.setHours(h, m, 0, 0);
    return now < selesai;                 
  });
  const completed = tahapanList.filter((t) => !active.includes(t));
  const shown     = (tab === "active" ? active : completed)
    .filter((t) => t.judul.toLowerCase().includes(taskSearch.trim().toLowerCase()));
  const terima    = submisiList.filter((s) => s.status === "DITERIMA").length;
  const revisi    = submisiList.filter((s) => s.status === "REVISI").length;
  const menunggu  = submisiList.filter((s) => s.status === "TERKIRIM").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row gap-6">

        <div className="flex-1 min-w-0 space-y-6">

          <div className="relative overflow-hidden rounded-2xl p-6"
            style={{ background: "#0082FB" }}>
            <div className="pointer-events-none absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10"/>
            <div className="pointer-events-none absolute -bottom-8 right-32 w-36 h-36 rounded-full bg-white/8"/>
            <div className="pointer-events-none absolute bottom-4 -left-6 w-24 h-24 rounded-full bg-white/6"/>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg">
                <FileText size={22} className="text-white sm:hidden"/>
                <FileText size={26} className="text-white hidden sm:block"/>
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Ujian Kompetensi Keahlian</span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">UKK</h1>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {openJadwalModal && (()=>{
              const allSoal = jadwalFiles;
              const curSoal = allSoal[soalJadwalIdx] ?? null;
              return (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e)=>{if(e.target===e.currentTarget)setOpenJadwalModal(false)}}>
                <motion.div initial={{scale:0.93,opacity:0,y:24}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.93,opacity:0,y:24}}
                  transition={{type:"spring",damping:26,stiffness:340}}
                  className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                  style={{maxHeight:"92vh"}}>

                  <div className="relative flex items-start gap-4 px-6 py-5 overflow-hidden shrink-0"
                    style={{background:"#0082FB"}}>
                    <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none"/>
                    <div className="absolute -bottom-6 right-24 w-24 h-24 rounded-full bg-white/8 pointer-events-none"/>
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-sm">
                      <CalendarDays size={22} className="text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white/95">Jadwal UKK</span>
                        {allSoal.length > 1 && <span className="text-[10px] text-white/60">{soalJadwalIdx+1} / {allSoal.length}</span>}
                      </div>
                      <h2 className="mt-1 text-lg font-extrabold text-white leading-snug line-clamp-2">
                        {curSoal ? curSoal.judul : "Jadwal UKK"}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-white/70">{curSoal?.fileName ?? (allSoal.length === 0 ? "Belum ada file jadwal" : `${allSoal.length} info UKK`)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {allSoal.length > 1 && (
                        <>
                          <button onClick={()=>setSoalJadwalIdx(i=>Math.max(0,i-1))} disabled={soalJadwalIdx===0}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40 transition-colors">
                            <ChevronLeft size={16}/>
                          </button>
                          <button onClick={()=>setSoalJadwalIdx(i=>Math.min(allSoal.length-1,i+1))} disabled={soalJadwalIdx===allSoal.length-1}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40 transition-colors">
                            <ChevronRight size={16}/>
                          </button>
                        </>
                      )}
                      {curSoal && (
                        <button onClick={async()=>{ await deleteSoal(curSoal.id); setSoalJadwalIdx(i=>Math.max(0,i-1)); }}
                          className="w-8 h-8 rounded-xl bg-red-500/70 flex items-center justify-center text-white hover:bg-red-500 transition-colors" title="Hapus jadwal ini">
                          <Trash2 size={14}/>
                        </button>
                      )}
                      <button onClick={()=>{ setOpenJadwalModal(false); setOpenTambahJadwal(true); }}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
                        <Plus size={13}/> Tambah
                      </button>
                      <button onClick={()=>setOpenJadwalModal(false)}
                        className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors">
                        <X size={16}/>
                      </button>
                    </div>
                  </div>

                  {curSoal ? (
                    <SoalPdfViewer soal={curSoal} onClose={()=>setOpenJadwalModal(false)}/>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:"#F1F5F8"}}>
                        <FileText size={30} className="text-[#0082FB]"/>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Belum ada file jadwal</p>
                        <p className="mt-1 text-sm text-slate-400">Klik "Tambah" untuk mengupload file jadwal PDF</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {openSoalModal && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e)=>{if(e.target===e.currentTarget)setOpenSoalModal(false)}}>
                <motion.div initial={{scale:0.93,opacity:0,y:24}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.93,opacity:0,y:24}}
                  transition={{type:"spring",damping:26,stiffness:340}}
                  className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                  style={{maxHeight:"92vh"}}>
                  {(()=>{
                    const allSoal = soalFiles;
                    const curSoal = allSoal[soalSoalIdx] ?? null;
                    return (
                      <>
                        <div className="relative flex items-start gap-4 px-6 py-5 overflow-hidden shrink-0"
                          style={{background:"#0082FB"}}>
                          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none"/>
                          <div className="absolute -bottom-6 right-24 w-24 h-24 rounded-full bg-white/8 pointer-events-none"/>
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-sm">
                            <FileText size={22} className="text-white"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white/95">Soal UKK</span>
                              {allSoal.length > 1 && <span className="text-[10px] text-white/60">{soalSoalIdx+1} / {allSoal.length}</span>}
                            </div>
                            <h2 className="mt-1 text-lg font-extrabold text-white leading-snug line-clamp-2">
                              {curSoal ? curSoal.judul : "Soal UKK"}
                            </h2>
                            <p className="mt-0.5 text-[11px] text-white/70">{curSoal?.fileName ?? `${totalSoal} soal tersedia`}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {allSoal.length > 1 && (
                              <>
                                <button onClick={()=>setSoalSoalIdx(i=>Math.max(0,i-1))} disabled={soalSoalIdx===0}
                                  className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40 transition-colors">
                                  <ChevronLeft size={16}/>
                                </button>
                                <button onClick={()=>setSoalSoalIdx(i=>Math.min(allSoal.length-1,i+1))} disabled={soalSoalIdx===allSoal.length-1}
                                  className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40 transition-colors">
                                  <ChevronRight size={16}/>
                                </button>
                              </>
                            )}
                            {curSoal && (
                              <button onClick={async()=>{ await deleteSoal(curSoal.id); setSoalSoalIdx(i=>Math.max(0,i-1)); }}
                                className="w-8 h-8 rounded-xl bg-red-500/70 flex items-center justify-center text-white hover:bg-red-500 transition-colors" title="Hapus soal ini">
                                <Trash2 size={14}/>
                              </button>
                            )}
                            <button onClick={()=>{ setOpenSoalModal(false); setOpenTambahSoal(true); }}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
                              <CloudUpload size={13}/> Tambah
                            </button>
                            <button onClick={()=>setOpenSoalModal(false)}
                              className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors">
                              <X size={16}/>
                            </button>
                          </div>
                        </div>

                        {curSoal ? (
                          <SoalPdfViewer soal={curSoal} onClose={()=>setOpenSoalModal(false)}/>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:"#F1F5F8"}}>
                              <FileText size={30} className="text-[#0082FB]"/>
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 dark:text-slate-200">Belum ada soal</p>
                              <p className="mt-1 text-sm text-slate-400">Klik "Tambah" untuk mengupload soal PDF</p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_2.3fr]">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800 lg:col-start-1 lg:row-start-1">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Kategori</p>
                <div className="flex flex-col gap-4">
              <button type="button" onClick={() => { setSoalJadwalIdx(0); setOpenJadwalModal(true); }}
                className="relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl px-5 py-5 text-left text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "#0082FB", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
                  <CalendarDays size={16} />
                </div>
                <div className="relative">
                  <p className="text-xl font-black leading-tight">Jadwal<span className="text-white/70"> UKK</span></p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/75">{jadwalFiles.length} file jadwal · TA 2026/2027</p>
                </div>
              </button>

              <button type="button" onClick={() => { setSoalSoalIdx(0); setOpenSoalModal(true); }}
                className="relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl px-5 py-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "#C3F84A", color: "#1C2B33", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#1C2B33]/10" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1C2B33]/15">
                  <FileText size={16} />
                </div>
                <div className="relative">
                  <p className="text-xl font-black leading-tight">Soal<span className="text-[#1C2B33]/70"> UKK</span></p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#1C2B33]/75">{totalSoal} soal diunggah · TA 2026/2027</p>
                </div>
              </button>
                </div>
              </div>

              <div className="flex flex-col gap-6">

          <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-5 pt-5 pb-0" style={{background:"rgba(0,130,251,0.05)"}}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:"#0082FB"}}>
                    <BookOpen size={14} className="text-white"/>
                  </div>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">My Task</p>
                </div>
                <button onClick={() => { setEditTarget(null); setOpenTahapan(true); }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white shadow-sm"
                  style={{background:"#0082FB"}}>
                  <Plus size={13} /> Tambah Task
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
                <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Cari nama task..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:focus:ring-blue-900/30" />
              </div>
              <div className="flex gap-6 border-b border-slate-100 dark:border-slate-700">
                <button onClick={() => setTab("active")}
                  className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="active" ? "border-blue-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                  style={tab==="active"?{color:"#0082FB"}:{}}>
                  Active Task
                  {tab==="active" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#0082FB"}}>{active.length}</span>}
                </button>
                <button onClick={() => setTab("completed")}
                  className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="completed" ? "border-emerald-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                  style={tab==="completed"?{color:"#00D67F"}:{}}>
                  Completed
                  {tab==="completed" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#00D67F"}}>{completed.length}</span>}
                </button>
              </div>
            </div>

            <div className="max-h-[330px] overflow-auto">
              {loading && <div className="px-5 py-10 text-center text-sm text-slate-400">Memuat data...</div>}
              {!loading && shown.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <CalendarDays size={32} className="mx-auto mb-3 text-slate-200"/>
                  <p className="text-sm text-slate-400">{taskSearch.trim() ? `Tidak ada task dengan nama "${taskSearch.trim()}"` : tab==="active" ? "Tidak ada task aktif" : "Tidak ada task selesai"}</p>
                </div>
              )}
              {!loading && shown.length > 0 && (
                <table className="w-full min-w-170 text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 backdrop-blur dark:border-slate-700/40 dark:bg-slate-700/60">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Task</th>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tanggal</th>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Waktu</th>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Lokasi</th>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Terkumpul</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((t, idx) => {
                      const rp  = rowPalette(idx);
                      const sudahKumpul = submisiList.length;
                      const pct = Math.min(Math.round((sudahKumpul / Math.max(submisiList.length || 12, 1)) * 100), 100);
                      return (
                        <tr key={t.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm" style={{background:rp.gradient}}>
                                <span className="text-xs font-bold" style={{color: rp.gradient === "#C3F84A" ? "#1C2B33" : "#FFFFFF"}}>{idx+1}</span>
                              </div>
                              <p className="max-w-[160px] truncate text-sm font-bold text-slate-800 dark:text-slate-100">{t.judul}</p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatTgl(t.tanggal)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{t.jamMulai}–{t.jamSelesai}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{t.lokasi}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div className="h-full rounded-full" style={{width:`${pct}%`, background:rp.gradient}}/>
                              </div>
                              <span className="text-xs font-bold" style={{color:rp.bar}}>{pct}%</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setSubmisiModalTahapan(t)}
                                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all"
                                style={{borderColor:rp.bar, color:rp.bar, backgroundColor:rp.bg}}>
                                <BookOpen size={11}/>
                                Lihat
                                {sudahKumpul > 0 && (
                                  <span className="rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-white" style={{backgroundColor:rp.bar}}>{sudahKumpul}</span>
                                )}
                              </button>
                              <button onClick={() => { setEditTarget(t); setOpenTahapan(true); }}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                                <Pencil size={12}/>
                              </button>
                              <button onClick={() => deleteTahapan(t.id)}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          </div>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {submisiModalTahapan && (() => {
          const sm = submisiModalTahapan;
          const rows = submisiList;
          const cntDiterima = rows.filter(s => s.status === "DITERIMA").length;
          const cntRevisi   = rows.filter(s => s.status === "REVISI").length;
          const cntMenunggu = rows.filter(s => s.status === "TERKIRIM").length;
          return (
            <motion.div key="submisi-modal-overlay"
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setSubmisiModalTahapan(null); }}>
              <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                <div className="relative p-6 shrink-0"
                  style={{background:"#0082FB"}}>
                  <div className="pointer-events-none absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10"/>
                  <button onClick={() => setSubmisiModalTahapan(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                    <X size={16} className="text-white"/>
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-white"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Rekap Pengumpulan</p>
                      <h3 className="text-lg font-extrabold text-white">{sm.judul}</h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-semibold text-white">
                      <MapPin size={10}/>{sm.lokasi}
                    </span>
                    {sm.penguji && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-semibold text-white">
                        <User size={10}/>{sm.penguji}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-semibold text-white">
                      <CalendarDays size={10}/>{formatTgl(sm.tanggal)}
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-xs font-semibold text-white">
                      <Clock size={10}/>{sm.jamMulai}–{sm.jamSelesai}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 shrink-0 border-b border-slate-100 dark:border-slate-700">
                  {[
                    { label: "Total",    val: rows.length,   color: "#0082FB" },
                    { label: "Diterima", val: cntDiterima,   color: "#00D67F" },
                    { label: "Revisi",   val: cntRevisi,     color: "#C3F84A" },
                    { label: "Menunggu", val: cntMenunggu,   color: "#0082FB" },
                  ].map((st, i) => (
                    <div key={i} className="p-4 text-center border-r last:border-r-0 border-slate-100 dark:border-slate-700">
                      <p className="text-2xl font-extrabold" style={{color:st.color}}>{st.val}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{st.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/30">
                  {rows.length === 0 ? (
                    <div className="py-16 text-center">
                      <AlertCircle size={36} className="mx-auto mb-3 text-slate-200"/>
                      <p className="text-sm font-semibold text-slate-400">Belum ada siswa yang mengumpulkan</p>
                      <p className="text-xs text-slate-300 mt-1">Siswa harus mengirimkan link Google Drive</p>
                    </div>
                  ) : rows.map((s) => {
                    const sc    = statusBadge(s.status);
                    const nama  = s.siswa?.user?.nama || s.siswa?.nama || "Siswa";
                    const isDone = s.status === "DITERIMA";
                    return (
                      <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{backgroundColor: isDone ? "#00D67F" : sc.text}}>
                          {nama[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{nama}</p>
                          <p className="text-xs text-slate-400 truncate">{s.soal?.judul ?? "—"} · {formatTgl(s.submittedAt)}</p>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0"
                          style={{backgroundColor: sc.bg, color: sc.text}}>
                          {isDone ? "✓ UKK Selesai" : s.status === "REVISI" ? "⚠ Perlu Revisi" : "⏳ Menunggu Review"}
                        </span>
                        <a href={s.fileUrl.startsWith("http") ? s.fileUrl : `http://localhost:3001${s.fileUrl}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0"
                          style={{color:"#0082FB", backgroundColor:"#EAF3FF"}}>
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0">
                            <path d="M6.18 15L3.12 9.72 9.24 0h5.51L8.63 9.72 6.18 15zm5.82 0H7.76l2.45-4.28h7.13L14.89 15h-2.89zM12 7.5l2.89-5h2.89L21 7.5h-5.78L12 7.5zM20.88 15l-2.45-4.28h2.01L24 15h-3.12z"/>
                          </svg>
                          GDrive
                        </a>
                        {isDone ? (
                          <span className="text-xs font-bold text-emerald-500 shrink-0">Selesai ✓</span>
                        ) : (
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => updateStatus(s.id, "DITERIMA")}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white shadow-sm transition-transform hover:scale-105"
                              style={{background:"#00D67F"}}>
                              <CheckCircle size={12}/> Terima
                            </button>
                            <button onClick={() => { setRevisiTarget(s); setPesanRevisi(""); }}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-transform hover:scale-105"
                              style={{background:"#C3F84A", color:"#1C2B33"}}>
                              <AlertCircle size={12}/> Revisi
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 py-4 shrink-0 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="font-semibold text-[#C3F84A]">Revisi</span> → siswa kirim ulang, dokumen lama tergantikan ·{" "}
                    <span className="font-semibold text-emerald-500">Terima</span> → UKK selesai
                  </p>
                  <button onClick={() => setSubmisiModalTahapan(null)}
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 shrink-0 transition-colors">
                    Tutup
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <TahapanModal open={openTahapan} onClose={() => { setOpenTahapan(false); setEditTarget(null); }} onSave={saveTahapan}
        initial={editTarget ? { hariKe: editTarget.hariKe, judul: editTarget.judul, tanggal: editTarget.tanggal.slice(0, 10), jamMulai: editTarget.jamMulai, jamSelesai: editTarget.jamSelesai, lokasi: editTarget.lokasi, penguji: editTarget.penguji ?? "", keterangan: editTarget.keterangan ?? "" } : undefined} />
      <UploadSoalModal open={openSoal} onClose={() => setOpenSoal(false)} onUpload={uploadSoal} tahapanList={tahapanList} />

      <TambahFileModal
        open={openTambahJadwal}
        onClose={() => { setOpenTambahJadwal(false); setOpenJadwalModal(true); }}
        onUpload={async (fd) => {
          const desc = (fd.get("deskripsi") as string) || "";
          fd.set("deskripsi", "__jadwal__:" + desc);
          await uploadSoal(fd);
          setOpenTambahJadwal(false);
          setOpenJadwalModal(true);
        }}
        tahapanList={filePool ? [filePool] : []}
        title="Tambah Jadwal"
        warna="#0082FB"
        showTahapan={false}
      />

      <TambahFileModal
        open={openTambahSoal}
        onClose={() => { setOpenTambahSoal(false); setOpenSoalModal(true); }}
        onUpload={async (fd) => {
          await uploadSoal(fd);
          setOpenTambahSoal(false);
          setOpenSoalModal(true);
        }}
        tahapanList={filePool ? [filePool] : []}
        title="Upload Soal"
        warna="#0082FB"
        showTahapan={false}
      />

      <AnimatePresence>
        {revisiTarget && (
          <motion.div key="revisi-overlay"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e)=>{if(e.target===e.currentTarget){setRevisiTarget(null);setPesanRevisi("");}}}>
            <motion.div initial={{scale:0.95,opacity:0,y:12}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:12}}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e)=>e.stopPropagation()}>

              <div className="relative px-6 py-5 overflow-hidden"
                style={{background:"#C3F84A", color:"#1C2B33"}}>
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#1C2B33]/10 pointer-events-none"/>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1C2B33]/15 flex items-center justify-center shrink-0">
                    <AlertCircle size={18} className="text-[#1C2B33]"/>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-[#1C2B33]/70 uppercase">Kirim Revisi</p>
                    <h3 className="text-base font-extrabold text-[#1C2B33] leading-snug">{revisiTarget.siswa?.nama ?? revisiTarget.siswa?.user?.nama}</h3>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#F1F5F8] dark:bg-[#C3F84A]/10 border border-[#F1F5F8] dark:border-[#C3F84A]/20">
                  <AlertCircle size={15} className="text-[#C3F84A] mt-0.5 shrink-0"/>
                  <p className="text-xs text-[#1C2B33] dark:text-[#C3F84A] leading-relaxed">
                    Siswa akan menerima notifikasi revisi dan <strong>wajib mengirim ulang</strong> project mereka.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                    Pesan Revisi <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={pesanRevisi}
                    onChange={(e)=>setPesanRevisi(e.target.value)}
                    rows={4}
                    placeholder="Tuliskan catatan revisi untuk siswa, misalnya: &quot;Tampilan UI belum responsif, perbaiki layout mobile dan tambahkan validasi form login.&quot;"
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-[#C3F84A] placeholder:text-slate-400"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{pesanRevisi.length} karakter</p>
                </div>
              </div>

              <div className="px-6 pb-5 flex gap-3">
                <button onClick={()=>{setRevisiTarget(null);setPesanRevisi("");}}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button onClick={kirimRevisi} disabled={!pesanRevisi.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:brightness-110"
                  style={{background:"#C3F84A", color:"#1C2B33"}}>
                  <span className="flex items-center justify-center gap-2">
                    <AlertCircle size={14}/> Kirim Revisi
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
