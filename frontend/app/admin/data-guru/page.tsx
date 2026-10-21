"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Search, UserPlus } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { PageHeaderCard } from "@/components/shared/PageHeaderCard";
import { DataGuruTable, type GuruRow } from "@/components/data-guru/DataGuruTable";
import { EditGuruModal } from "@/components/data-guru/EditGuruModal";
import { AddGuruModal } from "@/components/data-guru/AddGuruModal";
import { ResetPasswordModal } from "@/components/data-guru/ResetPasswordModal";
import { SUPER_ADMIN_LOGIN_ID } from "@/lib/constants";

export default function AdminDataGuruPage() {
  const toast = useToast();
  const [guruList, setGuruList] = useState<GuruRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<GuruRow | null>(null);
  const [resetTarget, setResetTarget] = useState<GuruRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setIsSuperAdmin(me?.loginId === SUPER_ADMIN_LOGIN_ID))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/guru");
      if (res.ok) {
        setGuruList(await res.json());
      } else {
        const d = await res.json().catch(() => null);
        toast.error("Gagal memuat data guru", d?.message ?? `Error ${res.status}`);
      }
    } catch {
      toast.error("Server tidak dapat dijangkau", "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayed = useMemo(
    () => guruList.filter((g) =>
      search === "" ||
      g.nama.toLowerCase().includes(search.toLowerCase()) ||
      (g.guru?.nip ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.loginId ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [guruList, search],
  );

  async function handleToggleActive(g: GuruRow) {
    setTogglingId(g.id);
    try {
      const res = await fetch(`/api/users/guru/${g.id}/${g.isActive ? "nonaktifkan" : "aktifkan"}`, { method: "PATCH" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
      toast.success(data?.message ?? "Berhasil diperbarui", "");
      setGuruList((list) => list.map((x) => x.id === g.id ? { ...x, isActive: !x.isActive } : x));
    } catch (e) {
      toast.error("Gagal memperbarui status", e instanceof Error ? e.message : "Coba lagi");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeaderCard className="hidden lg:flex" icon={Users} tone="blue" eyebrow="Manajemen Akun" title="Data Guru" description="Kelola akun, status, dan kata sandi guru" />

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIP, atau NPY..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00C853] dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs font-semibold text-slate-400">{displayed.length} dari {guruList.length} guru</span>
          <button type="button" onClick={() => setAddOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: "#00C853" }}>
            <UserPlus size={14} />
            Tambah Guru
          </button>
        </div>
      </div>

      <DataGuruTable loading={loading} guruList={displayed} onToggleActive={handleToggleActive} togglingId={togglingId} onEdit={setEditTarget}
        onResetPassword={setResetTarget} isSuperAdmin={isSuperAdmin} resetPageKey={search} />

      {editTarget && (
        <EditGuruModal guru={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchData} />
      )}

      {addOpen && (
        <AddGuruModal onClose={() => setAddOpen(false)} onSaved={fetchData} />
      )}

      {resetTarget && (
        <ResetPasswordModal guru={resetTarget} onClose={() => setResetTarget(null)} onSaved={fetchData} />
      )}
    </div>
  );
}
