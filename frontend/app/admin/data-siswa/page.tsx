"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ArrowUpCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { ResetPasswordModal } from "@/components/shared/ResetPasswordModal";
import { DataSiswaHeader } from "@/components/data-siswa/DataSiswaHeader";
import { KartuPelajarBanner } from "@/components/shared/KartuPelajarBanner";
import { FilterBar } from "@/components/data-siswa/FilterBar";
import { UnduhDataSiswaCard } from "@/components/data-siswa/UnduhDataSiswaCard";
import { KenaikanKelasModal } from "@/components/data-siswa/KenaikanKelasModal";
import { SiswaTable } from "@/components/data-siswa/SiswaTable";
import { EditSiswaModal } from "@/components/data-siswa/EditSiswaModal";
import { type SiswaCardData, type KelasRef, getNama, toTitleCase } from "@/components/data-siswa/shared";

export default function AdminDataSiswaPage() {
  const [siswaList, setSiswaList] = useState<SiswaCardData[]>([]);
  const [kelasList, setKelasList] = useState<KelasRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [search, setSearch] = useState("");
  const [filterJurusan, setFilterJurusan] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [editTarget, setEditTarget] = useState<SiswaCardData | null>(null);
  const [resetTarget, setResetTarget] = useState<SiswaCardData | null>(null);
  const [kenaikanOpen, setKenaikanOpen] = useState(false);
  const toast = useToast();

  const loadKelasList = useCallback(async () => {
    const res = await fetch("/api/kelas");
    const list = await res.json().catch(() => []);
    setKelasList(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => { loadKelasList(); }, [loadKelasList]);

  useEffect(() => {
    if (!selectedKelasId && kelasList.length > 0) setSelectedKelasId(kelasList[0].id);
  }, [kelasList, selectedKelasId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/siswa");
      if (res.ok) setSiswaList(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const inKelas = useMemo(
    () => siswaList.filter((s) => s.kelas.id === selectedKelasId),
    [siswaList, selectedKelasId],
  );

  const displayed = inKelas
    .filter((s) => (filterJurusan ? s.jurusan === filterJurusan : true))
    .filter((s) => (filterGender ? s.jenisKelamin === filterGender : true))
    .filter((s) => (search ? (getNama(s).toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search)) : true));

  function handleSaved() {
    fetchData();
    setEditTarget(null);
  }
  async function handleImpersonate(s: SiswaCardData) {
    if (!s.user) return;
    try {
      const res = await fetch(`/api/users/${s.user.id}/impersonate`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Error ${res.status}`);
      sessionStorage.setItem("lms_session", "1");
      window.location.href = data.redirectTo || "/siswa/dashboard";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memulai mode pemantauan.";
      toast.error("Gagal memantau akun", msg);
    }
  }

  const isFiltered = !!(search || filterJurusan || filterGender);
  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId);

  return (
    <div className="space-y-5">
      <DataSiswaHeader title="Data Siswa" />

      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
        <KartuPelajarBanner />

        <button onClick={() => setKenaikanOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/40">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "#0082FB" }}>
              <ArrowUpCircle size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Kenaikan Kelas &amp; Kelulusan</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Naikkan siswa antar kelas, atau luluskan satu kelas sekaligus (akhir tahun ajaran)</p>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-slate-300" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FilterBar
            search={search} onSearch={setSearch}
            filterJurusan={filterJurusan} onFilterJurusan={setFilterJurusan}
            filterGender={filterGender} onFilterGender={setFilterGender}
            kelasList={kelasList} selectedKelasId={selectedKelasId} onSelectKelas={setSelectedKelasId}
            siswaList={inKelas}
            isFiltered={isFiltered}
            onReset={() => { setSearch(""); setFilterJurusan(""); setFilterGender(""); }}
            loading={loading}
            totalCount={inKelas.length}
            displayedCount={displayed.length}
          />
        </div>

        <UnduhDataSiswaCard
          kelasId={selectedKelasId || undefined}
          kelasNama={selectedKelas?.nama}
          jurusan={filterJurusan || undefined}
        />
      </div>

      <SiswaTable
        loading={loading}
        siswas={displayed}
        onEdit={setEditTarget}
        onResetPassword={setResetTarget}
        onImpersonate={handleImpersonate}
      />

      <KenaikanKelasModal
        open={kenaikanOpen}
        onClose={() => setKenaikanOpen(false)}
        kelasList={kelasList}
        onDone={() => { loadKelasList(); fetchData(); }}
      />

      {editTarget && <EditSiswaModal siswa={editTarget} kelasList={kelasList} onClose={() => setEditTarget(null)} onSave={handleSaved} />}

      {resetTarget?.user && (
        <ResetPasswordModal
          userId={resetTarget.user.id}
          userName={toTitleCase(getNama(resetTarget))}
          nis={resetTarget.nis}
          mustChangePassword={resetTarget.user.mustChangePassword}
          onClose={() => setResetTarget(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
