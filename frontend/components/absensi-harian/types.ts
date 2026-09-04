export type KegiatanWindow = "BELUM_MULAI" | "BUKA" | "TUTUP";

export type Kegiatan = {
  id: string;
  nama: string;
  tanggal: string;
  jamMulai: number;
  jamSelesai: number;
  keterangan: string | null;
  window: KegiatanWindow;
};

export type KegiatanUntukGuru = Kegiatan & {
  jamLabel: string;
  sudahAbsen: boolean;
  waktuAbsen: string | null;
  catatan: string | null;
  status: "HADIR" | "IZIN" | null;
};

export type AbsensiKegiatanRow = {
  id: string;
  guruId: string;
  nama: string | null;
  nip: string | null;
  fotoProfil: string | null;
  kegiatanId: string;
  kegiatanNama: string;
  waktuAbsen: string;
  lokasi: string;
  foto: string;
  ttd: string;
  verified: boolean;
  verifiedAt: string | null;
  catatan: string | null;
  status: "HADIR" | "IZIN";
};

export type RekapKegiatanHarian = {
  tanggal: string;
  kegiatan: { id: string; nama: string; jamMulai: number; jamSelesai: number; jamLabel: string; keterangan: string | null; window: KegiatanWindow; jumlahAbsen: number; guruTotal: number }[];
  rows: AbsensiKegiatanRow[];
};

export type PeriodeLaporan = "mingguan" | "bulanan";

export type LaporanRendahKehadiranRow = {
  guruId: string;
  nama: string | null;
  nip: string | null;
  fotoProfil: string | null;
  summary: { hadir: number; totalKegiatan: number; tidakHadir: number; persentaseKehadiran: number };
};

export type LaporanRendahKehadiran = {
  periode: PeriodeLaporan;
  tanggalMulai: string;
  tanggalSelesai: string;
  totalKegiatan: number;
  guru: LaporanRendahKehadiranRow[];
};
