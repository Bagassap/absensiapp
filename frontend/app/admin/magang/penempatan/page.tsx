"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Building2, ClipboardList, Wallet } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { toTitleCase } from "@/components/data-siswa/shared";
import type { SiswaCardData } from "@/components/data-siswa/shared";
import { GradientStatCard } from "@/components/shared/GradientStatCard";
import { KelolaTempatModal } from "@/components/magang/KelolaTempatModal";
import { TempatkanSiswaModal } from "@/components/magang/TempatkanSiswaModal";
import { PenempatanFilterBar, type PenempatanStatusFilter } from "@/components/magang/PenempatanFilterBar";
import { PenempatanTable } from "@/components/magang/PenempatanTable";
import type { TempatMagang, PenempatanMagang, StatusPenempatan } from "@/components/magang/types";

type GuruOption = { id: string; user: { id: string; nama: string } };

const statGridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function AdminMagangPenempatanPage() {
  const toast = useToast();
  const [tempatList, setTempatList] = useState<TempatMagang[]>([]);
  const [penempatanList, setPenempatanList] = useState<PenempatanMagang[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaCardData[]>([]);
  const [guruList, setGuruList] = useState<GuruOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKelolaTempat, setShowKelolaTempat] = useState(false);
  const [showTempatkan, setShowTempatkan] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PenempatanStatusFilter>("");

  const loadTempat = useCallback(async () => {
    const res = await fetch("/api/magang/tempat", { cache: "no-store" });
    const list = await res.json().catch(() => []);
    setTempatList(Array.isArray(list) ? list : []);
  }, []);

  const loadPenempatan = useCallback(async () => {
    const res = await fetch("/api/magang/penempatan", { cache: "no-store" });
    const list = await res.json().catch(() => []);
    setPenempatanList(Array.isArray(list) ? list : []);
  }, []);

  const loadSiswa = useCallback(async () => {
    const res = await fetch("/api/siswa", { cache: "no-store" });
    const list = await res.json().catch(() => []);
    setSiswaList(Array.isArray(list) ? list : []);
  }, []);

  const loadGuru = useCallback(async () => {
    const res = await fetch("/api/kelas/guru-list", { cache: "no-store" });
    const list = await res.json().catch(() => []);
    setGuruList(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTempat(), loadPenempatan(), loadSiswa(), loadGuru()]).finally(() => setLoading(false));
  }, [loadTempat, loadPenempatan, loadSiswa, loadGuru]);

  async function ubahStatus(p: PenempatanMagang, status: StatusPenempatan) {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/magang/penempatan/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { toast.success("Status penempatan diperbarui", ""); loadPenempatan(); loadTempat(); }
      else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal mengubah status", "");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function hapus(p: PenempatanMagang) {
    const namaSiswa = toTitleCase(p.siswa.nama ?? p.siswa.user?.nama ?? "—");
    const ok = await toast.confirm(
      "Hapus penempatan ini?",
      `Penempatan ${namaSiswa} di "${p.tempatMagang.namaTempat}" akan dihapus.`,
    );
    if (!ok) return;
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/magang/penempatan/${p.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Penempatan dihapus", ""); loadPenempatan(); loadTempat(); }
      else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal menghapus penempatan", "");
      }
    } finally {
      setBusyId(null);
    }
  }

  const jumlahAktif = penempatanList.filter((p) => p.status === "AKTIF").length;
  const jumlahSelesai = penempatanList.filter((p) => p.status === "SELESAI").length;
  const jumlahBatal = penempatanList.filter((p) => p.status === "BATAL").length;
  const totalKuota = tempatList.reduce((sum, t) => sum + t.kuota, 0);
  const kuotaTerisi = tempatList.reduce((sum, t) => sum + (t._count?.penempatan ?? 0), 0);
  const tempatFavorit = [...tempatList].sort((a, b) => (b._count?.penempatan ?? 0) - (a._count?.penempatan ?? 0))[0] ?? null;

  const displayList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return penempatanList
      .filter((p) => (statusFilter ? p.status === statusFilter : true))
      .filter((p) => {
        if (!q) return true;
        const nama = (p.siswa.nama ?? p.siswa.user?.nama ?? "").toLowerCase();
        return nama.includes(q) || p.siswa.nis.includes(q) || p.tempatMagang.namaTempat.toLowerCase().includes(q);
      });
  }, [penempatanList, search, statusFilter]);

  return (
    <div className="space-y-5 p-1">
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: "#0082FB" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
            <Briefcase size={22} className="text-white sm:hidden" />
            <Briefcase size={26} className="hidden text-white sm:block" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">PKL</span>
            <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Penempatan PKL</h1>
          </div>
        </div>
      </div>

      <motion.div initial="hidden" animate="visible" variants={statGridVariants}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <GradientStatCard
            eyebrow="PKL"
            tone="navy"
            label="Tempat Magang"
            value={loading ? "—" : tempatList.length}
            icon={Building2}
            footerLeftLabel="Kuota" footerLeftValue={`${kuotaTerisi}/${totalKuota}`}
            footerRightLabel="Terbanyak" footerRightValue={tempatFavorit ? tempatFavorit.namaTempat : "—"}
          />
        </div>
        <div className="lg:col-span-4">
          <GradientStatCard
            eyebrow="PKL"
            tone="lime"
            label="Siswa PKL Aktif"
            value={loading ? "—" : jumlahAktif}
            icon={Briefcase}
            footerLeftLabel="Selesai" footerLeftValue={String(jumlahSelesai)}
            footerRightLabel="Dibatalkan" footerRightValue={String(jumlahBatal)}
          />
        </div>
        <div className="lg:col-span-2">
          <GradientStatCard
            eyebrow="PKL"
            tone="red"
            label="Total Kuota"
            value={loading ? "—" : totalKuota}
            icon={Wallet}
            footerLeftLabel="Terisi" footerLeftValue={`${totalKuota > 0 ? Math.round((kuotaTerisi / totalKuota) * 100) : 0}%`}
            footerRightLabel="Sisa" footerRightValue={String(Math.max(0, totalKuota - kuotaTerisi))}
          />
        </div>
        <div className="lg:col-span-3">
          <GradientStatCard
            eyebrow="PKL"
            tone="blue"
            label="Total Riwayat Penempatan"
            value={loading ? "—" : penempatanList.length}
            icon={ClipboardList}
            footerLeftLabel="Periode" footerLeftValue="Sepanjang PKL"
            footerRightLabel="Kategori" footerRightValue="Aktif · Selesai · Batal"
          />
        </div>
      </motion.div>

      <PenempatanFilterBar
        search={search} onSearch={setSearch}
        statusFilter={statusFilter} onStatusFilter={setStatusFilter}
        total={penempatanList.length} aktifCount={jumlahAktif} selesaiCount={jumlahSelesai} batalCount={jumlahBatal}
        displayedCount={displayList.length}
        onKelolaTempat={() => setShowKelolaTempat(true)}
        onTempatkan={() => setShowTempatkan(true)}
      />

      <PenempatanTable
        loading={loading}
        list={displayList}
        busyId={busyId}
        onUbahStatus={ubahStatus}
        onHapus={hapus}
      />

      <AnimatePresence>
        {showKelolaTempat && (
          <KelolaTempatModal
            tempatList={tempatList}
            onClose={() => setShowKelolaTempat(false)}
            onSaved={loadTempat}
          />
        )}
        {showTempatkan && (
          <TempatkanSiswaModal
            siswaList={siswaList}
            tempatList={tempatList}
            guruList={guruList}
            penempatanList={penempatanList}
            onClose={() => setShowTempatkan(false)}
            onSaved={() => { loadPenempatan(); loadTempat(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
