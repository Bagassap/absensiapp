"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { XCircle, Search, Filter } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { LaporDiriTable } from "./LaporDiriTable";
import type { LaporDiriResponse, LaporDiriRow } from "./lapor-diri-types";

export function AdminLaporDiriPanel() {
  const toast = useToast();
  const [data, setData] = useState<LaporDiriResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyBelum, setOnlyBelum] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/magang/lapor-diri", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      setData(json && Array.isArray(json.rows) ? json : { periode: "", summary: { total: 0, sudahLapor: 0, belumLapor: 0 }, rows: [] });
    } catch {
      toast.error("Gagal memuat data lapor diri PKL", "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r: LaporDiriRow) => {
      if (onlyBelum && r.sudahLapor) return false;
      if (!q) return true;
      return (r.siswa.nama ?? "").toLowerCase().includes(q) || r.siswa.nis.toLowerCase().includes(q);
    });
  }, [rows, search, onlyBelum]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "#0082FB" }}>
              <Filter size={14} className="text-white" />
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Daftar Lapor Diri <span className="font-medium text-slate-400">({filtered.length})</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/NIS..."
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200" />
            </div>
            <button type="button" onClick={() => setOnlyBelum((v) => !v)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                onlyBelum ? "bg-red-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
              }`}>
              <XCircle size={12} /> Belum Lapor
            </button>
          </div>
        </div>

        <LaporDiriTable loading={loading} rows={filtered} showPembimbing />
      </div>
    </div>
  );
}
