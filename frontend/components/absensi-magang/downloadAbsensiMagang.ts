import type { ExportRange } from "@/components/absensi-harian/shared";

type DownloadResult = { ok: true } | { ok: false; message: string };

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Data";
}

function rangeParams(range: ExportRange): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("mode", range.mode);
  if (range.mode === "harian") qs.set("tanggal", range.tanggal);
  else if (range.mode === "mingguan") {
    qs.set("tanggalMulai", range.tanggalMulai);
    qs.set("tanggalSelesai", range.tanggalSelesai);
  } else {
    qs.set("bulan", String(range.bulan));
    qs.set("tahun", String(range.tahun));
  }
  return qs;
}

function rangeFilenamePart(range: ExportRange): string {
  if (range.mode === "harian") return range.tanggal;
  if (range.mode === "mingguan") return `Mingguan_${range.tanggalMulai}_${range.tanggalSelesai}`;
  return `Bulanan_${range.tahun}-${String(range.bulan).padStart(2, "0")}`;
}

async function downloadFile(url: string, filename: string, failMessage: string): Promise<DownloadResult> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, message: "Tidak dapat terhubung ke server" };
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { ok: false, message: data?.message ?? failMessage };
  }

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);

  return { ok: true };
}

export async function downloadAbsensiMagangPdf({
  tempatMagangId, range, tempatNama,
}: {
  tempatMagangId: string; range: ExportRange; tempatNama: string;
}): Promise<DownloadResult> {
  const qs = rangeParams(range);
  qs.set("tempatMagangId", tempatMagangId);
  return downloadFile(
    `/api/magang/absensi/export-pdf?${qs}`,
    `AbsensiPKL_${safeName(tempatNama)}_${rangeFilenamePart(range)}.pdf`,
    "Gagal membuat PDF",
  );
}

export async function downloadAbsensiMagangPdfSiswa({
  siswaId, range, siswaNama,
}: {
  siswaId: string; range: ExportRange; siswaNama: string;
}): Promise<DownloadResult> {
  const qs = rangeParams(range);
  qs.set("siswaId", siswaId);
  return downloadFile(
    `/api/magang/absensi/export-pdf-siswa?${qs}`,
    `AbsensiPKL_${safeName(siswaNama)}_${rangeFilenamePart(range)}.pdf`,
    "Gagal membuat PDF",
  );
}

export async function downloadAbsensiMagangExcel({
  tempatMagangId, range, tempatNama,
}: {
  tempatMagangId: string; range: ExportRange; tempatNama: string;
}): Promise<DownloadResult> {
  const qs = rangeParams(range);
  qs.set("tempatMagangId", tempatMagangId);
  return downloadFile(
    `/api/magang/absensi/export-excel?${qs}`,
    `AbsensiPKL_${safeName(tempatNama)}_${rangeFilenamePart(range)}.xlsx`,
    "Gagal membuat Excel",
  );
}

export async function downloadAbsensiMagangExcelSiswa({
  siswaId, range, siswaNama,
}: {
  siswaId: string; range: ExportRange; siswaNama: string;
}): Promise<DownloadResult> {
  const qs = rangeParams(range);
  qs.set("siswaId", siswaId);
  return downloadFile(
    `/api/magang/absensi/export-excel-siswa?${qs}`,
    `AbsensiPKL_${safeName(siswaNama)}_${rangeFilenamePart(range)}.xlsx`,
    "Gagal membuat Excel",
  );
}
