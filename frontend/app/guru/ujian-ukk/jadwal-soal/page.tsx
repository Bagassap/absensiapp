"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  CalendarDays, FileText, FileSpreadsheet, BookOpen, Loader2,
  ChevronLeft, ChevronRight, X, Download, Search,
  MapPin, Clock, User, PieChart,
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
interface Submisi { id: string; fileUrl: string; fileName: string; status: "TERKIRIM"|"DITERIMA"|"REVISI"; submittedAt: string; soal: { id: string; judul: string }; siswa: { id: string; nama: string; user: { id: string; nama: string } }; }

function formatTgl(s: string) { return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }); }

const ROW_PALETTES = [
  { bg:"#EAF3FF", text:"#0082FB",  bar:"#0082FB",  gradient:"#0082FB" },
  { bg:"#E3FBF0", text:"#00D67F",  bar:"#00D67F",  gradient:"#00D67F" },
  { bg:"#FEE9EA", text:"#EF4444",  bar:"#EF4444",  gradient:"#EF4444" },
  { bg:"#F1F5F8", text:"#8A9E1F",  bar:"#8A9E1F",  gradient:"#C3F84A" }, // lime — text/bar gelap supaya kontras
  { bg:"#EAF3FF", text:"#0064E0",  bar:"#0064E0",  gradient:"#0082FB" },
];
function rowPalette(i: number) { return ROW_PALETTES[i % ROW_PALETTES.length]; }


export default function GuruJadwalSoalPage() {
  const [tahapanList, setTahapanList] = useState<Tahapan[]>([]);
  const [submisiList, setSubmisiList] = useState<Submisi[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"active"|"completed"|"all">("all");
  const [taskSearch, setTaskSearch]   = useState("");
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [openJadwalModal, setOpenJadwalModal] = useState(false);
  const [openSoalModal,   setOpenSoalModal]   = useState(false);
  const [soalJadwalIdx,   setSoalJadwalIdx]   = useState(0);
  const [soalSoalIdx,     setSoalSoalIdx]     = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [t, s] = await Promise.all([
      fetch("/api/ujian-ukk/tahapan").then(r => r.json()).catch(() => []),
      fetch("/api/ujian-ukk/submisi").then(r => r.json()).catch(() => []),
    ]);
    const list: Tahapan[] = Array.isArray(t) ? t : [];
    setTahapanList(list);
    setSubmisiList(Array.isArray(s) ? s : []);
    setLoading(false);
    const nowCheck = new Date();
    const todayCheck = todayJakarta();
    const hasActive = list.some(tk => {
      const tglStr = tk.tanggal?.slice(0, 10) ?? "";
      if (tglStr > todayCheck) return true;
      if (tglStr < todayCheck) return false;
      const [h, m] = (tk.jamSelesai ?? "23:59").split(":").map(Number);
      const selesai = new Date(); selesai.setHours(h, m, 0, 0);
      return nowCheck < selesai;
    });
    if (!hasActive && list.length > 0) setTab("completed");
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  function toggleExpand(id: string) { setExpanded(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }

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
  const completed = tahapanList.filter(t => !active.includes(t));
  const shown     = (tab === "all" ? tahapanList : tab === "active" ? active : completed)
    .filter((t) => t.judul.toLowerCase().includes(taskSearch.trim().toLowerCase()));
  const totalSoal = tahapanList.flatMap(t=>t.soal).filter(s=>!s.deskripsi?.startsWith("__jadwal__:")).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
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
                <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">UKK</h1>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {openJadwalModal && (()=>{
              const allSoal = tahapanList.flatMap(t=>t.soal).filter(s=>s.deskripsi?.startsWith("__jadwal__:"));
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
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40">
                            <ChevronLeft size={16}/>
                          </button>
                          <button onClick={()=>setSoalJadwalIdx(i=>Math.min(allSoal.length-1,i+1))} disabled={soalJadwalIdx===allSoal.length-1}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40">
                            <ChevronRight size={16}/>
                          </button>
                        </>)}
                        <button onClick={()=>setOpenJadwalModal(false)}
                          className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30">
                          <X size={16}/>
                        </button>
                      </div>
                    </div>
                    {curSoal ? (
                      <SoalPdfViewer soal={curSoal} onClose={()=>setOpenJadwalModal(false)}/>
                    ) : (
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
              const allSoal = tahapanList.flatMap(t=>t.soal).filter(s=>!s.deskripsi?.startsWith("__jadwal__:"));
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
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40">
                            <ChevronLeft size={16}/>
                          </button>
                          <button onClick={()=>setSoalSoalIdx(i=>Math.min(allSoal.length-1,i+1))} disabled={soalSoalIdx===allSoal.length-1}
                            className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30 disabled:opacity-40">
                            <ChevronRight size={16}/>
                          </button>
                        </>)}
                        <button onClick={()=>setOpenSoalModal(false)}
                          className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/30">
                          <X size={16}/>
                        </button>
                      </div>
                    </div>
                    {curSoal ? (
                      <SoalPdfViewer soal={curSoal} onClose={()=>setOpenSoalModal(false)}/>
                    ) : (
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

          {(()=>{ const jadwalFiles = tahapanList.flatMap(t=>t.soal).filter(s=>s.deskripsi?.startsWith("__jadwal__:")); return (
          <>
          <div className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_2.3fr]">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-800 lg:col-start-1 lg:row-start-1">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Kategori</p>
                <div className="flex flex-col gap-4">
              <button type="button" onClick={()=>{ setSoalJadwalIdx(0); setOpenJadwalModal(true); }}
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

              <button type="button" onClick={()=>{ setSoalSoalIdx(0); setOpenSoalModal(true); }}
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
                </div>
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
                  <input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Cari nama task..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200 dark:focus:ring-blue-900/30" />
                </div>
                <div className="flex gap-5 border-b border-slate-100 dark:border-slate-700">
                  <button onClick={()=>setTab("all")}
                    className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="all" ? "border-slate-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                    style={tab==="all"?{color:"#64748B"}:{}}>
                    Semua
                    {tab==="all" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#64748B"}}>{tahapanList.length}</span>}
                  </button>
                  <button onClick={()=>setTab("active")}
                    className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="active" ? "border-blue-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                    style={tab==="active"?{color:"#0082FB"}:{}}>
                    Aktif
                    {tab==="active" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#0082FB"}}>{active.length}</span>}
                  </button>
                  <button onClick={()=>setTab("completed")}
                    className={`pb-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab==="completed" ? "border-emerald-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
                    style={tab==="completed"?{color:"#00D67F"}:{}}>
                    Selesai
                    {tab==="completed" && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-lg text-white font-bold" style={{backgroundColor:"#00D67F"}}>{completed.length}</span>}
                  </button>
                </div>
              </div>

              <div className="max-h-[330px] overflow-auto">
                {loading && <div className="px-5 py-10 text-center text-sm text-slate-400">Memuat data...</div>}
                {!loading && shown.length === 0 && (
                  <div className="px-5 py-12 text-center">
                    <CalendarDays size={32} className="mx-auto mb-3 text-slate-200"/>
                    <p className="text-sm text-slate-400">{taskSearch.trim() ? `Tidak ada task dengan nama "${taskSearch.trim()}"` : tab==="active" ? "Tidak ada task aktif" : tab==="completed" ? "Tidak ada task selesai" : "Belum ada task"}</p>
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
                        const exp = expanded.has(t.id);
                        const submisiTahapan = submisiList.filter(s => t.soal.some(so => so.id === s.soal?.id));
                        const sudahKumpul = submisiTahapan.length;
                        const pct = Math.min(Math.round((sudahKumpul / Math.max(totalSoal,1))*100),100);
                        return (
                          <Fragment key={t.id}>
                            <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
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
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                <button onClick={()=>toggleExpand(t.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all"
                                  style={{borderColor:rp.bar, color:rp.bar, backgroundColor:rp.bg}}>
                                  <BookOpen size={11}/>
                                  Lihat
                                  {sudahKumpul > 0 && (
                                    <span className="rounded-lg px-1.5 py-0.5 text-[9px] font-bold text-white" style={{backgroundColor:rp.bar}}>{sudahKumpul}</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                            {exp && (
                              <tr className="border-b border-slate-100 dark:border-slate-700/40">
                                <td colSpan={6} className="bg-slate-50/50 p-0 dark:bg-slate-700/20">
                                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700">
                                    <span>Hasil Kerja Siswa</span>
                                    <span className="text-[10px] normal-case font-semibold">{submisiTahapan.length} pengumpulan</span>
                                  </div>
                                  {submisiTahapan.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-xs text-slate-400">Belum ada siswa yang mengumpulkan</div>
                                  ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                      {submisiTahapan.map(s => {
                                        const statusCfg: Record<string,{label:string;color:string;bg:string}> = {
                                          DITERIMA:{ label:"Diterima", color:"#00D67F", bg:"#E3FBF0" },
                                          REVISI:  { label:"Revisi",   color:"#C3F84A", bg:"#F1F5F8" },
                                          TERKIRIM:{ label:"Menunggu", color:"#0082FB", bg:"#EAF3FF" },
                                        };
                                        const cfg = statusCfg[s.status];
                                        return (
                                          <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                              style={{background:"#0082FB"}}>
                                              {(s.siswa?.user?.nama || s.siswa?.nama)?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                {s.siswa?.user?.nama || s.siswa?.nama}
                                              </p>
                                              <p className="text-[10px] text-slate-400">{s.fileName}</p>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0"
                                              style={{color:cfg.color, backgroundColor:cfg.bg}}>{cfg.label}</span>
                                            <a href={s.fileUrl.startsWith("http") ? s.fileUrl : `http://localhost:3001${s.fileUrl}`}
                                              target="_blank" rel="noopener noreferrer"
                                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
                                              style={{color:"#0082FB", backgroundColor:"#EAF3FF"}}>
                                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current shrink-0"><path d="M6.18 15L3.12 9.72 9.24 0h5.51L8.63 9.72 6.18 15zm5.82 0H7.76l2.45-4.28h7.13L14.89 15h-2.89zM12 7.5l2.89-5h2.89L21 7.5h-5.78L12 7.5zM20.88 15l-2.45-4.28h2.01L24 15h-3.12z"/></svg>
                                              GDrive
                                            </a>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          </div>

          </>
          )})()}

        </div>
      </div>
    </div>
  );
}
