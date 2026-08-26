"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { LaporanAkhirTable } from "./LaporanAkhirTable";
import { LaporanAkhirReviewModal } from "./LaporanAkhirReviewModal";
import type { LaporanAkhirRow } from "./laporan-akhir-types";

export function AdminLaporanPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<LaporanAkhirRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LaporanAkhirRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/magang/laporan-akhir", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setRows(Array.isArray(json) ? json : []);
    } catch {
      toast.error("Gagal memuat data laporan akhir PKL", "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.siswa.nama ?? "").toLowerCase().includes(q) || r.siswa.nis.toLowerCase().includes(q);
  });

  async function handleReview(penempatanId: string, status: "DITERIMA" | "REVISI", pesanRevisi?: string) {
    const res = await fetch(`/api/magang/laporan-akhir/${penempatanId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, pesanRevisi }),
    });
    if (res.ok) {
      toast.success(status === "DITERIMA" ? "Laporan diterima" : "Revisi terkirim", "");
      load();
    } else {
      const d = await res.json().catch(() => null);
      toast.error(d?.message ?? "Gagal memperbarui status", "");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "#0082FB" }}>
              <Filter size={14} className="text-white" />
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Daftar Laporan Akhir <span className="font-medium text-slate-400">({filtered.length})</span></p>
          </div>
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/NIS..."
              className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200" />
          </div>
        </div>

        <LaporanAkhirTable loading={loading} rows={filtered} showPembimbing onOpen={setSelected} />
      </div>

      <LaporanAkhirReviewModal row={selected} onClose={() => setSelected(null)} onReview={handleReview} />
    </div>
  );
}
