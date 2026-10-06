export type KegiatanWindow = "BELUM_MULAI" | "BUKA" | "TUTUP";

export type Kegiatan = {
  id: string;
  nama: string;
  tanggal: string;
  jamMulai: number;
  jamSelesai: number;
  keterangan: string | null;
  window: KegiatanWindow;
  recurringSourceId: string | null;
};

export type HariRecurring = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU";

export type KegiatanRecurring = {
  id: string;
  nama: string;
  hari: HariRecurring[];
  jamMulai: number;
  jamSelesai: number;
  keterangan: string | null;
};

export type KegiatanUntukGuru = Kegiatan & {
  jamLabel: string;
  sudahAbsen: boolean;
  waktuAbsen: string | null;
  catatan: string | null;
  status: "HADIR" | "IZIN" | null;
  foto: string | null;
  lokasi: string | null;
  ttd: string | null;
};

export type AbsensiKegiatanRow = {
  id: string;
  guruId: string;
  nama: string | null;
  nip: string | null;
  npy: string | null;
  fotoProfil: string | null;
  kegiatanId: string;
  kegiatanNama: string;
  // Terisi lokasi tugas piket kalau baris ini "Piket Harian" untuk guru
  // yang memang berjadwal piket hari itu.
  keterangan: string | null;
  waktuAbsen: string;
  lokasi: string;
  foto: string;
  ttd: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedByNama: string | null;
  catatan: string | null;
  // "ALFA" = baris sintetis dari backend (guru belum absen sama sekali
  // untuk kegiatan ini) — id-nya berprefix "alfa-", bukan record sungguhan.
  status: "HADIR" | "IZIN" | "ALFA";
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
