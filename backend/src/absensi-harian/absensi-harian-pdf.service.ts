import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import { join, normalize } from 'path';
import sharp from 'sharp';

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
  status?: 'HADIR' | 'IZIN' | 'ALFA';
  tanggal?: string;
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
  rows: {
    id: string; guruId: string; nama: string | null; npy: string | null;
    kegiatanNama: string; tanggal: string; waktuAbsen: string; lokasi: string;
    foto: string; ttd: string; verified: boolean; verifiedByNama: string | null; catatan: string | null; status: 'HADIR' | 'IZIN';
  }[];
};
type RekapGuruRange = {
  mode: 'mingguan' | 'bulanan'; tanggalMulai: string; tanggalSelesai: string;
  guruNama: string | null; guruNip?: string | null;
  rows: {
    tanggal: string; kegiatanNama: string; hadir: boolean; waktuAbsen: string | null;
    lokasi?: string; foto?: string; ttd?: string; verified?: boolean; verifiedByNama?: string | null; catatan?: string | null;
    status?: 'HADIR' | 'IZIN' | null;
  }[];
  summary: { hadir: number; totalKegiatan: number; persentaseKehadiran: number };
};

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

// File foto absensi asli bisa ratusan KB — kalau di-embed apa adanya ke
// laporan yang isinya ratusan/ribuan baris (rekap "semua guru" mingguan/
// bulanan), ukuran PDF-nya bisa bengkak sampai ratusan MB. Thumbnail kecil
// (JPEG kualitas sedang) tetap menampilkan foto SUNGGUHAN di laporan
// (bukan teks placeholder) dan cukup besar untuk terlihat jelas, tapi
// ukurannya cuma beberapa KB per baris — dipakai di semua varian laporan
// supaya filenya tetap ringan walau ribuan baris.
async function readFotoThumbnail(fotoUrl?: string | null): Promise<Buffer | null> {
  const original = await readFotoBuffer(fotoUrl);
  if (!original) return null;
  try {
    return await sharp(original).rotate().resize(220, 220, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<'HADIR' | 'IZIN' | 'ALFA', string> = { HADIR: 'Hadir', IZIN: 'Izin', ALFA: 'Alfa' };
const STATUS_COLOR: Record<'HADIR' | 'IZIN' | 'ALFA', string> = { HADIR: '#00A34A', IZIN: '#F59E0B', ALFA: '#94A3B8' };
const VERIFIED_COLOR = '#2563EB';

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

@Injectable()
export class AbsensiHarianPdfService {
  // Tabel landscape: Nama (kalau includeNama) - Tanggal - Jam Absen -
  // Kegiatan - Status - Foto - Catatan. Lokasi/TTD sengaja tidak ikut
  // kolom ini (beda dari versi lama). Foto selalu foto sungguhan (pakai
  // thumbnail kecil dari readFotoThumbnail, bukan teks placeholder) — tetap
  // ringan walau laporannya ribuan baris karena ukurannya sudah dikecilkan
  // dulu sebelum di-embed, lihat komentar readFotoThumbnail. Kolom
  // "Catatan": sudah diverifikasi admin → selalu "Terverifikasi" (catatan
  // tertulisnya tidak dipakai di kolom ini kalau sudah diverifikasi);
  // belum diverifikasi tapi admin sempat menulis catatan → tampilkan
  // catatan itu; belum diverifikasi & tidak ada catatan → "-".
  private async renderRowsTable(
    doc: PDFKit.PDFDocument,
    rows: AbsensiRow[],
    startY: number,
    margin: number,
    contentWidth: number,
    includeNama: boolean,
    // true buat laporan rentang (mingguan/bulanan) — baris-barisnya
    // mencakup banyak tanggal sekaligus, jadi tiap kali tanggalnya berganti
    // disisipkan pita pembatas "Senin, 14 September 2026" supaya jelas mana
    // milik hari yang mana. Laporan harian (semua barisnya 1 tanggal yang
    // sama, sudah ada di subjudul header) tidak perlu ini.
    showDateSeparators = false,
  ) {
    let y = startY;
    const headers = includeNama
      ? ['Nama', 'Tanggal', 'Jam Absen', 'Kegiatan', 'Status', 'Foto', 'Catatan']
      : ['Tanggal', 'Jam Absen', 'Kegiatan', 'Status', 'Foto', 'Catatan'];
    const colFrac = includeNama ? [0.16, 0.11, 0.08, 0.18, 0.09, 0.14, 0.24] : [0.13, 0.09, 0.22, 0.1, 0.16, 0.3];
    const colWidths = colFrac.map((f) => f * contentWidth);
    const rowH = 96;
    const thumb = 80;
    const sepH = 22;

    const addLandscapePage = () => doc.addPage({ size: 'A4', layout: 'landscape', margin });

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

    let lastTanggal: string | null = null;
    for (const r of rows) {
      const isNewDate = showDateSeparators && r.tanggal != null && r.tanggal !== lastTanggal;
      const neededHeight = rowH + (isNewDate ? sepH : 0);
      if (y + neededHeight > doc.page.height - margin) {
        addLandscapePage();
        y = margin;
        drawHeader();
      }
      if (isNewDate) {
        doc.roundedRect(margin, y, contentWidth, sepH, 3).fill(BRAND_TINT);
        doc.font('Satoshi-Bold').fontSize(8.5).fillColor(BRAND)
          .text(formatTanggal(r.tanggal!), margin + 8, y + 6, { width: contentWidth - 16 });
        doc.font('Satoshi');
        y += sepH;
        lastTanggal = r.tanggal!;
      }
      const textY = y + (rowH - 11) / 2;
      let cx = margin;
      const tanggalLabel = r.tanggal ? formatTanggalRingkas(r.tanggal) : '-';
      const cells = includeNama
        ? [r.nama || '-', tanggalLabel, r.waktuAbsen, r.kegiatanNama]
        : [tanggalLabel, r.waktuAbsen, r.kegiatanNama];
      doc.font('Satoshi').fontSize(8.5).fillColor(INK);
      cells.forEach((text, i) => {
        doc.text(text, cx + 4, textY, { width: colWidths[i] - 8 });
        cx += colWidths[i];
      });

      const statusColI = includeNama ? 4 : 3;
      const statusX = margin + colWidths.slice(0, statusColI).reduce((a, b) => a + b, 0);
      const status = r.status ?? 'HADIR';
      doc.font('Satoshi-Bold').fontSize(8.5).fillColor(STATUS_COLOR[status])
        .text(STATUS_LABEL[status], statusX + 4, textY, { width: colWidths[statusColI] - 8 });

      const fotoColI = includeNama ? 5 : 4;
      const fotoX = margin + colWidths.slice(0, fotoColI).reduce((a, b) => a + b, 0);
      const fotoBuf = await readFotoThumbnail(r.foto);
      if (fotoBuf) {
        try { doc.image(fotoBuf, fotoX + 6, y + (rowH - thumb) / 2, { width: thumb, height: thumb, fit: [thumb, thumb] }); } catch { /* skip unreadable image */ }
      } else {
        doc.font('Satoshi').fontSize(8.5).fillColor('#cbd5e1').text('-', fotoX + 4, textY, { width: colWidths[fotoColI] - 8 });
      }

      const catatanColI = includeNama ? 6 : 5;
      const catatanX = margin + colWidths.slice(0, catatanColI).reduce((a, b) => a + b, 0);
      // Isi catatan tertulis admin SELALU diutamakan (kalau ada) — jangan
      // ditimpa "Terverifikasi" walau baris ini sudah diverifikasi, karena
      // catatan tertulis (mis. "Salah isi kegiatan") lebih informatif
      // daripada sekadar status verifikasi polos. "Terverifikasi" cuma
      // dipakai sebagai fallback kalau diverifikasi TANPA catatan tertulis.
      const adminSuffix = r.verifiedByNama ? ` — ${r.verifiedByNama}` : '';
      const catatanText = r.catatan ? `${r.catatan}${adminSuffix}` : r.verified ? `Terverifikasi${adminSuffix}` : '-';
      const catatanColor = r.catatan ? INK : r.verified ? VERIFIED_COLOR : '#cbd5e1';
      doc.font(r.verified && !r.catatan ? 'Satoshi-Bold' : 'Satoshi').fontSize(8).fillColor(catatanColor)
        .text(catatanText, catatanX + 4, y + 6, { width: colWidths[catatanColI] - 8, height: rowH - 12, ellipsis: true });
      doc.fillColor(INK);

      doc.moveTo(margin, y + rowH).lineTo(margin + contentWidth, y + rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += rowH;
    }
  }

  async build(rekap: RekapHarian): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
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

    const rowsWithTanggal = rekap.rows.map((r) => ({ ...r, tanggal: rekap.tanggal }));
    await this.renderRowsTable(doc, rowsWithTanggal, y, margin, contentWidth, true);
    doc.end();
    return done;
  }

  async buildGuru(rekap: RekapGuruHarian): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const y = header(doc, 'LAPORAN ABSENSI KEGIATAN', `${rekap.guruNama ?? '-'} · ${formatTanggal(rekap.tanggal)}`, contentWidth, margin);
    const rowsWithTanggal = rekap.rows.map((r) => ({ ...r, tanggal: rekap.tanggal }));
    await this.renderRowsTable(doc, rowsWithTanggal, y, margin, contentWidth, false);
    doc.end();
    return done;
  }

  // Sama seperti build() harian — landscape, tabel per-submission (bukan
  // ringkasan per-guru) — tapi "Alfa" tidak disertakan di sini (lihat
  // komentar di getRekapRangeForExport, rentang panjang bisa membengkak).
  async buildRange(rekap: RekapRange): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const { title, subtitle } = rangeTitle(rekap.mode, rekap.tanggalMulai, rekap.tanggalSelesai);
    const y = header(doc, title, subtitle, contentWidth, margin);

    await this.renderRowsTable(doc, rekap.rows, y, margin, contentWidth, true, true);
    doc.end();
    return done;
  }

  async buildGuruRange(rekap: RekapGuruRange): Promise<Buffer> {
    const { doc, done } = newDoc();
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const { title, subtitle } = rangeTitle(rekap.mode, rekap.tanggalMulai, rekap.tanggalSelesai);
    const y = header(doc, title, `${rekap.guruNama ?? '-'} · ${subtitle}`, contentWidth, margin);

    // Baris "Tidak Hadir" (r.hadir === false) tidak punya foto/catatan sama
    // sekali — disaring dulu (beda dari tabel harian yang menampilkan Alfa)
    // karena di sini "Tidak Hadir" tidak selalu berarti benar-benar alfa
    // (lihat getGuruAbsensiRangeForExport: hanya kegiatan yang relevan buat
    // guru ini yang masuk daftar, jadi baris kosong di sini kurang
    // informatif dibanding ringkasan persentase di atas).
    const rows: AbsensiRow[] = rekap.rows
      .filter((r) => r.hadir)
      .map((r) => ({
        id: `${r.tanggal}-${r.kegiatanNama}`,
        guruId: '',
        nama: null,
        npy: null,
        kegiatanNama: r.kegiatanNama,
        tanggal: r.tanggal,
        waktuAbsen: r.waktuAbsen ?? '-',
        lokasi: r.lokasi ?? '',
        foto: r.foto ?? '',
        ttd: r.ttd ?? '',
        verified: r.verified ?? false,
        verifiedByNama: r.verifiedByNama ?? null,
        catatan: r.catatan ?? null,
        status: r.status ?? 'HADIR',
      }));
    await this.renderRowsTable(doc, rows, y, margin, contentWidth, false, true);
    doc.end();
    return done;
  }
}
