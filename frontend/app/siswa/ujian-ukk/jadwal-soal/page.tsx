"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  CalendarDays, FileText, Send, BookOpen, Loader2,
  ChevronLeft, ChevronRight, X, Search,
  MapPin, Clock, User, CheckCircle, AlertCircle, Link2, ExternalLink, PieChart,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { todayJakarta } from "@/components/absensi-harian/shared";

const SoalPdfViewer = dynamic(() => import("./SoalPdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center py-20">
      <Loader2 size={28} className="animate-spin text-[#C3F84A]" />
    </div>
  ),
});

interface Soal { id: string; judul: string; deskripsi?: string; fileUrl: string; fileName: string; }
interface Tahapan { id: string; hariKe: number; judul: string; tanggal: string; jamMulai: string; jamSelesai: string; lokasi: string; penguji?: string; keterangan?: string; soal: Soal[]; }
interface MySubmisi { id: string; fileUrl: string; fileName: string; catatan?: string; pesanRevisi?: string; status: "TERKIRIM"|"DITERIMA"|"REVISI"; submittedAt: string; soal: { id: string; judul: string }; }

function formatTgl(s: string) { return new Date(s).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric", timeZone: "Asia/Jakarta" }); }

function statusInfo(s: "TERKIRIM"|"DITERIMA"|"REVISI") {
  if (s === "DITERIMA") return { bg:"#E3FBF0", color:"#00D67F", label:"Diterima",      icon: <CheckCircle size={10}/> };
  if (s === "REVISI")   return { bg:"#F1F5F8", color:"#8A9E1F", label:"Perlu Revisi",  icon: <AlertCircle size={10}/> };
  return                       { bg:"#EAF3FF", color:"#0082FB", label:"Menunggu Review", icon: <Clock size={10}/> };
}

const ROW_PALETTES = [
  { bg:"#EAF3FF", text:"#0082FB",  bar:"#0082FB",  gradient:"#0082FB" },
  { bg:"#E3FBF0", text:"#00D67F",  bar:"#00D67F",  gradient:"#00D67F" },
  { bg:"#FEE9EA", text:"#EF4444",  bar:"#EF4444",  gradient:"#EF4444" },
  { bg:"#F1F5F8", text:"#8A9E1F",  bar:"#8A9E1F",  gradient:"#C3F84A" }, // lime — text/bar gelap supaya kontras
  { bg:"#EAF3FF", text:"#0064E0",  bar:"#0064E0",  gradient:"#0082FB" },
];
function rowPalette(i: number) { return ROW_PALETTES[i % ROW_PALETTES.length]; }


function isValidDriveUrl(url: string) {
  return url.startsWith("https://drive.google.com/") || url.startsWith("https://docs.google.com/");
}

function SubmitModal({ open, onClose, soal, onSubmit }: {
  open: boolean; onClose: () => void; soal: Soal | null; onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [driveUrl, setDriveUrl] = useState("");
  const [catatan, setCatatan]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [urlError, setUrlError] = useState("");
  useEffect(() => { if (open) { setDriveUrl(""); setCatatan(""); setUrlError(""); } }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!soal) return;
    if (!driveUrl.trim()) { setUrlError("Link Google Drive wajib diisi"); return; }
    if (!isValidDriveUrl(driveUrl.trim())) { setUrlError("Link harus dari Google Drive (drive.google.com atau docs.google.com)"); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append("soalId", soal.id);
    fd.append("driveUrl", driveUrl.trim());
    if (catatan.trim()) fd.append("catatan", catatan.trim());
    await onSubmit(fd);
    setSaving(false);
  }
  if (!soal) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}>
          <motion.div initial={{scale:0.95,opacity:0,y:16}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:16}}
            transition={{type:"spring",damping:26,stiffness:340}}
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e=>e.stopPropagation()}>
            <div className="relative px-6 py-5 overflow-hidden"
              style={{background:"#00D67F"}}>
              <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10"/>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Link2 size={18} className="text-white"/>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Kirim Project</p>
                    <p className="text-base font-extrabold text-white leading-tight line-clamp-1">{soal.judul}</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                  <X size={15}/>
                </button>
              </div>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"#0082FB"}}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M6.18 15L3.12 9.72 9.24 0h5.51L8.63 9.72 6.18 15zm5.82 0H7.76l2.45-4.28h7.13L14.89 15h-2.89zM12 7.5l2.89-5h2.89L21 7.5h-5.78L12 7.5zM20.88 15l-2.45-4.28h2.01L24 15h-3.12z"/></svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Pastikan file sudah dishare</p>
                  <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">Set sharing Google Drive ke "Anyone with the link can view" sebelum kirim link.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 block">
                  Link Google Drive <span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-colors ${urlError ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus-within:border-emerald-400"}`}>
                  <Link2 size={15} className="text-slate-400 shrink-0"/>
                  <input
                    type="url"
                    value={driveUrl}
                    onChange={e=>{ setDriveUrl(e.target.value); setUrlError(""); }}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 text-sm bg-transparent text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
                  />
                  {driveUrl && isValidDriveUrl(driveUrl) && (
                    <CheckCircle size={15} className="text-emerald-500 shrink-0"/>
                  )}
                </div>
                {urlError && <p className="mt-1 text-[11px] text-red-500">{urlError}</p>}
              </div>

              {driveUrl && isValidDriveUrl(driveUrl) && (
                <a href={driveUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  <ExternalLink size={12}/> Cek link (buka di tab baru)
                </a>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Catatan (opsional)</label>
                <textarea value={catatan} onChange={e=>setCatatan(e.target.value)} rows={2}
                  placeholder="Tambahkan keterangan jika diperlukan..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 outline-none resize-none focus:border-emerald-400 placeholder:text-slate-400"/>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Batal
                </button>
                <button type="submit" disabled={saving || !driveUrl.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{background:"#00D67F"}}>
                  {saving ? <><Loader2 size={14} className="animate-spin"/> Mengirim...</> : <><Send size={14}/> Kirim Project</>}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


export default function SiswaJadwalSoalPage() {
  const [tahapanList, setTahapanList] = useState<Tahapan[]>([]); 
  const [filePool,    setFilePool]    = useState<Tahapan | null>(null); 
  const [mySubmisi,   setMySubmisi]   = useState<MySubmisi[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,          setTab]         = useState<"active"|"completed"|"all">("all");
  const [taskSearch,   setTaskSearch]  = useState("");
  const [submitSoal,   setSubmitSoal]  = useState<Soal | null>(null);
  const [detailTarget, setDetailTarget] = useState<MySubmisi | null>(null);
  const [revisiModal,  setRevisiModal]  = useState<MySubmisi | null>(null);
  const [openJadwalModal, setOpenJadwalModal] = useState(false);
  const [openSoalModal,   setOpenSoalModal]   = useState(false);
  const [soalJadwalIdx,   setSoalJadwalIdx]   = useState(0);
  const [soalSoalIdx,     setSoalSoalIdx]     = useState(0);
  const toast = useToast();

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      fetch("/api/ujian-ukk/tahapan").then(r => r.json()).catch(() => []),
      fetch("/api/ujian-ukk/submisi/saya").then(r => r.json()).catch(() => []),
    ]);
    const all: Tahapan[]  = Array.isArray(t) ? t : [];
    setFilePool(all.find(x => x.hariKe === 0) ?? null);
    const tasks = all.filter(x => x.hariKe !== 0);
    setTahapanList(tasks.length > 0 ? [tasks[0]] : []);
    setMySubmisi(Array.isArray(s) ? s : []);
    setLoading(false);
    const nowCheck = new Date();
    const todayCheck = todayJakarta();
    const hasActive = tasks.some(tk => {
      const tglStr = tk.tanggal?.slice(0, 10) ?? "";
      if (tglStr > todayCheck) return true;
      if (tglStr < todayCheck) return false;
      const [h, m] = (tk.jamSelesai ?? "23:59").split(":").map(Number);
      const selesai = new Date(); selesai.setHours(h, m, 0, 0);
      return nowCheck < selesai;
    });
    if (!hasActive && tasks.length > 0) setTab("completed");
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  async function doSubmit(fd: FormData) {
    const r = await fetch("/api/ujian-ukk/submisi", { method:"POST", body: fd });
    if (r.ok) { toast.success("Project berhasil dikirim!", "Guru akan mereview pengirimanmu."); setSubmitSoal(null); loadAll(); }
    else toast.error("Gagal mengirim", "Coba lagi");
  }

  const now      = new Date();
  const todayStr = todayJakarta();
  const active   = tahapanList.filter(t => {
    const tglStr = t.tanggal?.slice(0,10) ?? "";
    if (tglStr > todayStr) return true;
    if (tglStr < todayStr) return false;
    const [h,m] = (t.jamSelesai ?? "23:59").split(":").map(Number);
    const selesai = new Date(); selesai.setHours(h,m,0,0);
    return now < selesai;
  });
  const completed  = tahapanList.filter(t => !active.includes(t));
  const shown      = (tab === "all" ? tahapanList : tab === "active" ? active : completed)
    .filter((t) => t.judul.toLowerCase().includes(taskSearch.trim().toLowerCase()));
  const jadwalFiles = (filePool?.soal ?? []).filter(s => s.deskripsi?.startsWith("__jadwal__:"));
  const soalFiles   = (filePool?.soal ?? []).filter(s => !s.deskripsi?.startsWith("__jadwal__:"));
  const totalSoal   = soalFiles.length;
  const submisiMap = new Map(mySubmisi.filter(s=>s.soal?.id).map(s=>[s.soal.id, s]));
  const diterima   = mySubmisi.filter(s=>s.status==="DITERIMA").length;
  const revisiCnt  = mySubmisi.filter(s=>s.status==="REVISI").length;
  const menungguCnt = mySubmisi.filter(s=>s.status==="TERKIRIM").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row gap-6">

        <div className="flex-1 min-w-0 space-y-6">

          <div className="relative overflow-hidden rounded-2xl p-6"
            style={{background:"#0082FB"}}>
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
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">Jadwal dan Soal</h1>
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
                  onClick={e=>{if(e.target===e.currentTarget)setOpenJadwalModal(false)}}>
                  <motion.div initial={{scale:0.93,opacity:0,y:24}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.93,opacity:0,y:24}}
                    transition={{type:"spring",damping:26,stiffness:340}}
                    className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    style={{maxHeight:"92vh"}}>
                    <div className="relative flex items-start gap-4 px-6 py-5 overflow-hidden shrink-0"
                      style={{background:"#0082FB"}}>
                      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none"/>
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white/95">Jadwal UKK</span>
                        <h2 className="mt-1 text-lg font-extrabold text-white leading-snug line-clamp-2">
                          {curSoal ? curSoal.judul : "Jadwal UKK"}
                        </h2>
                        <p className="mt-0.5 text-[11px] text-white/70">{curSoal?.fileName ?? (allSoal.length===0 ? "Belum ada file jadwal" : `${allSoal.length} info UKK`)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {allSoal.length > 1 && (<>
                          <button onClick={()=>setSoalJadwalIdx(i=>Math.max(0,i-1))} disabled={soalJadwalIdx===0}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40"><ChevronLeft size={16}/></button>
                          <button onClick={()=>setSoalJadwalIdx(i=>Math.min(allSoal.length-1,i+1))} disabled={soalJadwalIdx===allSoal.length-1}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40"><ChevronRight size={16}/></button>
                        </>)}
                        <button onClick={()=>setOpenJadwalModal(false)}
                          className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30"><X size={16}/></button>
                      </div>
                    </div>
                    {curSoal ? <SoalPdfViewer soal={curSoal} onClose={()=>setOpenJadwalModal(false)}/> : (
                      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <FileText size={30} className="text-[#C3F84A]"/>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Belum ada file jadwal</p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {openSoalModal && (()=>{
              const allSoal = soalFiles;
              const curSoal = allSoal[soalSoalIdx] ?? null;
              return (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                  onClick={e=>{if(e.target===e.currentTarget)setOpenSoalModal(false)}}>
                  <motion.div initial={{scale:0.93,opacity:0,y:24}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.93,opacity:0,y:24}}
                    transition={{type:"spring",damping:26,stiffness:340}}
                    className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    style={{maxHeight:"92vh"}}>
                    <div className="relative flex items-start gap-4 px-6 py-5 overflow-hidden shrink-0"
                      style={{background:"#0082FB"}}>
                      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none"/>
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <FileText size={22} className="text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="rounded-lg bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white/95">Soal UKK</span>
                        <h2 className="mt-1 text-lg font-extrabold text-white leading-snug line-clamp-2">
                          {curSoal ? curSoal.judul : "Soal UKK"}
                        </h2>
                        <p className="mt-0.5 text-[11px] text-white/70">{curSoal?.fileName ?? `${totalSoal} soal tersedia`}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {allSoal.length > 1 && (<>
                          <button onClick={()=>setSoalSoalIdx(i=>Math.max(0,i-1))} disabled={soalSoalIdx===0}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40"><ChevronLeft size={16}/></button>
                          <button onClick={()=>setSoalSoalIdx(i=>Math.min(allSoal.length-1,i+1))} disabled={soalSoalIdx===allSoal.length-1}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40"><ChevronRight size={16}/></button>
                        </>)}
                        <button onClick={()=>setOpenSoalModal(false)}
                          className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30"><X size={16}/></button>
                      </div>
                    </div>
                    {curSoal ? <SoalPdfViewer soal={curSoal} onClose={()=>setOpenSoalModal(false)}/> : (
                      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        <FileText size={30} className="text-[#0082FB]"/>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Belum ada soal</p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <div className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_2.3fr]">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800 lg:col-start-1 lg:row-start-1">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Kategori</p>
                <div className="flex flex-col gap-4">
              <button type="button" onClick={()=>{ setSoalJadwalIdx(0); setOpenJadwalModal(true); }}
                className="relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl px-5 py-5 text-left text-white transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "#0082FB", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-4 right-12 h-20 w-20 rounded-full bg-white/8" />

                <div className="relative flex items-start justify-between">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/20">
                    <CalendarDays size={15} />
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/60">Kategori</p>
                    <p className="text-lg font-black leading-tight">Jadwal<span className="text-white/70"> UKK</span></p>
                  </div>
                </div>

                <div className="relative flex items-baseline gap-2">
                  <span className="text-5xl font-black leading-none tabular-nums">{jadwalFiles.length}</span>
                  <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-white/70">file<br />jadwal</span>
                </div>


                <div className="relative flex items-end justify-between pt-2">
                  <div>
                    <p className="text-[8px] font-medium uppercase tracking-wider text-white/60">TA</p>
                    <p className="text-base font-black leading-none">2026/2027</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-medium uppercase tracking-wider text-white/60">Status</p>
                    <p className="text-[10px] font-semibold">Aktif</p>
                  </div>
                </div>
              </button>

              <button type="button" onClick={()=>{ setSoalSoalIdx(0); setOpenSoalModal(true); }}
                className="relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl px-5 py-5 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "#C3F84A", color: "#1C2B33", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#1C2B33]/10" />
                <div className="pointer-events-none absolute -bottom-4 right-12 h-20 w-20 rounded-full bg-[#1C2B33]/8" />

                <div className="relative flex items-start justify-between">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#1C2B33]/15">
                    <FileText size={15} />
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#1C2B33]/60">Kategori</p>
                    <p className="text-lg font-black leading-tight">Soal<span className="text-[#1C2B33]/70"> UKK</span></p>
                  </div>
                </div>

                <div className="relative flex items-baseline gap-2">
                  <span className="text-5xl font-black leading-none tabular-nums">{totalSoal}</span>
                  <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-[#1C2B33]/70">soal<br />tersedia</span>
                </div>


                <div className="relative flex items-end justify-between pt-2">
                  <div>
                    <p className="text-[8px] font-medium uppercase tracking-wider text-[#1C2B33]/60">TA</p>
                    <p className="text-base font-black leading-none">2026/2027</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-medium uppercase tracking-wider text-[#1C2B33]/60">Status</p>
                    <p className="text-[10px] font-semibold">{diterima > 0 ? "Diterima" : "Berjalan"}</p>
                  </div>
                </div>
              </button>
                </div>
              </div>

              <div className="flex flex-col gap-6">

          <div className="flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="px-5 pt-5 pb-0" style={{background:"rgba(0,130,251,0.05)"}}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:"#0082FB"}}>
                    <BookOpen size={14} className="text-white"/>
                  </div>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">My Task</p>
                </div>
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
                  <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Cari nama task..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:focus:ring-blue-900/30" />
                </div>
                <div className="flex gap-5 border-b border-slate-100 dark:border-slate-700">
                  <button onClick={()=>setTab("all")}
                    className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="all"?"border-slate-500":"text-slate-400 border-transparent hover:text-slate-600"}`}
                    style={tab==="all"?{color:"#64748B"}:{}}>
                    Semua
                    {tab==="all" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#64748B"}}>{tahapanList.length}</span>}
                  </button>
                  <button onClick={()=>setTab("active")}
                    className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="active"?"border-blue-500":"text-slate-400 border-transparent hover:text-slate-600"}`}
                    style={tab==="active"?{color:"#0082FB"}:{}}>
                    Active Task
                    {tab==="active" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#0082FB"}}>{active.length}</span>}
                  </button>
                  <button onClick={()=>setTab("completed")}
                    className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="completed"?"border-emerald-500":"text-slate-400 border-transparent hover:text-slate-600"}`}
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
                    <p className="text-sm text-slate-400">{taskSearch.trim() ? `Tidak ada task dengan nama "${taskSearch.trim()}"` : tab==="active" ? "Tidak ada task aktif" : tab==="completed" ? "Tidak ada task selesai" : "Belum ada task tersedia"}</p>
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
                        <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Progress</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((t, idx) => {
                        const rp        = rowPalette(idx);
                        const globalSoal = soalFiles[0] ?? null;
                        const myS       = globalSoal ? submisiMap.get(globalSoal.id) : undefined;
                        const isDiterima = myS?.status === "DITERIMA";
                        const isRevisi   = myS?.status === "REVISI";
                        const isTerkirim = myS?.status === "TERKIRIM";
                        const pct        = myS ? 100 : 0;

                        const btn = isDiterima
                          ? { label:"Diterima", icon:<CheckCircle size={11}/>, bg:"#E3FBF0", clr:"#00D67F", border:"#00D67F", onClick:()=>setDetailTarget(myS!) }
                          : isRevisi
                          ? { label:"Revisi", icon:<AlertCircle size={11}/>, bg:"#F1F5F8", clr:"#8A9E1F", border:"#8A9E1F", onClick:()=>setRevisiModal(myS!) }
                          : isTerkirim
                          ? { label:"Terkirim", icon:<CheckCircle size={11}/>, bg:"#EAF3FF", clr:"#0082FB", border:"#0082FB", onClick:()=>setDetailTarget(myS!) }
                          : { label:"Kirim", icon:<Send size={11}/>, bg:"#E3FBF0", clr:"#00D67F", border:"#00D67F", onClick:()=>globalSoal && setSubmitSoal(globalSoal) };

                        return (
                          <tr key={t.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm" style={{background: rp.gradient}}>
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
                                  <div className="h-full rounded-full" style={{width:`${pct}%`, background: isDiterima?"#00D67F":isRevisi?"#C3F84A":rp.gradient}}/>
                                </div>
                                <span className="text-xs font-bold" style={{color: isDiterima?"#00D67F":isRevisi?"#8A9E1F":rp.bar}}>{pct}%</span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <button onClick={btn.onClick}
                                className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-95"
                                style={{borderColor:btn.border, color:btn.clr, backgroundColor:btn.bg}}>
                                {btn.icon}{btn.label}
                              </button>
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

      <SubmitModal open={!!submitSoal} onClose={()=>setSubmitSoal(null)} soal={submitSoal} onSubmit={doSubmit}/>

      <AnimatePresence>
        {detailTarget && (
          <motion.div key="detail-overlay"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={()=>setDetailTarget(null)}>
            <motion.div initial={{scale:0.95,opacity:0,y:16}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:16}}
              transition={{type:"spring",damping:26,stiffness:340}}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={e=>e.stopPropagation()}>
              <div className="relative px-6 py-5 overflow-hidden"
                style={{background: detailTarget.status==="DITERIMA" ? "#00D67F" : "#0082FB"}}>
                <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10"/>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <CheckCircle size={18} className="text-white"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                        {detailTarget.status==="DITERIMA" ? "Project Diterima ✓" : "Project Terkirim"}
                      </p>
                      <p className="text-base font-extrabold text-white leading-tight">{detailTarget.soal?.judul}</p>
                    </div>
                  </div>
                  <button onClick={()=>setDetailTarget(null)} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
                    <X size={15}/>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {detailTarget.status==="DITERIMA" && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <CheckCircle size={18} className="text-emerald-500 shrink-0"/>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Project kamu telah diterima! UKK selesai.</p>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{backgroundColor: detailTarget.status==="DITERIMA"?"#E3FBF0":"#EAF3FF",
                              color: detailTarget.status==="DITERIMA"?"#00D67F":"#0082FB"}}>
                      {detailTarget.status==="DITERIMA" ? "Diterima" : "Menunggu Review"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500">Dikirim pada</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {new Date(detailTarget.submittedAt).toLocaleString("id-ID",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"})} WIB
                    </span>
                  </div>
                  {detailTarget.catatan && (
                    <div className="py-2 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Catatan kamu</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{detailTarget.catatan}</p>
                    </div>
                  )}
                </div>
                <a href={detailTarget.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{background:"#0082FB"}}>
                  <ExternalLink size={14}/> Buka Google Drive
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revisiModal && (
          <motion.div key="revisi-siswa-overlay"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={()=>setRevisiModal(null)}>
            <motion.div initial={{scale:0.95,opacity:0,y:16}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:16}}
              transition={{type:"spring",damping:26,stiffness:340}}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={e=>e.stopPropagation()}>
              <div className="relative px-6 py-5 overflow-hidden"
                style={{background:"#C3F84A", color:"#1C2B33"}}>
                <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#1C2B33]/10"/>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1C2B33]/15 flex items-center justify-center">
                      <AlertCircle size={18} className="text-[#1C2B33]"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#1C2B33]/70 uppercase tracking-widest">Perlu Revisi</p>
                      <p className="text-base font-extrabold text-[#1C2B33] leading-tight">{revisiModal.soal?.judul}</p>
                    </div>
                  </div>
                  <button onClick={()=>setRevisiModal(null)} className="w-8 h-8 rounded-xl bg-[#1C2B33]/15 flex items-center justify-center text-[#1C2B33] hover:bg-[#1C2B33]/25">
                    <X size={15}/>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-xl border border-[#F1F5F8] dark:border-[#C3F84A]/30 bg-[#F1F5F8] dark:bg-[#C3F84A]/10 px-4 py-4">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={15} className="text-[#C3F84A] mt-0.5 shrink-0"/>
                    <div>
                      <p className="text-xs font-bold text-[#1C2B33] dark:text-[#C3F84A] mb-1.5">Catatan dari Penguji</p>
                      <p className="text-sm text-[#1C2B33] dark:text-[#C3F84A] leading-relaxed whitespace-pre-line">
                        {revisiModal.pesanRevisi || "Silakan perbaiki project kamu dan kirim ulang."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-500">Pengiriman sebelumnya</span>
                  <a href={revisiModal.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{color:"#0082FB"}}>
                    <ExternalLink size={11}/> Lihat GDrive Lama
                  </a>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Perbaiki project kamu sesuai catatan di atas, upload ke Google Drive, lalu kirim ulang link-nya.
                </p>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={()=>setRevisiModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Tutup
                </button>
                <button onClick={()=>{ setRevisiModal(null); soalFiles[0] && setSubmitSoal(soalFiles[0]); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{background:"#C3F84A", color:"#1C2B33"}}>
                  <Send size={13}/> Kirim Ulang Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
