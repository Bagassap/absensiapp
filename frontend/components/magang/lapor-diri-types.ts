export type LaporDiriFile = {
  id: string;
  fileUrl: string;
  fileName: string;
  catatan: string | null;
  createdAt: string;
};

export type LaporDiriRow = {
  penempatanId: string;
  siswa: { id: string; nama: string | null; nis: string; fotoProfil: string | null };
  tempatMagang: { id: string; namaTempat: string };
  guruPembimbing: { id: string; nama: string | null };
  sudahLapor: boolean;
  laporDiri: LaporDiriFile | null;
};

export type LaporDiriSummary = { total: number; sudahLapor: number; belumLapor: number };

export type LaporDiriResponse = { periode: string; summary: LaporDiriSummary; rows: LaporDiriRow[] };

export type LaporDiriStatusSaya =
  | { hasPenempatan: false }
  | {
      hasPenempatan: true;
      tempatMagang: { namaTempat: string; alamat: string };
      periode: string;
      sudahLapor: boolean;
      current: LaporDiriFile | null;
      history: LaporDiriFile[];
    };
