"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Loader2, Shield, GraduationCap, User as UserIcon } from "lucide-react";
import { useToast } from "@/components/shared/ToastSystem";
import { JURUSAN_OPTIONS } from "@/components/data-siswa/shared";

type Role = "ADMIN" | "GURU" | "SISWA";
type KelasOption = { id: string; nama: string };

const INPUT_CLS = "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 transition-all focus:border-[#0082FB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0082FB]/15 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-700";

const ROLE_OPTIONS: { value: Role; label: string; icon: typeof Shield }[] = [
  { value: "SISWA", label: "Siswa", icon: UserIcon },
  { value: "GURU", label: "Guru", icon: GraduationCap },
  { value: "ADMIN", label: "Admin", icon: Shield },
];

export function CreateAccountModal({
  open, kelasList, onClose, onCreated,
}: {
  open: boolean;
  kelasList: KelasOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState<Role>("SISWA");
  const [nama, setNama] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [nip, setNip] = useState("");
  const [noWa, setNoWa] = useState("");
  const [nis, setNis] = useState("");
  const [kelasId, setKelasId] = useState("");
  const [jurusan, setJurusan] = useState(JURUSAN_OPTIONS[0]);
  const [angkatan, setAngkatan] = useState(String(new Date().getFullYear()));
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setRole("SISWA");
      setNama(""); setLoginId(""); setPassword(""); setNip(""); setNoWa("");
      setNis(""); setKelasId(kelasList[0]?.id ?? ""); setJurusan(JURUSAN_OPTIONS[0]);
      setAngkatan(String(new Date().getFullYear())); setJenisKelamin("");
      setError("");
    }
  }, [open, kelasList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim()) { setError("Nama wajib diisi."); return; }
    if (role !== "SISWA" && (!loginId.trim() || !password.trim())) { setError("Login ID dan password wajib diisi."); return; }
    if (role === "SISWA" && (!nis.trim() || !kelasId || !jurusan)) { setError("NIS, kelas, dan jurusan wajib diisi."); return; }

    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { role, nama: nama.trim() };
      if (role === "SISWA") {
        body.nis = nis.trim();
        body.kelasId = kelasId;
        body.jurusan = jurusan;
        body.angkatan = Number(angkatan);
        if (jenisKelamin) body.jenisKelamin = jenisKelamin;
      } else {
        body.loginId = loginId.trim();
        body.password = password;
        if (role === "GURU") {
          if (nip.trim()) body.nip = nip.trim();
          if (noWa.trim()) body.noWa = noWa.trim();
        }
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const msg = Array.isArray(d.message) ? d.message.join(", ") : (d.message ?? "Gagal membuat akun.");
        setError(msg);
        toast.error("Gagal membuat akun", msg);
        return;
      }
      const saved = await res.json();
      toast.success("Akun berhasil dibuat!", saved.loginId ? `Login: ${saved.loginId}` : nama);
      onCreated();
      onClose();
    } catch {
      const msg = "Server tidak dapat dijangkau.";
      setError(msg);
      toast.error("Koneksi bermasalah", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-800">

            <div className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-[#0082FB] px-6 py-5">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <UserPlus size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Manajemen Password</p>
                <h2 className="text-base font-extrabold text-white">Buat Akun Baru</h2>
              </div>
              <button onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Jenis Akun</label>
                <div className="flex gap-1.5">
                  {ROLE_OPTIONS.map((r) => {
                    const active = role === r.value;
                    return (
                      <button key={r.value} type="button" onClick={() => setRole(r.value)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold transition-all ${
                          active ? "text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                        style={active ? { background: "#0082FB" } : {}}>
                        <r.icon size={13} /> {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama sesuai identitas" className={INPUT_CLS} />
              </div>

              {role === "SISWA" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                        NIS <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={nis} onChange={(e) => setNis(e.target.value)}
                        placeholder="Nomor induk siswa" className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Kelas <span className="text-red-500">*</span>
                      </label>
                      <select value={kelasId} onChange={(e) => setKelasId(e.target.value)} className={INPUT_CLS}>
                        {kelasList.length === 0 && <option value="">Belum ada kelas</option>}
                        {kelasList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Jurusan <span className="text-red-500">*</span>
                      </label>
                      <select value={jurusan} onChange={(e) => setJurusan(e.target.value)} className={INPUT_CLS}>
                        {JURUSAN_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Angkatan <span className="text-red-500">*</span>
                      </label>
                      <input type="number" value={angkatan} onChange={(e) => setAngkatan(e.target.value)} className={INPUT_CLS} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">Jenis Kelamin</label>
                    <select value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)} className={INPUT_CLS}>
                      <option value="">Tidak diisi</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    Login siswa memakai NIS, dengan password awal = NIS (wajib diganti saat login pertama).
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Login ID <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)}
                        placeholder="Kode login unik" className={INPUT_CLS} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">
                        Password Awal <span className="text-red-500">*</span>
                      </label>
                      <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 4 karakter" className={INPUT_CLS} />
                    </div>
                  </div>
                  {role === "GURU" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">NIP <span className="font-normal text-gray-400">(opsional)</span></label>
                        <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-slate-300">No. WA <span className="font-normal text-gray-400">(opsional)</span></label>
                        <input type="text" value={noWa} onChange={(e) => setNoWa(e.target.value)} className={INPUT_CLS} />
                      </div>
                    </div>
                  )}
                  <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-xs text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    Akun akan diwajibkan mengganti password saat login pertama.
                  </p>
                </>
              )}

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</p>
              )}
            </form>

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 p-6 pt-4 dark:border-slate-700">
              <button type="button" onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
                Batal
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#0082FB] px-5 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Membuat…" : "Buat Akun"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
