"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Calendar, User as UserIcon } from "lucide-react";

type CatatanItem = {
  id: string;
  judul: string;
  catatan: string;
  poin: number | null;
  tanggal: string;
  dicatatOleh: { id: string; nama: string; role: string };
};

type DetailResponse = {
  siswa: { id: string; nama: string | null; nis: string; kelasId: string };
  catatan: CatatanItem[];
  totalPoin: number;
};

function formatTgl(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", GURU: "Guru", SISWA: "Siswa" };

export default function SiswaCatatanSayaPage() {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/catatan-siswa/saya", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "#0082FB" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm sm:h-14 sm:w-14">
              <NotebookPen size={22} className="text-white sm:hidden" />
              <NotebookPen size={26} className="hidden text-white sm:block" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Catatan Saya</span>
              <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Catatan Saya</h1>
              <p className="mt-0.5 text-sm text-white/70">Riwayat catatan dari guru dan admin</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 backdrop-blur-sm">
              <NotebookPen size={14} className="text-white/70" />
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-white">{loading ? "—" : data?.catatan.length ?? 0}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Total Catatan</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 backdrop-blur-sm">
              <span className="text-[10px] font-black text-white/70">±</span>
              <div className="leading-tight">
                <p className="text-sm font-extrabold text-white">{loading ? "—" : data?.totalPoin ?? 0}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60">Total Poin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading && <p className="px-5 py-10 text-center text-sm text-slate-400">Memuat catatan...</p>}
        {!loading && (!data || data.catatan.length === 0) && (
          <div className="px-5 py-14 text-center">
            <NotebookPen size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm text-slate-400">Belum ada catatan untukmu. Pertahankan!</p>
          </div>
        )}
        {!loading && data && data.catatan.length > 0 && (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {data.catatan.map((c) => (
              <div key={c.id} className="p-5">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{c.judul}</p>
                  {c.poin != null && (
                    <span className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: "#FEE9EA", color: "#EF4444" }}>{c.poin} poin</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{c.catatan}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Calendar size={11} /> {formatTgl(c.tanggal)}</span>
                  <span className="flex items-center gap-1"><UserIcon size={11} /> Dicatat oleh {c.dicatatOleh.nama} ({ROLE_LABEL[c.dicatatOleh.role] ?? c.dicatatOleh.role})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
