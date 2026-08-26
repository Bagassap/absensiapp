import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
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
  byTanggal: Record<string, {
    status: string | null; waktuAbsen: string | null; waktuPulang: string | null;
    foto: string | null; ttd: string | null; lokasi: string | null;
    fotoPulang: string | null; ttdPulang: string | null; lokasiPulang: string | null;
  }>;
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
const STATUS_COLOR: Record<string, string> = {
  HADIR: '#00D67F',
  IZIN: '#0082FB',
  SAKIT: '#8A9E1F',
  ALPA: '#EF4444',
};
const STATUS_BG: Record<string, string> = {
  HADIR: '#E3FBF0',
  IZIN: '#EAF3FF',
  SAKIT: '#F4FFD9',
  ALPA: '#FEE9EA',
};

const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const FONT_REGULAR = join(process.cwd(), 'src', 'assets', 'fonts', 'Satoshi-Regular.ttf');
const FONT_BOLD = join(process.cwd(), 'src', 'assets', 'fonts', 'Satoshi-Bold.ttf');

// App's primary brand blue (sidebar, Pulang status, etc.) — used to give the
// weekly/monthly recap table a matching "menarik" blue identity instead of
// the plain gray chrome the per-day report still uses.
const BRAND_BLUE = '#0082FB';
const BRAND_BLUE_TINT = '#EAF3FF';
const BRAND_BLUE_ROW = '#EAF3FF';
const BRAND_BLUE_BORDER = '#EAF3FF';

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont('Satoshi', FONT_REGULAR);
  doc.registerFont('Satoshi-Bold', FONT_BOLD);
  doc.font('Satoshi');
}

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

function formatTanggalShort(tanggal: string): string {
  try {
    return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Jakarta',
    });
  } catch {
    return tanggal;
  }
}

@Injectable()
export class AbsensiHarianPdfService {
  async build(rekap: RekapKelasData, opts: { title?: string; entityLabel?: string; emptyMessage?: string } = {}): Promise<Buffer> {
    const title = opts.title ?? 'LAPORAN ABSENSI HARIAN';
    const entityLabel = opts.entityLabel ?? 'Kelas';
    const emptyMessage = opts.emptyMessage ?? 'Tidak ada siswa di kelas ini.';

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, autoFirstPage: false });
    registerFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const tglFmt = formatTanggal(rekap.tanggal);
    const kelasNama = rekap.kelas?.nama ?? '-';
    const siswaList = rekap.siswa;

    if (siswaList.length === 0) {
      doc.addPage();
      doc.fontSize(14).fillColor('#64748b').text(emptyMessage, 40, 40);
    } else {
      for (let i = 0; i < siswaList.length; i++) {
        doc.addPage();
        await this.renderPage(doc, siswaList[i], kelasNama, tglFmt, i, siswaList.length, title, entityLabel);
      }
    }

    doc.end();
    return done;
  }

  // Weekly/monthly recap: still one page per student, but instead of the
  // full-size per-day foto/TTD/map dokumentasi block (which would mean dozens
  // of large images per student for a month), each page shows a summary + a
  // Tanggal/Status/Waktu/Selfie/TTD/GPS table for every effective school day
  // in the range, with the Selfie/TTD photos embedded as small thumbnails
  // (GPS stays a Maps link — a thumbnail per row for that too would be too
  // much). A month tops out around ~23 rows, which comfortably fits one A4
  // page alongside the header/summary — no pagination-within-student.
  async buildRange(rekap: RekapRangeData, opts: { entityLabel?: string; emptyMessage?: string } = {}): Promise<Buffer> {
    const entityLabel = opts.entityLabel ?? 'Kelas';
    const emptyMessage = opts.emptyMessage ?? 'Tidak ada siswa di kelas ini.';

    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, autoFirstPage: false });
    registerFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const kelasNama = rekap.kelas?.nama ?? '-';
    const periodeLabel = `${formatTanggal(rekap.tanggalMulai)} – ${formatTanggal(rekap.tanggalSelesai)}`;

    if (rekap.siswa.length === 0) {
      doc.addPage();
      doc.fontSize(14).fillColor('#64748b').text(emptyMessage, 40, 40);
    } else {
      for (let i = 0; i < rekap.siswa.length; i++) {
        doc.addPage();
        await this.renderRangePage(doc, rekap.siswa[i], kelasNama, periodeLabel, rekap.tanggalList, i, rekap.siswa.length, entityLabel);
      }
    }

    doc.end();
    return done;
  }

  private async renderRangePage(
    doc: PDFKit.PDFDocument,
    s: RangeSiswaRow,
    kelasNama: string,
    periodeLabel: string,
    tanggalList: string[],
    idx: number,
    total: number,
    entityLabel: string,
  ) {
    const margin = 40;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    doc.roundedRect(margin, y - 6, contentWidth, 3, 1.5).fill(BRAND_BLUE);
    y += 8;
    doc.font('Satoshi-Bold').fontSize(9).fillColor(BRAND_BLUE).text('LAPORAN REKAP ABSENSI', margin, y, { characterSpacing: 0.6 });
    doc.font('Satoshi-Bold').fontSize(9).fillColor(BRAND_BLUE).text(`${idx + 1} / ${total}`, margin, y, { width: contentWidth, align: 'right' });
    doc.font('Satoshi');
    y += 20;

    doc.font('Satoshi-Bold').fontSize(20).fillColor('#1C2B33').text(s.nama || '-', margin, y, { width: contentWidth });
    doc.font('Satoshi');
    y = doc.y + 4;
    doc.fontSize(11).fillColor('#64748b').text(`NIS: ${s.nis ?? '-'}   ·   ${entityLabel}: ${kelasNama}`, margin, y, { width: contentWidth });
    y = doc.y + 2;
    doc.fontSize(11).fillColor('#64748b').text(`Periode: ${periodeLabel}`, margin, y, { width: contentWidth });
    y = doc.y + 12;

    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor(BRAND_BLUE_BORDER).lineWidth(1).stroke();
    y += 14;

    const summary = s.summary;
    const badges: { label: string; count: number; clr: string; bg: string }[] = [
      { label: 'Hadir', count: summary.HADIR, clr: STATUS_COLOR.HADIR, bg: STATUS_BG.HADIR },
      { label: 'Izin', count: summary.IZIN, clr: STATUS_COLOR.IZIN, bg: STATUS_BG.IZIN },
      { label: 'Sakit', count: summary.SAKIT, clr: STATUS_COLOR.SAKIT, bg: STATUS_BG.SAKIT },
      { label: 'Alpa', count: summary.ALPA, clr: STATUS_COLOR.ALPA, bg: STATUS_BG.ALPA },
    ];
    const pctW = 130;
    const badgeGap = 8;
    const badgeW = (contentWidth - pctW - badgeGap - badgeGap * badges.length) / badges.length;
    let bx = margin;
    badges.forEach((b) => {
      doc.roundedRect(bx, y, badgeW, 34, 6).fill(b.bg);
      doc.font('Satoshi-Bold').fontSize(14).fillColor(b.clr).text(String(b.count), bx, y + 5, { width: badgeW, align: 'center' });
      doc.font('Satoshi').fontSize(7).fillColor(b.clr).text(b.label.toUpperCase(), bx, y + 21, { width: badgeW, align: 'center' });
      bx += badgeW + badgeGap;
    });
    doc.roundedRect(margin + contentWidth - pctW, y, pctW, 34, 6).fill(BRAND_BLUE_TINT);
    doc.font('Satoshi-Bold').fontSize(14).fillColor(BRAND_BLUE).text(`${summary.persentaseKehadiran}%`, margin + contentWidth - pctW, y + 5, { width: pctW, align: 'center' });
    doc.font('Satoshi').fontSize(7).fillColor(BRAND_BLUE).text('PERSENTASE HADIR', margin + contentWidth - pctW, y + 21, { width: pctW, align: 'center' });
    y += 34 + 6;
    doc.fontSize(7).fillColor('#94a3b8').text(`Total hari efektif: ${summary.totalHariEfektif}`, margin, y);
    y += 16;

    // Small thumbnails need real vertical room per row — rowH=22 leaves
    // enough headroom that even a full month (~23 effective weekdays) still
    // fits comfortably above the footer (measured against the ~560pt left
    // after the header/summary block above).
    const colFrac = [0.19, 0.11, 0.135, 0.135, 0.13, 0.13, 0.14];
    const colWidths = colFrac.map((f) => f * contentWidth);
    const headers = ['Tanggal', 'Status', 'Waktu Hadir', 'Waktu Pulang', 'Selfie', 'TTD', 'GPS'];
    const rowH = 22;
    const thumb = 16;

    const rowMedia = await Promise.all(
      tanggalList.map(async (tgl) => {
        const rec = s.byTanggal[tgl];
        const fotoBuf = await readFotoBuffer(rec?.foto || rec?.fotoPulang);
        const ttdBuf = decodeTtdBuffer(rec?.ttd || rec?.ttdPulang);
        return { fotoBuf, ttdBuf };
      }),
    );

    doc.roundedRect(margin, y, contentWidth, 17, 3).fill(BRAND_BLUE);
    let hx = margin;
    doc.font('Satoshi-Bold');
    headers.forEach((h, i) => {
      doc.fontSize(7.5).fillColor('#ffffff').text(h.toUpperCase(), hx + 6, y + 5, { width: colWidths[i] - 6, align: i === 0 ? 'left' : 'center' });
      hx += colWidths[i];
    });
    doc.font('Satoshi');
    y += 17;

    if (tanggalList.length === 0) {
      doc.fontSize(9).fillColor('#94a3b8').text('Tidak ada hari efektif pada periode ini.', margin, y + 6, { width: contentWidth });
      y += rowH;
    }

    tanggalList.forEach((tgl, i) => {
      const rec = s.byTanggal[tgl];
      const status = rec?.status;
      const label = status ? (STATUS_LABEL[status] ?? status) : '-';
      const clr = status ? (STATUS_COLOR[status] ?? '#64748b') : '#94a3b8';
      const { fotoBuf, ttdBuf } = rowMedia[i];
      const gpsUrl = googleMapsUrl(rec?.lokasi) ?? googleMapsUrl(rec?.lokasiPulang);
      const rowTop = y;
      const rowMidY = rowTop + (rowH - 9) / 2;
      if (i % 2 === 1) doc.rect(margin, y, contentWidth, rowH).fill(BRAND_BLUE_ROW);
      let cx = margin;
      doc.fontSize(8).fillColor('#334155').text(formatTanggalShort(tgl), cx + 6, rowMidY, { width: colWidths[0] - 6 });
      cx += colWidths[0];
      doc.font('Satoshi-Bold').fontSize(8).fillColor(clr).text(label, cx, rowMidY, { width: colWidths[1], align: 'center' });
      doc.font('Satoshi');
      cx += colWidths[1];
      doc.fontSize(8).fillColor('#334155').text(rec?.waktuAbsen || '-', cx, rowMidY, { width: colWidths[2], align: 'center' });
      cx += colWidths[2];
      doc.fontSize(8).fillColor('#334155').text(rec?.waktuPulang || '-', cx, rowMidY, { width: colWidths[3], align: 'center' });
      cx += colWidths[3];

      // Selfie thumbnail — centered in its column/row; falls back to a dash
      // both when there's no photo at all and when the file exists but can't
      // be decoded (corrupt/unsupported format), same defensive pattern as
      // drawMediaBox() below for the per-day report.
      const fotoX = cx + (colWidths[4] - thumb) / 2;
      const thumbY = rowTop + (rowH - thumb) / 2;
      if (fotoBuf) {
        try {
          doc.image(fotoBuf, fotoX, thumbY, { fit: [thumb, thumb], align: 'center', valign: 'center' });
        } catch {
          doc.fontSize(8).fillColor('#cbd5e1').text('-', cx, rowMidY, { width: colWidths[4], align: 'center' });
        }
      } else {
        doc.fontSize(8).fillColor('#cbd5e1').text('-', cx, rowMidY, { width: colWidths[4], align: 'center' });
      }
      cx += colWidths[4];

      // TTD thumbnail — small white backing box since signatures are drawn
      // on a transparent/white canvas and would be hard to read directly on
      // the alternating light-blue row tint.
      const ttdX = cx + (colWidths[5] - thumb) / 2;
      if (ttdBuf) {
        try {
          doc.rect(ttdX - 1, thumbY - 1, thumb + 2, thumb + 2).fill('#ffffff');
          doc.image(ttdBuf, ttdX, thumbY, { fit: [thumb, thumb], align: 'center', valign: 'center' });
        } catch {
          doc.fontSize(8).fillColor('#cbd5e1').text('-', cx, rowMidY, { width: colWidths[5], align: 'center' });
        }
      } else {
        doc.fontSize(8).fillColor('#cbd5e1').text('-', cx, rowMidY, { width: colWidths[5], align: 'center' });
      }
      cx += colWidths[5];

      doc.fontSize(8).fillColor(gpsUrl ? BRAND_BLUE : '#cbd5e1')
        .text(gpsUrl ? 'Lihat' : '-', cx, rowMidY, { width: colWidths[6], align: 'center', underline: !!gpsUrl, link: gpsUrl ?? undefined });
      y += rowH;
    });

    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor(BRAND_BLUE_BORDER).lineWidth(1).stroke();

    doc
      .fontSize(7)
      .fillColor('#cbd5e1')
      .text(`Dicetak ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, margin, doc.page.maxY() - 14, {
        width: contentWidth,
        align: 'center',
        height: 14,
        lineBreak: false,
      });
  }

  private async renderPage(
    doc: PDFKit.PDFDocument,
    s: SiswaRekap,
    kelasNama: string,
    tglFmt: string,
    idx: number,
    total: number,
    title: string,
    entityLabel: string,
  ) {
    const margin = 40;
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    doc.font('Satoshi-Bold').fontSize(9).fillColor('#94a3b8').text(title, margin, y, { characterSpacing: 0.6 });
    doc.fontSize(9).fillColor('#94a3b8').text(`${idx + 1} / ${total}`, margin, y, { width: contentWidth, align: 'right' });
    doc.font('Satoshi');
    y += 20;

    doc.font('Satoshi-Bold').fontSize(20).fillColor('#1C2B33').text(s.nama || '-', margin, y, { width: contentWidth });
    doc.font('Satoshi');
    y = doc.y + 4;
    doc.fontSize(11).fillColor('#64748b').text(`NIS: ${s.nis ?? '-'}   ·   ${entityLabel}: ${kelasNama}`, margin, y, { width: contentWidth });
    y = doc.y + 2;
    doc.fontSize(11).fillColor('#64748b').text(`Tanggal: ${tglFmt}`, margin, y, { width: contentWidth });
    y = doc.y + 12;

    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 16;

    const status = s.status ?? 'ALPA';
    const label = STATUS_LABEL[status] ?? status;
    const clr = STATUS_COLOR[status] ?? '#64748b';
    const bg = STATUS_BG[status] ?? '#F1F5F8';
    doc.roundedRect(margin, y, 110, 26, 6).fill(bg);
    doc.font('Satoshi-Bold').fontSize(12).fillColor(clr).text(label, margin, y + 7, { width: 110, align: 'center' });
    doc.font('Satoshi');
    y += 40;

    const hasAnyData = !!(
      s.status ||
      s.waktuAbsen ||
      s.waktuPulang ||
      s.foto ||
      s.fotoPulang ||
      s.ttd ||
      s.ttdPulang ||
      s.catatan ||
      s.catatanPulang
    );
    if (!hasAnyData) {
      doc.fontSize(11).fillColor('#94a3b8').text('Tidak ada data absensi untuk tanggal ini.', margin, y, { width: contentWidth });
      y = doc.y + 16;
    }

    const rowH = 34;
    const colW = contentWidth / 2;

    doc.fillColor('#94a3b8').fontSize(8).text('WAKTU HADIR', margin, y, { width: colW - 10 });
    doc.fillColor('#94a3b8').fontSize(8).text('WAKTU PULANG', margin + colW, y, { width: colW - 10 });
    doc.fillColor('#334155').fontSize(10).text(s.waktuAbsen || '-', margin, y + 11, { width: colW - 10 });
    doc.fillColor('#334155').fontSize(10).text(s.waktuPulang || '-', margin + colW, y + 11, { width: colW - 10 });
    y += rowH;

    const lokasiUrl = googleMapsUrl(s.lokasi);
    const lokasiPulangUrl = googleMapsUrl(s.lokasiPulang);
    // Map thumbnails are best-effort — getStaticMapImage() never throws and
    // resolves to null on any failure (invalid coords, network error,
    // timeout), so a slow/unreachable tile server can never block PDF
    // generation. The lokasi text + Google Maps link above always render
    // regardless of whether the thumbnail comes back.
    const [mapBuf, mapPulangBuf] = await Promise.all([
      getStaticMapImage(s.lokasi),
      getStaticMapImage(s.lokasiPulang),
    ]);
    doc.fillColor('#94a3b8').fontSize(8).text('LOKASI HADIR', margin, y, { width: colW - 10 });
    doc.fillColor('#94a3b8').fontSize(8).text('LOKASI PULANG', margin + colW, y, { width: colW - 10 });
    doc
      .fillColor(lokasiUrl ? '#0064E0' : '#334155')
      .fontSize(10)
      .text(s.lokasi || '-', margin, y + 11, {
        width: colW - 10,
        underline: !!lokasiUrl,
        link: lokasiUrl ?? undefined,
      });
    doc
      .fillColor(lokasiPulangUrl ? '#0064E0' : '#334155')
      .fontSize(10)
      .text(s.lokasiPulang || '-', margin + colW, y + 11, {
        width: colW - 10,
        underline: !!lokasiPulangUrl,
        link: lokasiPulangUrl ?? undefined,
      });

    const mapY = y + 27;
    const mapW = 110;
    const mapH = 82.5;
    if (mapBuf) {
      try { doc.image(mapBuf, margin, mapY, { width: mapW, height: mapH }); } catch { /* corrupt/unreadable — skip, text+link above already cover it */ }
    }
    if (mapPulangBuf) {
      try { doc.image(mapPulangBuf, margin + colW, mapY, { width: mapW, height: mapH }); } catch { /* same */ }
    }
    y = (mapBuf || mapPulangBuf) ? mapY + mapH + 10 : y + rowH;

    if (s.catatan || s.catatanPulang) {
      doc.fillColor('#94a3b8').fontSize(8).text('CATATAN', margin, y, { width: contentWidth });
      y += 11;
      const catatanText = [s.catatan, s.catatanPulang].filter(Boolean).join('  |  ');
      doc.fillColor('#334155').fontSize(10).text(catatanText, margin, y, {
        width: contentWidth,
        height: 40,
        ellipsis: true,
      });
      y += 40 + 14;
    }

    y += 6;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 16;

    doc.font('Satoshi-Bold').fontSize(11).fillColor('#1C2B33').text('Dokumentasi', margin, y);
    doc.font('Satoshi');
    y = doc.y + 10;

    const gap = 12;
    const boxW = (contentWidth - gap) / 2;
    const boxH = 170;

    const [fotoBuf, fotoPulangBuf] = await Promise.all([readFotoBuffer(s.foto), readFotoBuffer(s.fotoPulang)]);
    const ttdBuf = decodeTtdBuffer(s.ttd);
    const ttdPulangBuf = decodeTtdBuffer(s.ttdPulang);

    this.drawMediaBox(doc, margin, y, boxW, boxH, 'Foto Hadir', fotoBuf, 'Foto tidak tersedia');
    this.drawMediaBox(doc, margin + boxW + gap, y, boxW, boxH, 'Foto Pulang', fotoPulangBuf, 'Foto tidak tersedia');
    y += boxH + gap;

    const ttdBoxH = 120;
    this.drawMediaBox(doc, margin, y, boxW, ttdBoxH, 'Tanda Tangan Hadir', ttdBuf, 'TTD tidak tersedia', true);
    this.drawMediaBox(doc, margin + boxW + gap, y, boxW, ttdBoxH, 'Tanda Tangan Pulang', ttdPulangBuf, 'TTD tidak tersedia', true);

    doc
      .fontSize(7)
      .fillColor('#cbd5e1')
      .text(`Dicetak ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, margin, doc.page.maxY() - 14, {
        width: contentWidth,
        align: 'center',
        height: 14,
        lineBreak: false,
      });
  }

  private drawMediaBox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    buffer: Buffer | null,
    placeholder: string,
    whiteBg = false,
  ) {
    doc.roundedRect(x, y, w, h, 8).fillAndStroke(whiteBg ? '#ffffff' : '#f8fafc', '#e2e8f0');
    doc.fontSize(8).fillColor('#94a3b8').text(label.toUpperCase(), x + 10, y + 8, { width: w - 20 });

    const imgTop = y + 22;
    const imgH = h - 30;
    if (buffer) {
      try {
        doc.image(buffer, x + 10, imgTop, { fit: [w - 20, imgH], align: 'center', valign: 'center' });
        return;
      } catch {
        // fall through to placeholder — unreadable/corrupt/unsupported image
      }
    }
    doc.fontSize(9).fillColor('#cbd5e1').text(placeholder, x + 10, y + h / 2 - 5, { width: w - 20, align: 'center' });
  }
}
