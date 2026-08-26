export type StatusPenempatan = "AKTIF" | "SELESAI" | "BATAL";

export type TempatMagang = {
  id: string;
  namaTempat: string;
  alamat: string;
  kontak: string | null;
  bidangUsaha: string | null;
  kuota: number;
  _count?: { penempatan: number };
};

export type PenempatanMagang = {
  id: string;
  siswa: {
    id: string;
    nis: string;
    nama: string | null;
    kelas: { id: string; nama: string };
    user: { id: string; nama: string; fotoProfil: string | null } | null;
  };
  tempatMagang: TempatMagang;
  guruPembimbing: { id: string; user: { id: string; nama: string } };
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: StatusPenempatan;
  createdAt: string;
};

export const STATUS_PENEMPATAN_CFG: Record<StatusPenempatan, { label: string; bg: string; clr: string }> = {
  AKTIF: { label: "Aktif", bg: "#EAF3FF", clr: "#0064E0" },
  SELESAI: { label: "Selesai", bg: "#E3FBF0", clr: "#00D67F" },
  BATAL: { label: "Batal", bg: "#FEE9EA", clr: "#EF4444" },
};
