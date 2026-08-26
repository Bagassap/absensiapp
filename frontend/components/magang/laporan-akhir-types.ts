export type StatusLaporanAkhir = "TERKIRIM" | "DITERIMA" | "REVISI";

export type LaporanAkhirFile = {
  id: string;
  fileUrl: string;
  fileName: string;
  catatan: string | null;
  pesanRevisi: string | null;
  status: StatusLaporanAkhir;
  submittedAt: string;
  updatedAt: string;
};

export type LaporanAkhirRow = {
  penempatanId: string;
  siswa: { id: string; nama: string | null; nis: string; fotoProfil: string | null };
  tempatMagang: { id: string; namaTempat: string };
  guruPembimbing: { id: string; nama: string | null };
  laporan: LaporanAkhirFile | null;
};

export type LaporanAkhirStatusSaya =
  | { hasPenempatan: false }
  | {
      hasPenempatan: true;
      tempatMagang: { namaTempat: string; alamat: string };
      laporan: LaporanAkhirFile | null;
    };
