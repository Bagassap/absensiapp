import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import { join, normalize } from 'path';

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

const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const FONT_REGULAR = join(process.cwd(), 'src', 'assets', 'fonts', 'Satoshi-Regular.ttf');
const FONT_BOLD = join(process.cwd(), 'src', 'assets', 'fonts', 'Satoshi-Bold.ttf');

const BRAND = '#013920';
const BRAND_TINT = '#FFF7E4';
const INK = '#000000';
const MUTED = '#64748b';

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont('Satoshi', FONT_REGULAR);
  doc.registerFont('Satoshi-Bold', FONT_BOLD);
  doc.font('Satoshi');
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

function formatTanggal(tanggal: string): string {
  try {
    return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    });
  } catch {
    return tanggal;
  }
}

// "2 September 2026" — tanpa nama hari, dipakai untuk judul rentang
// mingguan/bulanan supaya tidak berulang-ulang menyebut hari.
function formatTanggalRingkas(tanggal: string): string {
  try {
    return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    });
  } catch {
    return tanggal;
  }
}

// "ABSENSI MINGGUAN" · "2 September 2026 – 6 September 2026" atau
// "ABSENSI BULANAN" · "September 2026".
function rangeTitle(mode: 'mingguan' | 'bulanan', tanggalMulai: string, tanggalSelesai: string): { title: string; subtitle: string } {
  if (mode === 'bulanan') {
    const bulanTahun = new Date(`${tanggalMulai}T00:00:00`).toLocaleDateString('id-ID', {
      month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    });
    return { title: 'ABSENSI BULANAN', subtitle: bulanTahun };
  }
  return { title: 'ABSENSI MINGGUAN', subtitle: `${formatTanggalRingkas(tanggalMulai)} – ${formatTanggalRingkas(tanggalSelesai)}` };
}

function newDoc() {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, autoFirstPage: false });
  registerFonts(doc);
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

function header(doc: PDFKit.PDFDocument, title: string, subtitle: string, contentWidth: number, margin: number) {
  let y = margin;
  doc.roundedRect(margin, y - 6, contentWidth, 3, 1.5).fill(BRAND);
  y += 8;
  doc.font('Satoshi-Bold').fontSize(9).fillColor(BRAND).text(title, margin, y, { characterSpacing: 0.6 });
  doc.font('Satoshi').fontSize(10).fillColor(MUTED).text(subtitle, margin, y + 16);
  return y + 36;
}

// Kartu ringkasan kecil (label kecil + angka besar) — dipakai untuk pita
// statistik "Total Kegiatan / Kehadiran / Persentase" di laporan rentang
// (mingguan/bulanan) supaya angka pentingnya langsung kelihatan, bukan
// cuma terselip di dalam tabel.
function statBox(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  bg: string, fg: string,
) {
  doc.roundedRect(x, y, w, h, 8).fill(bg);
  doc.font('Satoshi').fontSize(7.5).fillColor(fg).opacity(0.75).text(label.toUpperCase(), x + 10, y + 9, { width: w - 20, characterSpacing: 0.4 });
  doc.opacity(1);
  doc.font('Satoshi-Bold').fontSize(17).fillColor(fg).text(value, x + 10, y + 22, { width: w - 20 });
}

@Injectable()
export class AbsensiHarianPdfService {
  private async renderRowsTable(
    doc: PDFKit.PDFDocument,
    rows: AbsensiRow[],
    startY: number,
    margin: number,
    contentWidth: number,
    includeNama: boolean,
  ) {
    let y = startY;
    const headers = includeNama ? ['Nama', 'Kegiatan', 'Jam', 'Lokasi', 'Foto', 'TTD'] : ['Kegiatan', 'Jam', 'Lokasi', 'Foto', 'TTD'];
    const colFrac = includeNama ? [0.22, 0.2, 0.1, 0.28, 0.1, 0.1] : [0.28, 0.12, 0.35, 0.12, 0.13];
    const colWidths = colFrac.map((f) => f * contentWidth);
    const rowH = 46;
    const thumb = 34;

    const drawHeader = () => {
      doc.roundedRect(margin, y, contentWidth, 18, 3).fill(BRAND);
      let hx = margin;
      doc.font('Satoshi-Bold');
      headers.forEach((h, i) => {
        doc.fontSize(8).fillColor('#ffffff').text(h.toUpperCase(), hx + 6, y + 5, { width: colWidths[i] - 6 });
        hx += colWidths[i];
      });
      doc.font('Satoshi');
      y += 18;
    };
    drawHeader();

    if (rows.length === 0) {
      doc.fontSize(10).fillColor(MUTED).text('Belum ada absensi kegiatan.', margin, y + 8, { width: contentWidth });
      return;
    }

    for (const r of rows) {
      if (y + rowH > doc.page.height - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      let cx = margin;
      const cells = includeNama
        ? [r.nama || '-', r.kegiatanNama, r.waktuAbsen, r.lokasi]
        : [r.kegiatanNama, r.waktuAbsen, r.lokasi];
      const cellStartIdx = includeNama ? 0 : 0;
      doc.fontSize(8.5).fillColor(INK);
      cells.forEach((text, i) => {
        const colI = cellStartIdx + i;
        if (colI === (includeNama ? 3 : 2)) {
          const url = googleMapsUrl(r.lokasi);
          if (url) {
            doc.fillColor('#2563EB').text(text, cx + 4, y + 6, { width: colWidths[colI] - 8, link: url, underline: true });
            doc.fillColor(INK);
          } else {
            doc.text(text, cx + 4, y + 6, { width: colWidths[colI] - 8 });
          }
        } else {
          doc.text(text, cx + 4, y + 6, { width: colWidths[colI] - 8 });
        }
        cx += colWidths[colI];
      });

      const fotoColI = includeNama ? 4 : 3;
      const ttdColI = includeNama ? 5 : 4;
      const fotoX = margin + colWidths.slice(0, fotoColI).reduce((a, b) => a + b, 0);
      const ttdX = margin + colWidths.slice(0, ttdColI).reduce((a, b) => a + b, 0);

      const [fotoBuf] = await Promise.all([readFotoBuffer(r.foto)]);
      const ttdBuf = decodeTtdBuffer(r.ttd);
      if (fotoBuf) {
        try { doc.image(fotoBuf, fotoX + 6, y + 4, { width: thumb, height: thumb, fit: [thumb, thumb] }); } catch { /* skip unreadable image */ }
      }
      if (ttdBuf) {
        try { doc.image(ttdBuf, ttdX + 6, y + 8, { width: thumb + 20, height: thumb - 10, fit: [thumb + 20, thumb - 10] }); } catch { /* skip */ }
      }

      doc.moveTo(margin, y + rowH).lineTo(margin + contentWidth, y + rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += rowH;
    }
  }

  async build(rekap: RekapHarian): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage();
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    let y = header(doc, 'LAPORAN ABSENSI KEGIATAN', formatTanggal(rekap.tanggal), contentWidth, margin);

    if (rekap.kegiatan.length > 0) {
      doc.font('Satoshi-Bold').fontSize(9).fillColor(BRAND).text('KEGIATAN HARI INI', margin, y);
      y += 14;
      for (const k of rekap.kegiatan) {
        doc.roundedRect(margin, y, contentWidth, 20, 4).fill(BRAND_TINT);
        doc.font('Satoshi-Bold').fontSize(9).fillColor(INK).text(k.nama, margin + 8, y + 5, { width: contentWidth * 0.4 });
        doc.font('Satoshi').fontSize(8.5).fillColor(MUTED).text(k.jamLabel, margin + contentWidth * 0.4, y + 5, { width: contentWidth * 0.3 });
        doc.font('Satoshi').fontSize(8.5).fillColor(MUTED).text(`${k.jumlahAbsen}/${k.guruTotal} guru absen`, margin + contentWidth * 0.7, y + 5, { width: contentWidth * 0.3 - 8, align: 'right' });
        y += 24;
      }
      y += 8;
    }

    await this.renderRowsTable(doc, rekap.rows, y, margin, contentWidth, true);
    doc.end();
    return done;
  }

  async buildGuru(rekap: RekapGuruHarian): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage();
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const y = header(doc, 'LAPORAN ABSENSI KEGIATAN', `${rekap.guruNama ?? '-'} · ${formatTanggal(rekap.tanggal)}`, contentWidth, margin);
    await this.renderRowsTable(doc, rekap.rows, y, margin, contentWidth, false);
    doc.end();
    return done;
  }

  async buildRange(rekap: RekapRange): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage();
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const { title, subtitle } = rangeTitle(rekap.mode, rekap.tanggalMulai, rekap.tanggalSelesai);
    let y = header(doc, title, subtitle, contentWidth, margin);

    const boxGap = 10;
    const boxW = (contentWidth - boxGap * 2) / 3;
    const boxH = 46;
    statBox(doc, margin, y, boxW, boxH, 'Total Kegiatan', `${rekap.totalKegiatan}`, BRAND_TINT, BRAND);
    statBox(doc, margin + boxW + boxGap, y, boxW, boxH, 'Total Kehadiran', `${rekap.totalHadirKeseluruhan}/${rekap.totalKegiatanKeseluruhan}`, BRAND_TINT, BRAND);
    statBox(doc, margin + (boxW + boxGap) * 2, y, boxW, boxH, 'Persentase Kehadiran', `${rekap.persentaseKeseluruhan}%`, BRAND, '#ffffff');
    doc.font('Satoshi');
    y += boxH + 16;

    const headers = ['Nama', 'NPY', 'Kegiatan Diikuti', 'Kehadiran'];
    const colFrac = [0.4, 0.22, 0.2, 0.18];
    const colWidths = colFrac.map((f) => f * contentWidth);
    const drawTableHeader = () => {
      doc.roundedRect(margin, y, contentWidth, 18, 3).fill(BRAND);
      let hx = margin;
      doc.font('Satoshi-Bold');
      headers.forEach((h, i) => {
        doc.fontSize(8).fillColor('#ffffff').text(h.toUpperCase(), hx + 6, y + 5, { width: colWidths[i] - 6 });
        hx += colWidths[i];
      });
      doc.font('Satoshi');
      y += 18;
    };
    drawTableHeader();

    rekap.guru.forEach((g, idx) => {
      if (y + 22 > doc.page.height - margin) { doc.addPage(); y = margin; drawTableHeader(); }
      if (idx % 2 === 1) doc.rect(margin, y, contentWidth, 22).fill('#f8fafc');
      let cx = margin;
      doc.fontSize(8.5).fillColor(INK);
      [g.nama || '-', g.npy || '-', `${g.hadir}/${g.totalKegiatan}`].forEach((text, i) => {
        doc.text(text, cx + 6, y + 5, { width: colWidths[i] - 8 });
        cx += colWidths[i];
      });
      doc.font('Satoshi-Bold').fillColor(g.persentaseKehadiran >= 75 ? '#00A34A' : '#EF4444')
        .text(`${g.persentaseKehadiran}%`, cx + 6, y + 5, { width: colWidths[3] - 8 });
      doc.font('Satoshi');
      doc.moveTo(margin, y + 22).lineTo(margin + contentWidth, y + 22).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += 22;
    });

    doc.end();
    return done;
  }

  async buildGuruRange(rekap: RekapGuruRange): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage();
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const { title, subtitle } = rangeTitle(rekap.mode, rekap.tanggalMulai, rekap.tanggalSelesai);
    let y = header(doc, title, `${rekap.guruNama ?? '-'} · ${subtitle}`, contentWidth, margin);

    const boxGap = 10;
    const boxW = (contentWidth - boxGap * 2) / 3;
    const boxH = 46;
    statBox(doc, margin, y, boxW, boxH, 'Total Kegiatan', `${rekap.summary.totalKegiatan}`, BRAND_TINT, BRAND);
    statBox(doc, margin + boxW + boxGap, y, boxW, boxH, 'Diikuti', `${rekap.summary.hadir}`, BRAND_TINT, BRAND);
    statBox(doc, margin + (boxW + boxGap) * 2, y, boxW, boxH, 'Persentase Kehadiran', `${rekap.summary.persentaseKehadiran}%`, BRAND, '#ffffff');
    doc.font('Satoshi');
    y += boxH + 16;

    const headers = ['Tanggal', 'Kegiatan', 'Status', 'Jam Absen'];
    const colFrac = [0.2, 0.4, 0.2, 0.2];
    const colWidths = colFrac.map((f) => f * contentWidth);
    const drawTableHeader = () => {
      doc.roundedRect(margin, y, contentWidth, 18, 3).fill(BRAND);
      let hx = margin;
      doc.font('Satoshi-Bold');
      headers.forEach((h, i) => {
        doc.fontSize(8).fillColor('#ffffff').text(h.toUpperCase(), hx + 6, y + 5, { width: colWidths[i] - 6 });
        hx += colWidths[i];
      });
      doc.font('Satoshi');
      y += 18;
    };
    drawTableHeader();

    for (const r of rekap.rows) {
      if (y + 20 > doc.page.height - margin) { doc.addPage(); y = margin; drawTableHeader(); }
      let cx = margin;
      doc.fontSize(8.5).fillColor(INK);
      [r.tanggal, r.kegiatanNama].forEach((text, i) => {
        doc.text(text, cx + 6, y + 5, { width: colWidths[i] - 8 });
        cx += colWidths[i];
      });
      doc.fillColor(r.hadir ? '#00D67F' : '#EF4444').text(r.hadir ? 'Hadir' : 'Tidak Hadir', cx + 6, y + 5, { width: colWidths[2] - 8 });
      cx += colWidths[2];
      doc.fillColor(INK).text(r.waktuAbsen || '-', cx + 6, y + 5, { width: colWidths[3] - 8 });
      doc.moveTo(margin, y + 20).lineTo(margin + contentWidth, y + 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += 20;
    }

    doc.end();
    return done;
  }
}
