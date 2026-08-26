"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  NotebookPen, Search, X, Loader2, Pencil, Trash2, Plus,
  User as UserIcon, Calendar, School, ChevronDown, ChevronLeft, ChevronRight, Filter, Users,
  FileSpreadsheet, FileText, Download, AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { DataSiswaHeader } from "@/components/data-siswa/DataSiswaHeader";
import { PageSizeToggle, paginate } from "@/components/shared/PageSizeToggle";

type SummaryItem = {
  siswaId: string;
  nama: string | null;
  nis: string;
  kelas: { id: string; nama: string } | null;
  jumlahCatatan: number;
  totalPoin: number;
  catatanTerakhir: { id: string; judul: string; poin: number | null; tanggal: string } | null;
};

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

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function CatatanSiswaClient() {
  const toast = useToast();
  const [list, setList] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catatan-siswa/summary", { cache: "no-store" });
      if (res.ok) setList(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => { setCurrentUserId(d?.id ?? ""); setCurrentUserRole(d?.role ?? ""); }).catch(() => {});
  }, []);

  const kelasOptions = useMemo(() => {
    const map = new Map<string, string>();
    list.forEach((s) => { if (s.kelas) map.set(s.kelas.id, s.kelas.nama); });
    return Array.from(map, ([id, nama]) => ({ id, nama })).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [list]);

  useEffect(() => {
    if (!selectedKelasId && kelasOptions.length > 0) setSelectedKelasId(kelasOptions[0].id);
  }, [kelasOptions, selectedKelasId]);

  const inKelas = list.filter((s) => s.kelas?.id === selectedKelasId);
  const displayed = inKelas.filter((s) =>
    (s.nama ?? "").toLowerCase().includes(search.trim().toLowerCase()) || s.nis.includes(search.trim())
  );

  useEffect(() => { setPage(0); }, [selectedKelasId, search]);

  const { pageItems, pageCount, start, end } = paginate(displayed, page, pageSize);

  const kelasTercatat = inKelas.filter((s) => s.jumlahCatatan > 0).length;
  const kelasTotalPoin = inKelas.reduce((sum, s) => sum + s.totalPoin, 0);
  const kelasTotalCatatan = inKelas.reduce((sum, s) => sum + s.jumlahCatatan, 0);
  const selectedKelas = kelasOptions.find((k) => k.id === selectedKelasId);

  return (
    <div className="space-y-5">
      <DataSiswaHeader title="Catatan Siswa" eyebrow="Catatan Siswa" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-white">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Filter size={13} />
                  </span>
                  Catatan Siswa <span className="font-medium text-slate-400 dark:text-slate-500">({displayed.length})</span>
                </p>
                <p className="mt-1 ml-9 text-xs text-slate-500 dark:text-slate-400">Cari dan saring siswa di kelas ini</p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <div className="relative shrink-0 sm:w-44">
                  <School size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select value={selectedKelasId} onChange={(e) => setSelectedKelasId(e.target.value)}
                    className="h-10.5 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm font-semibold text-slate-700 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {kelasOptions.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative w-full sm:max-w-xs">
                  <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama atau NIS..."
                    className="h-10.5 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500" />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!loading && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400 dark:border-slate-700/50 dark:text-slate-500">
                Menampilkan {displayed.length} siswa di kelas ini
              </p>
            )}
          </div>

          {loading && (
            <div className="space-y-3 border-t border-slate-100 p-6 dark:border-slate-700">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          )}
          {!loading && displayed.length === 0 && (
            <div className="flex flex-col items-center border-t border-slate-100 py-16 text-center dark:border-slate-700">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <NotebookPen size={24} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Tidak ada siswa yang ditemukan</p>
            </div>
          )}
          {!loading && displayed.length > 0 && (
            <>
              <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-700">
                <table className="w-full min-w-170 text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700/40 dark:bg-slate-700/20">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Nama Siswa</th>
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Catatan Terakhir</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Jumlah</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Total Poin</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Aksi</th>
                    </tr>
                  </thead>
                  <motion.tbody initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.02 } } }}>
                    {pageItems.map((s) => (
                      <motion.tr key={s.siswaId} variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
                        className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-700/20">
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#0082FB" }}>
                              {(s.nama ?? "?")[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">{s.nama ?? "-"}</p>
                              <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{s.nis}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {s.catatanTerakhir ? (
                            <div>
                              <p className="max-w-[220px] truncate font-medium text-slate-700 dark:text-slate-200">{s.catatanTerakhir.judul}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatTgl(s.catatanTerakhir.tanggal)}</p>
                            </div>
                          ) : <span className="text-slate-300 dark:text-slate-600">Belum ada catatan</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{s.jumlahCatatan}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {s.totalPoin > 0 ? (
                            <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: "#FEE9EA", color: "#EF4444" }}>{s.totalPoin} poin</span>
                          ) : <span className="text-xs text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button onClick={() => setDetailId(s.siswaId)}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-95"
                            style={{ background: "#0082FB" }}>
                            Lihat &amp; Catat
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-700/40">
                <span className="text-xs text-slate-400 dark:text-slate-500">{start}–{end} dari {displayed.length}</span>
                <div className="flex items-center gap-2.5">
                  <PageSizeToggle value={pageSize} onChange={(n) => { setPageSize(n); setPage(0); }} />
                  {pageCount > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPage((p) => p - 1)} disabled={page === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{page + 1}/{pageCount}</span>
                      <button onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <Users size={12} /> Ringkasan {selectedKelas?.nama ?? "Kelas"}
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-white shadow-sm" style={{ background: "#0064E0" }}>
                <UserIcon size={16} className="shrink-0" />
                <span className="text-sm font-extrabold">{inKelas.length}</span>
                <span className="text-[10px] font-semibold text-white/80">Total Siswa</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 shadow-sm" style={{ background: "#C3F84A", color: "#1C2B33" }}>
                <NotebookPen size={16} className="shrink-0" />
                <span className="text-sm font-extrabold">{kelasTercatat}</span>
                <span className="text-[10px] font-semibold" style={{ color: "#1C2B33BF" }}>Siswa Tercatat</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-white shadow-sm" style={{ background: "#EF4444" }}>
                <AlertTriangle size={16} className="shrink-0" />
                <span className="text-sm font-extrabold">{kelasTotalPoin}</span>
                <span className="text-[10px] font-semibold text-white/80">Total Poin</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0064E0" }}>
                <Download size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Unduh Laporan</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Ekspor rekap catatan siswa</p>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center text-white shadow-sm" style={{ background: "#0064E0" }}>
                <UserIcon size={15} />
                <span className="text-base font-extrabold">{loading ? "—" : inKelas.length}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-white/80">Siswa Kelas Ini</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center shadow-sm" style={{ background: "#C3F84A", color: "#1C2B33" }}>
                <NotebookPen size={15} />
                <span className="text-base font-extrabold">{loading ? "—" : kelasTotalCatatan}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "#1C2B33BF" }}>Catatan Kelas Ini</span>
              </div>
            </div>

            <div className="flex gap-1.5">
              <a href={`/api/catatan-siswa/export-pdf?kelasId=${selectedKelasId}`}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all hover:brightness-95"
                style={{ backgroundColor: "#FEE9EA", color: "#EF4444", borderColor: "#EF444430" }}>
                <FileText size={12} /> PDF
              </a>
              <a href={`/api/catatan-siswa/export-excel?kelasId=${selectedKelasId}`}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all hover:brightness-95"
                style={{ backgroundColor: "#E3FBF0", color: "#00D67F", borderColor: "#00D67F30" }}>
                <FileSpreadsheet size={12} /> Excel
              </a>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <Download size={10} className="shrink-0 text-[#0064E0]" />
              Rekap {selectedKelas?.nama ?? "kelas ini"} beserta seluruh catatannya
            </p>
          </div>
        </div>
      </div>

      {detailId && (
        <CatatanDetailModal
          siswaId={detailId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function CatatanDetailModal({
  siswaId, currentUserId, currentUserRole, onClose, onChanged,
}: {
  siswaId: string; currentUserId: string; currentUserRole: string; onClose: () => void; onChanged: () => void;
}) {
  const toast = useToast();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<CatatanItem | null>(null);
  const [judul, setJudul] = useState("");
  const [catatan, setCatatan] = useState("");
  const [poin, setPoin] = useState("");
  const [tanggal, setTanggal] = useState(todayInput());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catatan-siswa/siswa/${siswaId}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
      else toast.error("Gagal memuat catatan", "");
    } finally {
      setLoading(false);
    }
  }, [siswaId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTarget(null);
    setJudul(""); setCatatan(""); setPoin(""); setTanggal(todayInput());
    setShowForm(true);
  }

  function openEdit(c: CatatanItem) {
    setEditTarget(c);
    setJudul(c.judul); setCatatan(c.catatan); setPoin(c.poin != null ? String(c.poin) : ""); setTanggal(c.tanggal.slice(0, 10));
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!judul.trim() || !catatan.trim()) { toast.error("Judul dan catatan wajib diisi", ""); return; }
    setSaving(true);
    try {
      const body = {
        siswaId,
        judul: judul.trim(),
        catatan: catatan.trim(),
        poin: poin.trim() ? Number(poin) : undefined,
        tanggal,
      };
      const res = editTarget
        ? await fetch(`/api/catatan-siswa/${editTarget.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ judul: body.judul, catatan: body.catatan, poin: body.poin, tanggal: body.tanggal }),
          })
        : await fetch("/api/catatan-siswa", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
      if (res.ok) {
        toast.success(editTarget ? "Catatan diperbarui" : "Catatan ditambahkan", "");
        setShowForm(false);
        load();
        onChanged();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal menyimpan catatan", "");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    const res = await fetch(`/api/catatan-siswa/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Catatan dihapus", "");
      load();
      onChanged();
    } else {
      const d = await res.json().catch(() => null);
      toast.error(d?.message ?? "Gagal menghapus catatan", "");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="relative shrink-0 overflow-hidden px-6 py-5" style={{ background: "#0082FB" }}>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Catatan Siswa</p>
              <p className="truncate text-lg font-extrabold text-white">{data?.siswa.nama ?? "Memuat..."}</p>
              <p className="text-xs text-white/70">{data?.siswa.nis}{data ? ` · Total ${data.totalPoin} poin` : ""}</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showForm && (
            <button onClick={openAdd}
              className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-500 dark:border-slate-600 dark:text-slate-400">
              <Plus size={14} /> Tambah Catatan
            </button>
          )}

          {showForm && (
            <form onSubmit={submit} className="mb-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-700/20">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{editTarget ? "Edit Catatan" : "Catatan Baru"}</p>
              <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul (mis. Terlambat masuk kelas)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Detail catatan..." rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Tanggal</label>
                  <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                </div>
                <div className="w-28">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Poin (opsional)</label>
                  <input type="number" value={poin} onChange={(e) => setPoin(e.target.value)} placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                  style={{ background: "#0082FB" }}>
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editTarget ? "Simpan Perubahan" : "Simpan Catatan"}
                </button>
              </div>
            </form>
          )}

          {loading && <p className="py-8 text-center text-sm text-slate-400">Memuat riwayat...</p>}
          {!loading && data?.catatan.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada catatan untuk siswa ini.</p>
          )}
          {!loading && data && data.catatan.length > 0 && (
            <div className="space-y-3">
              {data.catatan.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-100 p-4 dark:border-slate-700">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{c.judul}</p>
                    {c.poin != null && (
                      <span className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "#FEE9EA", color: "#EF4444" }}>{c.poin} poin</span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{c.catatan}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-50 pt-2.5 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      <Calendar size={10} /> {formatTgl(c.tanggal)}
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span>{c.dicatatOleh.nama}</span>
                    </div>
                    {(c.dicatatOleh.id === currentUserId || currentUserRole === "ADMIN") && (
                      <div className="flex gap-0.5">
                        <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
