export type StatusAbsensi = "HADIR" | "IZIN" | "SAKIT" | "ALPA";
export type FilterAbsensi = StatusAbsensi | "PULANG";
export type AbsenWindow = "HADIR" | "PULANG" | "BOTH" | "CLOSED";

export type GuruAbsensi = {
  guruId: string;
  userId?: string | null;
  nama: string;
  nip?: string | null;
  fotoProfil?: string | null;
  status: StatusAbsensi | null;
  waktuAbsen?: string | null;
  lokasi?: string | null;
  catatan?: string | null;
  ttd?: string | null;
  foto?: string | null;
  waktuPulang?: string | null;
  lokasiPulang?: string | null;
  catatanPulang?: string | null;
  ttdPulang?: string | null;
  fotoPulang?: string | null;
};

export type RekapGuru = {
  tanggal: string;
  rekap: Record<StatusAbsensi, number>;
  pulangCount: number;
  guru: GuruAbsensi[];
};

export type PeriodeLaporan = "mingguan" | "bulanan";

export type LaporanSeringTidakHadirRow = {
  guruId: string;
  nama: string | null;
  nip: string | null;
  fotoProfil: string | null;
  summary: {
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    totalHariEfektif: number;
    persentaseKehadiran: number;
  };
};

export type LaporanSeringTidakHadir = {
  periode: PeriodeLaporan;
  tanggalMulai: string;
  tanggalSelesai: string;
  tanggalList: string[];
  guru: LaporanSeringTidakHadirRow[];
};
