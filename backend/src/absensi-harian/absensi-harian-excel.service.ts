import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import { join, normalize } from 'path';
import { getStaticMapImage } from '../common/utils/static-map.util';

type SiswaRekap = {
  siswaId: string;
  nama: string | null;
  nis?: string | null;
  status: string | null;
  waktuAbsen?: string | null;
  lokasi?: string | null;
  foto?: string | null;
  ttd?: string | null;
  catatan?: string | null;
  waktuPulang?: string | null;
  lokasiPulang?: string | null;
  fotoPulang?: string | null;
  ttdPulang?: string | null;
  catatanPulang?: string | null;
};

type RekapKelasData = {
  kelas: { nama: string } | null;
  tanggal: string;
  siswa: SiswaRekap[];
};

type RangeSiswaRow = {
  siswaId: string;
  nama: string | null;
  nis: string | null;
  byTanggal: Record<string, { status: string | null; waktuAbsen: string | null; waktuPulang: string | null }>;
  summary: { HADIR: number; IZIN: number; SAKIT: number; ALPA: number; totalHariEfektif: number; persentaseKehadiran: number };
};
type RekapRangeData = {
  kelas: { nama: string } | null;
  tanggalMulai: string;
  tanggalSelesai: string;
  tanggalList: string[];
  siswa: RangeSiswaRow[];
};

const STATUS_LABEL: Record<string, string> = {
  HADIR: 'Hadir',
  IZIN: 'Izin',
  SAKIT: 'Sakit',
  ALPA: 'Alpa',
};
const STATUS_LETTER: Record<string, string> = { HADIR: 'H', IZIN: 'I', SAKIT: 'S', ALPA: 'A' };
const STATUS_FILL: Record<string, string> = { HADIR: 'FFE8F8F1', IZIN: 'FFF0ECFF', SAKIT: 'FFFFF5DC', ALPA: 'FFFFE9EA' };
const STATUS_FONT: Record<string, string> = { HADIR: 'FF00D67F', IZIN: 'FF6334F4', SAKIT: 'FFE6A800', ALPA: 'FFFF3644' };

function formatTanggalHeader(tanggal: string): string {
  const [, m, d] = tanggal.split('-');
  return `${d}/${m}`;
}

function formatTanggalFull(tanggal: string): string {
  try {
    return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
  } catch {
    return tanggal;
  }
}

// Excel embeds only the font NAME, not the glyphs themselves (unlike PDF) —
// a viewer without Satoshi installed falls back to their default font, but
// we still set it everywhere so it renders correctly wherever it is available.
const FONT_NAME = 'Satoshi';
const NA_FONT = { name: FONT_NAME, color: { argb: 'FFCBD5E1' }, italic: true };
const LINK_FONT = { name: FONT_NAME, color: { argb: 'FF2563EB' }, underline: true };

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

// lokasi is stored as "lat,lng" (see parseLokasi in frontend/shared.ts) — but
// can also be the "GPS tidak tersedia" fallback string when geolocation was
// blocked, so validate both parts are actually numeric before linking.
function googleMapsUrl(lokasi?: string | null): string | null {
  if (!lokasi) return null;
  const parts = lokasi.split(',');
  if (parts.length < 2) return null;
  const lat = parts[0].trim();
  const lng = parts[1].trim();
  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const FOTO_SIZE = { width: 80, height: 80 };
const TTD_SIZE = { width: 100, height: 50 };
const MAP_SIZE = { width: 120, height: 90 };
// 90px-tall map images (the tallest embed) need ~68pt of row height (96dpi: 1pt = 1.333px); add padding so images aren't clipped.
const MEDIA_ROW_HEIGHT = 76;

async function readFotoBuffer(fotoUrl?: string | null): Promise<Buffer | null> {
  if (!fotoUrl || !fotoUrl.startsWith('/uploads/')) return null;
  const filePath = normalize(join(process.cwd(), fotoUrl));
  if (!filePath.startsWith(UPLOADS_ROOT)) return null;
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

function decodeTtdBuffer(ttd?: string | null): Buffer | null {
  if (!ttd) return null;
  const match = /^data:image\/(png|jpe?g);base64,([a-zA-Z0-9+/=]+)$/.exec(ttd.trim());
  if (!match) return null;
  try {
    return Buffer.from(match[2], 'base64');
  } catch {
    return null;
  }
}

// exceljs only embeds jpeg/png/gif, so sniff the real format instead of trusting the upload extension.
function detectImageExtension(buffer: Buffer): 'png' | 'jpeg' | 'gif' | null {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 6 && buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'gif';
  return null;
}

@Injectable()
export class AbsensiHarianExcelService {
  async build(rekap: RekapKelasData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'LMS PPLG';
    wb.created = new Date();
    const ws = wb.addWorksheet('Absensi Harian', { views: [{ state: 'frozen', ySplit: 1 }] });

    ws.columns = [
      { header: 'Nama', key: 'nama', width: 26 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Waktu Hadir', key: 'waktuAbsen', width: 12 },
      { header: 'Waktu Pulang', key: 'waktuPulang', width: 12 },
      { header: 'Lokasi Hadir', key: 'lokasi', width: 32 },
      { header: 'Peta Hadir', key: 'petaLokasi', width: 18 },
      { header: 'Lokasi Pulang', key: 'lokasiPulang', width: 32 },
      { header: 'Peta Pulang', key: 'petaLokasiPulang', width: 18 },
      { header: 'Catatan', key: 'catatan', width: 30 },
      { header: 'Foto Hadir', key: 'foto', width: 13 },
      { header: 'Foto Pulang', key: 'fotoPulang', width: 13 },
      { header: 'TTD Hadir', key: 'ttd', width: 16 },
      { header: 'TTD Pulang', key: 'ttdPulang', width: 16 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6334F4' } };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 20;

    const colIndex: Record<string, number> = {};
    ws.columns.forEach((col, i) => {
      if (col.key) colIndex[col.key] = i;
    });

    for (const s of rekap.siswa) {
      const row = ws.addRow({
        nama: s.nama || '-',
        nis: s.nis || '-',
        status: s.status ? (STATUS_LABEL[s.status] ?? s.status) : '-',
        waktuAbsen: s.waktuAbsen || '-',
        waktuPulang: s.waktuPulang || '-',
        lokasi: s.lokasi || '-',
        lokasiPulang: s.lokasiPulang || '-',
        catatan: [s.catatan, s.catatanPulang].filter(Boolean).join(' | ') || '-',
      });
      row.alignment = { vertical: 'middle', wrapText: false };

      const lokasiUrl = googleMapsUrl(s.lokasi);
      if (lokasiUrl) {
        const cell = row.getCell('lokasi');
        cell.value = { text: s.lokasi as string, hyperlink: lokasiUrl };
        cell.font = LINK_FONT;
      }
      const lokasiPulangUrl = googleMapsUrl(s.lokasiPulang);
      if (lokasiPulangUrl) {
        const cell = row.getCell('lokasiPulang');
        cell.value = { text: s.lokasiPulang as string, hyperlink: lokasiPulangUrl };
        cell.font = LINK_FONT;
      }

      // Map thumbnails are best-effort — getStaticMapImage() never throws and
      // resolves to null on any failure (invalid coords, network error,
      // timeout), so a slow/unreachable tile server can never block the
      // export. The Lokasi Hadir/Pulang hyperlink cells above always work
      // regardless of whether the thumbnail comes back.
      const [fotoBuf, fotoPulangBuf, mapBuf, mapPulangBuf] = await Promise.all([
        readFotoBuffer(s.foto),
        readFotoBuffer(s.fotoPulang),
        getStaticMapImage(s.lokasi),
        getStaticMapImage(s.lokasiPulang),
      ]);
      const ttdBuf = decodeTtdBuffer(s.ttd);
      const ttdPulangBuf = decodeTtdBuffer(s.ttdPulang);

      const hasImage = [
        this.embedOrClear(wb, ws, row, colIndex.foto, fotoBuf, FOTO_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.fotoPulang, fotoPulangBuf, FOTO_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.ttd, ttdBuf, TTD_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.ttdPulang, ttdPulangBuf, TTD_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.petaLokasi, mapBuf, MAP_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.petaLokasiPulang, mapPulangBuf, MAP_SIZE),
      ].some(Boolean);

      if (hasImage) row.height = MEDIA_ROW_HEIGHT;
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  // Weekly/monthly recap has two very different shapes: a per-kelas export
  // is a matrix (rows = siswa, one column per date, cell = H/I/S/A) so a
  // whole class fits on one screen/printout, while a per-siswa export is a
  // tall date-by-date table (single student, no point in a 1-row matrix)
  // with a summary block at the end. No foto/TTD/map embeds in either —
  // that's harian-only, per spec, and would be far too much data across a
  // week/month.
  async buildRange(rekap: RekapRangeData, scope: 'kelas' | 'siswa'): Promise<Buffer> {
    return scope === 'kelas' ? this.buildRangeMatrix(rekap) : this.buildRangeSiswa(rekap);
  }

  private async buildRangeMatrix(rekap: RekapRangeData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'LMS PPLG';
    wb.created = new Date();
    const ws = wb.addWorksheet('Rekap Absensi', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });

    const dateCols = rekap.tanggalList.map((tgl) => ({ header: formatTanggalHeader(tgl), key: `d_${tgl}`, width: 6 }));
    ws.columns = [
      { header: 'Nama', key: 'nama', width: 26 },
      { header: 'NIS', key: 'nis', width: 14 },
      ...dateCols,
      { header: 'Hadir', key: 'totalHadir', width: 8 },
      { header: 'Izin', key: 'totalIzin', width: 8 },
      { header: 'Sakit', key: 'totalSakit', width: 8 },
      { header: 'Alpa', key: 'totalAlpa', width: 8 },
      { header: 'Kehadiran', key: 'persentase', width: 12 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6334F4' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    for (const s of rekap.siswa) {
      const rowData: Record<string, string | number> = {
        nama: s.nama || '-',
        nis: s.nis || '-',
        totalHadir: s.summary.HADIR,
        totalIzin: s.summary.IZIN,
        totalSakit: s.summary.SAKIT,
        totalAlpa: s.summary.ALPA,
        persentase: `${s.summary.persentaseKehadiran}%`,
      };
      for (const tgl of rekap.tanggalList) {
        const status = s.byTanggal[tgl]?.status;
        rowData[`d_${tgl}`] = status ? (STATUS_LETTER[status] ?? '?') : '-';
      }
      const row = ws.addRow(rowData);
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('nama').alignment = { vertical: 'middle', horizontal: 'left' };

      for (const tgl of rekap.tanggalList) {
        const status = s.byTanggal[tgl]?.status;
        const cell = row.getCell(`d_${tgl}`);
        if (status && STATUS_FILL[status]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[status] } };
          cell.font = { name: FONT_NAME, bold: true, color: { argb: STATUS_FONT[status] } };
        } else {
          cell.font = NA_FONT;
        }
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private async buildRangeSiswa(rekap: RekapRangeData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'LMS PPLG';
    wb.created = new Date();
    const s = rekap.siswa[0];
    const ws = wb.addWorksheet('Rekap Absensi', { views: [{ state: 'frozen', ySplit: 1 }] });

    ws.columns = [
      { header: 'Tanggal', key: 'tanggal', width: 26 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Waktu Hadir', key: 'waktuAbsen', width: 14 },
      { header: 'Waktu Pulang', key: 'waktuPulang', width: 14 },
    ];
    const headerRow = ws.getRow(1);
    headerRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6334F4' } };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 20;

    for (const tgl of rekap.tanggalList) {
      const rec = s?.byTanggal[tgl];
      const status = rec?.status;
      const row = ws.addRow({
        tanggal: formatTanggalFull(tgl),
        status: status ? (STATUS_LABEL[status] ?? status) : '-',
        waktuAbsen: rec?.waktuAbsen || '-',
        waktuPulang: rec?.waktuPulang || '-',
      });
      row.alignment = { vertical: 'middle' };
      row.getCell('status').font = status ? { name: FONT_NAME, bold: true, color: { argb: STATUS_FONT[status] ?? 'FF334155' } } : NA_FONT;
    }

    if (s) {
      ws.addRow({});
      const titleRow = ws.addRow({ tanggal: 'RINGKASAN' });
      titleRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FF334155' } };
      ws.addRow({ tanggal: 'Total Hari Efektif', status: String(s.summary.totalHariEfektif) });
      ws.addRow({ tanggal: 'Total Hadir', status: String(s.summary.HADIR) });
      ws.addRow({ tanggal: 'Total Izin', status: String(s.summary.IZIN) });
      ws.addRow({ tanggal: 'Total Sakit', status: String(s.summary.SAKIT) });
      ws.addRow({ tanggal: 'Total Alpa', status: String(s.summary.ALPA) });
      const pctRow = ws.addRow({ tanggal: 'Persentase Kehadiran', status: `${s.summary.persentaseKehadiran}%` });
      pctRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FF3B7CE8' } };
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /** Embeds the image into the cell at (row, col) if possible; otherwise writes a text placeholder. Returns whether an image was embedded. */
  private embedOrClear(
    wb: ExcelJS.Workbook,
    ws: ExcelJS.Worksheet,
    row: ExcelJS.Row,
    col: number,
    buffer: Buffer | null,
    size: { width: number; height: number },
  ): boolean {
    const cell = row.getCell(col + 1);
    const extension = buffer ? detectImageExtension(buffer) : null;
    if (!buffer || !extension) {
      cell.value = '-';
      cell.font = NA_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      return false;
    }
    cell.value = '';
    const imageId = wb.addImage({ buffer, extension } as unknown as ExcelJS.Image);
    ws.addImage(imageId, {
      tl: { col: col + 0.08, row: row.number - 1 + 0.08 },
      ext: size,
      editAs: 'oneCell',
    } as ExcelJS.ImagePosition & { editAs?: string });
    return true;
  }
}
