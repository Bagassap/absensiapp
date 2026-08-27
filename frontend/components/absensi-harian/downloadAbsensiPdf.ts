import type { ExportRange } from "./shared";

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

export async function downloadAbsensiPdf({ range }: { range: ExportRange }): Promise<DownloadResult> {
  const qs = rangeParams(range);
  return downloadFile(
    `/api/absensi-harian/export-pdf?${qs}`,
    `Absensi_Guru_${rangeFilenamePart(range)}.pdf`,
    "Gagal membuat PDF",
  );
}

export async function downloadAbsensiPdfGuru({
  guruId, range, guruNama,
}: {
  guruId: string; range: ExportRange; guruNama: string;
}): Promise<DownloadResult> {
  const qs = rangeParams(range);
  qs.set("guruId", guruId);
  return downloadFile(
    `/api/absensi-harian/export-pdf-guru?${qs}`,
    `Absensi_${safeName(guruNama)}_${rangeFilenamePart(range)}.pdf`,
    "Gagal membuat PDF",
  );
}

export async function downloadAbsensiExcel({ range }: { range: ExportRange }): Promise<DownloadResult> {
  const qs = rangeParams(range);
  return downloadFile(
    `/api/absensi-harian/export-excel?${qs}`,
    `Absensi_Guru_${rangeFilenamePart(range)}.xlsx`,
    "Gagal membuat Excel",
  );
}

export async function downloadAbsensiExcelGuru({
  guruId, range, guruNama,
}: {
  guruId: string; range: ExportRange; guruNama: string;
}): Promise<DownloadResult> {
  const qs = rangeParams(range);
  qs.set("guruId", guruId);
  return downloadFile(
    `/api/absensi-harian/export-excel-guru?${qs}`,
    `Absensi_${safeName(guruNama)}_${rangeFilenamePart(range)}.xlsx`,
    "Gagal membuat Excel",
  );
}
