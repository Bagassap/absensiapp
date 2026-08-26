export type StatusTugas = "TERKIRIM" | "DITERIMA" | "REVISI";
export type TugasTipe = "SUBMIT" | "PRAKTIK" | "PILIHAN_GANDA" | "ESSAY";

// Tipe yang memakai lembar pengerjaan lockdown (halaman penuh, bukan modal).
export const LOCKDOWN_TIPE = new Set<string>(["PRAKTIK", "PILIHAN_GANDA", "ESSAY"]);
export const MAKSIMAL_PERCOBAAN = 2;

export type TugasKelasRef = { id: string; nama: string };

export type TugasSoalItem = {
  id: string;
  urutan: number;
  pertanyaan: string;
  pilihanA: string | null;
  pilihanB: string | null;
  pilihanC: string | null;
  pilihanD: string | null;
  // Hanya terisi di sisi admin/guru, atau di sisi siswa SETELAH submisi
  // (untuk review) — tidak pernah dikirim ke siswa sebelum ia mengumpulkan.
  jawabanBenar?: string | null;
};

export type TugasJawabanItem = {
  id: string;
  soalId: string;
  jawabanPilihan: string | null;
  jawabanEssay: string | null;
  soal?: TugasSoalItem;
};

export type TugasSubmisiItem = {
  id: string;
  tugasId: string;
  siswaId: string;
  fileUrl: string | null;
  fileName: string | null;
  submittedHtml: string | null;
  submittedCss: string | null;
  submittedJs: string | null;
  catatan: string | null;
  pesanRevisi: string | null;
  status: StatusTugas;
  // Nilai pilihan ganda 0-100, dibulatkan — dihitung & disimpan backend saat
  // submit. Selalu integer, tidak pernah desimal/koma. Null untuk tipe tugas
  // lain (butuh penilaian manual guru).
  nilai: number | null;
  submittedAt: string;
  updatedAt: string;
  tugas?: { id: string; judul: string; tipe?: string; mapel?: string };
  siswa?: { id: string; nama: string | null; user?: { id: string; nama: string } | null };
  jawaban?: TugasJawabanItem[];
  // Lockdown/exam-mode (PRAKTIK/PILIHAN_GANDA/ESSAY) — maksimal 2 percobaan.
  jumlahPercobaan?: number;
  terkunci?: boolean;
  dipaksaKeluar?: boolean;
  waktuMulai?: string | null;
  deadlineWaktu?: string | null;
};

export type TugasItem = {
  id: string;
  mapel: string;
  kelasId: string | null;
  kelas: TugasKelasRef | null;
  judul: string;
  deskripsi: string | null;
  deadline: string;
  tipe: string;
  fileUrl: string | null;
  fileName: string | null;
  starterHtml: string | null;
  starterCss: string | null;
  starterJs: string | null;
  // Durasi pengerjaan (menit) untuk lembar pengerjaan lockdown — wajib untuk
  // PILIHAN_GANDA/ESSAY, opsional untuk PRAKTIK, null untuk SUBMIT.
  durasiMenit?: number | null;
  createdBy: { id: string; nama: string; role: string };
  createdAt: string;
  updatedAt: string;
  _count?: { submisi: number };
  submisi?: TugasSubmisiItem[];
  soal?: TugasSoalItem[];
};

export function formatTgl(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function formatTglJam(s: string) {
  const formatted = new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return `${formatted} WIB`;
}

export function isTugasActive(t: { deadline: string }) {
  return new Date(t.deadline).getTime() > Date.now();
}

export function statusInfo(s: StatusTugas) {
  if (s === "DITERIMA") return { bg: "#E3FBF0", color: "#00D67F", label: "Diterima" };
  if (s === "REVISI") return { bg: "#F1F5F8", color: "#C3F84A", label: "Perlu Revisi" };
  return { bg: "#EAF3FF", color: "#0064E0", label: "Menunggu Review" };
}

export function tipeLabel(tipe: string) {
  if (tipe === "PRAKTIK") return "Praktik Kode";
  if (tipe === "PILIHAN_GANDA") return "Pilihan Ganda";
  if (tipe === "ESSAY") return "Essay";
  return "Kirim File";
}

// Skor pilihan ganda: jumlah jawaban benar dari total soal.
export function hitungSkorPilihanGanda(jawaban: TugasJawabanItem[] | undefined) {
  if (!jawaban || jawaban.length === 0) return { benar: 0, total: 0 };
  const total = jawaban.length;
  const benar = jawaban.filter((j) => j.soal?.jawabanBenar && j.jawabanPilihan === j.soal.jawabanBenar).length;
  return { benar, total };
}

// Nilai 0-100 pilihan ganda — selalu diambil dari nilai yang sudah dihitung &
// dibulatkan di backend saat submit (satu-satunya sumber kebenaran). Fallback
// hitung ulang di client (dibulatkan juga, tidak pernah koma) hanya untuk data
// lama sebelum kolom `nilai` ada.
export function nilaiPilihanGanda(submisi: { nilai?: number | null; jawaban?: TugasJawabanItem[] }): number | null {
  if (typeof submisi.nilai === "number") return submisi.nilai;
  const { benar, total } = hitungSkorPilihanGanda(submisi.jawaban);
  if (total === 0) return null;
  return Math.round((benar / total) * 100);
}
