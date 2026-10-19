import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import { join, normalize } from 'path';
import { getStaticMapImage } from '../common/utils/static-map.util';

type AbsensiRow = {
  id: string;
  guruId: string;
  nama: string | null;
  npy: string | null;
  kegiatanNama: string;
  waktuAbsen: string;
  lokasi: string;
  foto: string;
  ttd: string;
  catatan?: string | null;
  verified?: boolean;
  verifiedByNama?: string | null;
};

type RekapHarian = { tanggal: string; kegiatan: { nama: string; jamLabel: string; jumlahAbsen: number; guruTotal: number }[]; rows: AbsensiRow[] };
type RekapGuruHarian = { tanggal: string; guruNama: string | null; rows: AbsensiRow[] };
type RekapRange = {
  mode: 'mingguan' | 'bulanan';
  tanggalMulai: string;
  tanggalSelesai: string;
  totalKegiatan: number;
  totalHadirKeseluruhan: number;
  totalKegiatanKeseluruhan: number;
  persentaseKeseluruhan: number;
  guru: { nama: string | null; npy: string | null; hadir: number; totalKegiatan: number; persentaseKehadiran: number }[];
};
type RekapGuruRange = { mode: 'mingguan' | 'bulanan'; tanggalMulai: string; tanggalSelesai: string; guruNama: string | null; rows: { tanggal: string; kegiatanNama: string; hadir: boolean; waktuAbsen: string | null }[]; summary: { hadir: number; totalKegiatan: number; persentaseKehadiran: number } };

const FONT_NAME = 'Satoshi';
const NA_FONT = { name: FONT_NAME, color: { argb: 'FFCBD5E1' }, italic: true };
const LINK_FONT = { name: FONT_NAME, color: { argb: 'FF2563EB' }, underline: true };
const HEADER_FILL = 'FF013920';
const TINT_FILL = 'FFFFF7E4';
const MUTED_ARGB = 'FF64748B';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

function formatTanggalRingkas(tanggal: string): string {
  try {
    return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    });
  } catch {
    return tanggal;
  }
}

function rangeTitle(mode: 'mingguan' | 'bulanan', tanggalMulai: string, tanggalSelesai: string): { title: string; subtitle: string } {
  if (mode === 'bulanan') {
    const bulanTahun = new Date(`${tanggalMulai}T00:00:00`).toLocaleDateString('id-ID', {
      month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    });
    return { title: 'Absensi Bulanan', subtitle: bulanTahun };
  }
  return { title: 'Absensi Mingguan', subtitle: `${formatTanggalRingkas(tanggalMulai)} – ${formatTanggalRingkas(tanggalSelesai)}` };
}

function googleMapsUrl(lokasi?: string | null): string | null {
  if (!lokasi) return null;
  const parts = lokasi.split(',');
  if (parts.length < 2) return null;
  const lat = parts[0].trim();
  const lng = parts[1].trim();
  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

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

function detectImageExtension(buffer: Buffer): 'png' | 'jpeg' | 'gif' | null {
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 6 && buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'gif';
  return null;
}

const FOTO_SIZE = { width: 80, height: 80 };
const TTD_SIZE = { width: 100, height: 50 };
const MAP_SIZE = { width: 120, height: 90 };
const MEDIA_ROW_HEIGHT = 76;

@Injectable()
export class AbsensiHarianExcelService {
  private styleHeaderRow(row: ExcelJS.Row) {
    row.font = { name: FONT_NAME, bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    row.alignment = { vertical: 'middle' };
    row.height = 20;
  }

  private headerRow(ws: ExcelJS.Worksheet) {
    const row = ws.getRow(1);
    this.styleHeaderRow(row);
    return row;
  }

  private titleBand(ws: ExcelJS.Worksheet, colCount: number, title: string, subtitle: string, statsLine: string) {
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: FONT_NAME, bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    titleCell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 26;

    ws.mergeCells(2, 1, 2, colCount);
    const subCell = ws.getCell(2, 1);
    subCell.value = `${subtitle}   ·   ${statsLine}`;
    subCell.font = { name: FONT_NAME, italic: true, size: 10, color: { argb: MUTED_ARGB } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TINT_FILL } };
    subCell.alignment = { vertical: 'middle', indent: 1 };
    ws.getRow(2).height = 20;
  }

  async build(rekap: RekapHarian): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Absensi Guru';
    wb.created = new Date();
    const ws = wb.addWorksheet('Absensi Kegiatan', {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    ws.columns = [
      { header: 'Nama', key: 'nama', width: 26 },
      { header: 'NPY', key: 'npy', width: 18 },
      { header: 'Kegiatan', key: 'kegiatan', width: 22 },
      { header: 'Jam Absen', key: 'waktuAbsen', width: 12 },
      { header: 'Lokasi', key: 'lokasi', width: 32 },
      { header: 'Peta', key: 'peta', width: 18 },
      { header: 'Foto', key: 'foto', width: 13 },
      { header: 'TTD', key: 'ttd', width: 16 },
      { header: 'Catatan Verifikasi', key: 'catatan', width: 34 },
    ];
    this.headerRow(ws);
    const colIndex: Record<string, number> = {};
    ws.columns.forEach((col, i) => { if (col.key) colIndex[col.key] = i; });

    for (const r of rekap.rows) {
      const adminSuffix = r.verifiedByNama ? ` — ${r.verifiedByNama}` : '';
      const catatanText = r.catatan ? `${r.catatan}${adminSuffix}` : r.verified ? `Terverifikasi${adminSuffix}` : '-';
      const row = ws.addRow({
        nama: r.nama || '-',
        npy: r.npy || '-',
        kegiatan: r.kegiatanNama,
        waktuAbsen: r.waktuAbsen,
        lokasi: r.lokasi,
        catatan: catatanText,
      });
      row.alignment = { vertical: 'middle', wrapText: true };
      if (!r.catatan && !r.verified) row.getCell('catatan').font = NA_FONT;

      const url = googleMapsUrl(r.lokasi);
      if (url) {
        const cell = row.getCell('lokasi');
        cell.value = { text: r.lokasi, hyperlink: url };
        cell.font = LINK_FONT;
      }

      const [fotoBuf, mapBuf] = await Promise.all([readFotoBuffer(r.foto), getStaticMapImage(r.lokasi)]);
      const ttdBuf = decodeTtdBuffer(r.ttd);
      const hasImage = [
        this.embedOrClear(wb, ws, row, colIndex.foto, fotoBuf, FOTO_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.ttd, ttdBuf, TTD_SIZE),
        this.embedOrClear(wb, ws, row, colIndex.peta, mapBuf, MAP_SIZE),
      ].some(Boolean);
      if (hasImage) row.height = MEDIA_ROW_HEIGHT;
    }

    if (rekap.rows.length === 0) {
      ws.addRow({ nama: 'Belum ada absensi kegiatan untuk tanggal ini.' });
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async buildGuru(rekap: RekapGuruHarian): Promise<Buffer> {
    return this.build({ tanggal: rekap.tanggal, kegiatan: [], rows: rekap.rows });
  }

  async buildRange(rekap: RekapRange): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Absensi Guru';
    wb.created = new Date();
    const ws = wb.addWorksheet('Rekap Kegiatan', {
      views: [{ state: 'frozen', ySplit: 3 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const colDefs = [
      { key: 'nama', width: 26 },
      { key: 'npy', width: 18 },
      { key: 'hadir', width: 16 },
      { key: 'totalKegiatan', width: 16 },
      { key: 'persentase', width: 20 },
    ];
    ws.columns = colDefs;

    const { title, subtitle } = rangeTitle(rekap.mode, rekap.tanggalMulai, rekap.tanggalSelesai);
    const statsLine = `Total Kegiatan: ${rekap.totalKegiatan}   ·   Kehadiran Keseluruhan: ${rekap.totalHadirKeseluruhan}/${rekap.totalKegiatanKeseluruhan} (${rekap.persentaseKeseluruhan}%)`;
    this.titleBand(ws, colDefs.length, title, subtitle, statsLine);

    ws.getRow(3).values = ['Nama', 'NPY', 'Kegiatan Diikuti', 'Total Kegiatan', 'Kehadiran'];
    this.styleHeaderRow(ws.getRow(3));

    for (const g of rekap.guru) {
      const row = ws.addRow({
        nama: g.nama || '-',
        npy: g.npy || '-',
        hadir: g.hadir,
        totalKegiatan: g.totalKegiatan,
        persentase: `${g.persentaseKehadiran}%`,
      });
      row.alignment = { vertical: 'middle' };
      row.getCell('persentase').font = { name: FONT_NAME, bold: true, color: { argb: g.persentaseKehadiran >= 75 ? 'FF00A34A' : 'FFEF4444' } };
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async buildGuruRange(rekap: RekapGuruRange): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Absensi Guru';
    wb.created = new Date();
    const ws = wb.addWorksheet('Rekap Kegiatan', {
      views: [{ state: 'frozen', ySplit: 3 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const colDefs = [
      { key: 'tanggal', width: 14 },
      { key: 'kegiatan', width: 26 },
      { key: 'status', width: 12 },
      { key: 'waktuAbsen', width: 12 },
    ];
    ws.columns = colDefs;

    const { title, subtitle } = rangeTitle(rekap.mode, rekap.tanggalMulai, rekap.tanggalSelesai);
    const statsLine = `Total Kegiatan: ${rekap.summary.totalKegiatan}   ·   Diikuti: ${rekap.summary.hadir}   ·   Persentase: ${rekap.summary.persentaseKehadiran}%`;
    this.titleBand(ws, colDefs.length, title, `${rekap.guruNama ?? '-'} · ${subtitle}`, statsLine);

    ws.getRow(3).values = ['Tanggal', 'Kegiatan', 'Status', 'Jam Absen'];
    this.styleHeaderRow(ws.getRow(3));

    let lastTanggal: string | null = null;
    for (const r of rekap.rows) {
      if (r.tanggal !== lastTanggal) {
        const sepRow = ws.addRow({ tanggal: formatTanggalRingkas(r.tanggal) });
        ws.mergeCells(sepRow.number, 1, sepRow.number, colDefs.length);
        sepRow.getCell(1).font = { name: FONT_NAME, bold: true, color: { argb: 'FF013920' } };
        sepRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TINT_FILL } };
        sepRow.getCell(1).alignment = { vertical: 'middle', indent: 1 };
        lastTanggal = r.tanggal;
      }
      const row = ws.addRow({
        tanggal: r.tanggal,
        kegiatan: r.kegiatanNama,
        status: r.hadir ? 'Hadir' : 'Tidak Hadir',
        waktuAbsen: r.waktuAbsen || '-',
      });
      row.getCell('status').font = { name: FONT_NAME, bold: true, color: { argb: r.hadir ? 'FF00D67F' : 'FFEF4444' } };
    }

    ws.addRow({});
    const titleRow = ws.addRow({ tanggal: 'RINGKASAN' });
    titleRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FF334155' } };
    ws.addRow({ tanggal: 'Total Kegiatan', kegiatan: String(rekap.summary.totalKegiatan) });
    ws.addRow({ tanggal: 'Kegiatan Diikuti', kegiatan: String(rekap.summary.hadir) });
    const pctRow = ws.addRow({ tanggal: 'Persentase Kehadiran', kegiatan: `${rekap.summary.persentaseKehadiran}%` });
    pctRow.font = { name: FONT_NAME, bold: true, color: { argb: 'FF013920' } };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

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
