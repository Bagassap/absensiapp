"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DataSiswaHeader } from "@/components/data-siswa/DataSiswaHeader";
import { KartuPelajarBanner } from "@/components/shared/KartuPelajarBanner";
import { FilterBar } from "@/components/data-siswa/FilterBar";
import { UnduhDataSiswaCard } from "@/components/data-siswa/UnduhDataSiswaCard";
import { SiswaTable } from "@/components/data-siswa/SiswaTable";
import { type SiswaCardData, type KelasRef, getNama } from "@/components/data-siswa/shared";

export default function GuruDataSiswaPage() {
  const [siswaList, setSiswaList] = useState<SiswaCardData[]>([]);
  const [kelasList, setKelasList] = useState<KelasRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [search, setSearch] = useState("");
  const [filterJurusan, setFilterJurusan] = useState("");
  const [filterGender, setFilterGender] = useState("");

  useEffect(() => {
    // "/api/kelas/saya" - dibatasi ke kelas yang guru ini jadi wali kelasnya,
    // bukan "/api/kelas" yang menampilkan semua kelas di sekolah.
    fetch("/api/kelas/saya").then((r) => r.json()).then((list) => setKelasList(Array.isArray(list) ? list : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedKelasId && kelasList.length > 0) setSelectedKelasId(kelasList[0].id);
  }, [kelasList, selectedKelasId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/siswa");
      if (res.ok) setSiswaList(await res.json());
    } finally {
      setLoading(false);
    }
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

  const isFiltered = !!(search || filterJurusan || filterGender);
  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId);

  return (
    <div className="space-y-5">
      <DataSiswaHeader title="Data Siswa" />

      <KartuPelajarBanner />

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
      />
    </div>
  );
}
