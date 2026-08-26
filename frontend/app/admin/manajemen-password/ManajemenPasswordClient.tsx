"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { ResetPasswordModal } from "@/components/shared/ResetPasswordModal";
import { useToast } from "@/components/shared/ToastSystem";
import { FilterBarPassword, type StatusFilter } from "./FilterBarPassword";
import { PermintaanPasswordCard, type PasswordResetRequest } from "./PermintaanPasswordCard";
import { SiswaPasswordTable, type SiswaPasswordItem } from "./SiswaPasswordTable";
import { CreateAccountModal } from "./CreateAccountModal";
import { ImportSiswaModal } from "./ImportSiswaModal";
import { KelolaGuruModal } from "./KelolaGuruModal";

type KelasWithWali = {
  id: string;
  nama: string;
  waliKelasGuru: { id: string; user: { id: string; nama: string } } | null;
  _count?: { siswa: number };
};

type AccountStatus = {
  id: string;
  nama: string;
  role: "SISWA" | "GURU";
  loginId: string | null;
  mustChangePassword: boolean;
  updatedAt: string;
  fotoProfil?: string | null;
  siswa: { nis: string; kelas: { nama: string } } | null;
  guru: { nip: string | null } | null;
};

type SiswaPageResponse = { items: SiswaPasswordItem[]; total: number };

type ResetTarget = { id: string; nama: string; nis?: string; loginId?: string; mustChangePassword: boolean; sourceRequestId?: string };

function toTitleCase(str: string): string {
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function ManajemenPasswordClient() {
  const toast = useToast();
  const [kelasList, setKelasList] = useState<KelasWithWali[]>([]);
  const [accountList, setAccountList] = useState<AccountStatus[]>([]);
  const [, setLoadingHeader] = useState(true);

  const [selectedKelasId, setSelectedKelasId] = useState<string>("");
  const [siswaPage, setSiswaPage] = useState<SiswaPageResponse | null>(null);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const [permintaanList, setPermintaanList] = useState<PasswordResetRequest[]>([]);
  const [loadingPermintaan, setLoadingPermintaan] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [importSiswaOpen, setImportSiswaOpen] = useState(false);
  const [kelolaGuruOpen, setKelolaGuruOpen] = useState(false);

  const fetchHeader = useCallback(async () => {
    setLoadingHeader(true);
    try {
      const [kelasRes, statusRes] = await Promise.all([
        fetch("/api/kelas", { cache: "no-store" }),
        fetch("/api/users/password-status", { cache: "no-store" }),
      ]);
      if (kelasRes.ok) setKelasList(await kelasRes.json());
      if (statusRes.ok) setAccountList(await statusRes.json());
    } finally {
      setLoadingHeader(false);
    }
  }, []);

  const fetchPermintaan = useCallback(async () => {
    setLoadingPermintaan(true);
    try {
      const res = await fetch("/api/users/password-reset-requests", { cache: "no-store" });
      if (res.ok) setPermintaanList(await res.json());
    } finally {
      setLoadingPermintaan(false);
    }
  }, []);

  useEffect(() => { fetchHeader(); fetchPermintaan(); }, [fetchHeader, fetchPermintaan]);

  useEffect(() => {
    if (!selectedKelasId && kelasList.length > 0) setSelectedKelasId(kelasList[0].id);
  }, [kelasList, selectedKelasId]);

  const fetchSiswaPage = useCallback(async (kelasId: string) => {
    if (!kelasId) return;
    setLoadingSiswa(true);
    try {
      const qs = new URLSearchParams({ kelasId, page: "1", limit: "1000" });
      const res = await fetch(`/api/users/manajemen-password/siswa?${qs}`, { cache: "no-store" });
      if (res.ok) setSiswaPage(await res.json());
    } finally {
      setLoadingSiswa(false);
    }
  }, []);

  useEffect(() => {
    if (selectedKelasId) fetchSiswaPage(selectedKelasId);
    setSearch("");
    setStatusFilter("");
  }, [selectedKelasId, fetchSiswaPage]);

  function refetchAll() {
    fetchHeader();
    fetchPermintaan();
    if (selectedKelasId) fetchSiswaPage(selectedKelasId);
  }

  async function handleAbaikan(id: string, silent = false) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/password-reset-requests/${id}/complete`, { method: "PATCH" });
      if (res.ok) {
        if (!silent) toast.success("Permintaan diabaikan", "");
        fetchPermintaan();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.message ?? "Gagal memproses permintaan", "");
      }
    } finally {
      setBusyId(null);
    }
  }


  const accountById = useMemo(() => {
    const map: Record<string, AccountStatus> = {};
    for (const a of accountList) map[a.id] = a;
    return map;
  }, [accountList]);

  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId) ?? null;
  const waliAccount = selectedKelas?.waliKelasGuru ? accountById[selectedKelas.waliKelasGuru.user.id] : undefined;

  const siswaItems = siswaPage?.items ?? [];
  const sudahCount = siswaItems.filter((s) => s.user && !s.user.mustChangePassword).length;
  const belumCount = siswaItems.filter((s) => s.user && s.user.mustChangePassword).length;

  const displayed = siswaItems
    .filter((s) => (statusFilter === "sudah" ? s.user && !s.user.mustChangePassword : statusFilter === "belum" ? s.user && s.user.mustChangePassword : true))
    .filter((s) => (search ? (toTitleCase(s.nama).toLowerCase().includes(search.toLowerCase()) || s.nis.includes(search)) : true));

  const pending = permintaanList.filter((r) => r.status === "PENDING").sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const riwayat = permintaanList.filter((r) => r.status === "SELESAI").sort(
    (a, b) => new Date(b.processedAt ?? b.createdAt).getTime() - new Date(a.processedAt ?? a.createdAt).getTime(),
  );

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "#0082FB" }}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 right-32 h-36 w-36 rounded-full bg-white/8" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg sm:h-14 sm:w-14">
              <KeyRound size={22} className="text-white sm:hidden" />
              <KeyRound size={26} className="hidden text-white sm:block" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Manajemen Password</span>
                <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white/90">Superadmin</span>
              </div>
              <h1 className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Manajemen Password</h1>
              <p className="mt-0.5 text-sm text-white/70">Kelola status password & permintaan reset</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FilterBarPassword
            kelasList={kelasList}
            selectedKelasId={selectedKelasId}
            onSelectKelas={setSelectedKelasId}
            kelasNama={selectedKelas?.nama}
            wali={waliAccount ? { id: waliAccount.id, nama: toTitleCase(waliAccount.nama), fotoProfil: waliAccount.fotoProfil, mustChangePassword: waliAccount.mustChangePassword } : null}
            onResetWali={() => waliAccount && setResetTarget({ id: waliAccount.id, nama: toTitleCase(waliAccount.nama), loginId: waliAccount.loginId ?? undefined, mustChangePassword: waliAccount.mustChangePassword })}
            search={search} onSearch={setSearch}
            statusFilter={statusFilter} onStatusFilter={setStatusFilter}
            total={siswaItems.length} sudahCount={sudahCount} belumCount={belumCount} displayedCount={displayed.length}
            onKelolaGuru={() => setKelolaGuruOpen(true)}
            onImportSiswa={() => setImportSiswaOpen(true)}
            onCreateAccount={() => setCreateAccountOpen(true)}
          />
        </div>

        <PermintaanPasswordCard
          pending={pending}
          riwayat={riwayat}
          loading={loadingPermintaan}
          busyId={busyId}
          onProcess={(r) => r.user && setResetTarget({ id: r.user.id, nama: r.namaPengaju, nis: r.user.siswa?.nis, mustChangePassword: true, sourceRequestId: r.id })}
          onAbaikan={handleAbaikan}
        />
      </div>

      <SiswaPasswordTable
        loading={loadingSiswa}
        siswas={displayed}
        onReset={(s) => s.user && setResetTarget({ id: s.user.id, nama: toTitleCase(s.nama), nis: s.nis, mustChangePassword: s.user.mustChangePassword })}
      />

      {resetTarget && (
        <ResetPasswordModal
          userId={resetTarget.id}
          userName={resetTarget.nama}
          nis={resetTarget.nis}
          loginId={resetTarget.loginId}
          mustChangePassword={resetTarget.mustChangePassword}
          onClose={() => setResetTarget(null)}
          onSuccess={async () => {
            if (resetTarget.sourceRequestId) await handleAbaikan(resetTarget.sourceRequestId, true);
            refetchAll();
          }}
        />
      )}

      <CreateAccountModal
        open={createAccountOpen}
        kelasList={kelasList.map((k) => ({ id: k.id, nama: k.nama }))}
        onClose={() => setCreateAccountOpen(false)}
        onCreated={refetchAll}
      />

      <ImportSiswaModal
        open={importSiswaOpen}
        onClose={() => setImportSiswaOpen(false)}
        onImported={refetchAll}
      />

      <KelolaGuruModal
        open={kelolaGuruOpen}
        kelasList={kelasList}
        onClose={() => setKelolaGuruOpen(false)}
        onResetPassword={(t) => setResetTarget(t)}
        onChanged={refetchAll}
      />
    </div>
  );
}
