import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { join } from 'path';

type CatatanRow = {
  judul: string;
  catatan: string;
  poin: number | null;
  tanggal: Date;
  dicatatOleh: { nama: string };
};

type SiswaRow = {
  nama: string | null;
  nis: string;
  catatanSiswa: CatatanRow[];
};

type KelasGroup = {
  kelas: { nama: string };
  siswa: SiswaRow[];
};

const BRAND_BLUE = '#0082FB';
const BRAND_BLUE_TINT = '#EAF3FF';
const BRAND_BLUE_BORDER = '#EAF3FF';
const POIN_RED = '#EF4444';

const FONT_REGULAR = join(process.cwd(), 'src', 'assets', 'fonts', 'Satoshi-Regular.ttf');
const FONT_BOLD = join(process.cwd(), 'src', 'assets', 'fonts', 'Satoshi-Bold.ttf');

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont('Satoshi', FONT_REGULAR);
  doc.registerFont('Satoshi-Bold', FONT_BOLD);
  doc.font('Satoshi');
}

function formatTgl(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

@Injectable()
export class CatatanSiswaPdfService {
  async build(groups: KelasGroup[]): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    registerFonts(doc);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const margin = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - margin * 2;

    // Tanggal | Judul | Catatan | Poin | Dicatat Oleh
    const colFrac = [0.13, 0.19, 0.38, 0.1, 0.2];
    const colWidths = colFrac.map((f) => f * contentWidth);
    const headers = ['Tanggal', 'Judul', 'Catatan', 'Poin', 'Dicatat Oleh'];
    const cellPad = 6;

    let y = margin;

    const drawTitle = () => {
      doc.roundedRect(margin, y, contentWidth, 3, 1.5).fill(BRAND_BLUE);
      y += 10;
      doc.font('Satoshi-Bold').fontSize(16).fillColor('#1C2B33').text('Laporan Catatan Siswa', margin, y);
      doc.font('Satoshi').fontSize(9).fillColor('#94a3b8')
        .text(`Dicetak ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' })}`, margin, doc.y + 2);
      y = doc.y + 16;
    };

    const drawTableHeader = () => {
      doc.roundedRect(margin, y, contentWidth, 18, 3).fill(BRAND_BLUE);
      let hx = margin;
      doc.font('Satoshi-Bold');
      headers.forEach((h, i) => {
        doc.fontSize(7.5).fillColor('#ffffff').text(h.toUpperCase(), hx + cellPad, y + 5, { width: colWidths[i] - cellPad * 2 });
        hx += colWidths[i];
      });
      doc.font('Satoshi');
      y += 18;
    };

    const ensureSpace = (needed: number, redrawTableHeader: boolean) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
        if (redrawTableHeader) drawTableHeader();
        return true;
      }
      return false;
    };

    drawTitle();

    if (groups.length === 0) {
      doc.fontSize(11).fillColor('#94a3b8').text('Tidak ada data siswa.', margin, y);
    }

    groups.forEach((group, gi) => {
      ensureSpace(30, false);
      if (gi > 0) y += 8;
      doc.font('Satoshi-Bold').fontSize(13).fillColor('#1C2B33').text(group.kelas.nama, margin, y);
      doc.font('Satoshi');
      y = doc.y + 8;

      if (group.siswa.length === 0) {
        doc.fontSize(9).fillColor('#94a3b8').text('Tidak ada siswa di kelas ini.', margin, y);
        y = doc.y + 6;
        return;
      }

      group.siswa.forEach((s, si) => {
        ensureSpace(40, false);
        if (si > 0) y += 6;

        doc.roundedRect(margin, y, contentWidth, 22, 4).fill(BRAND_BLUE_TINT);
        doc.font('Satoshi-Bold').fontSize(9.5).fillColor(BRAND_BLUE).text(s.nama || '-', margin + cellPad, y + 6, { width: contentWidth * 0.6 });
        doc.font('Satoshi').fontSize(8.5).fillColor(BRAND_BLUE)
          .text(`NIS ${s.nis}  ·  ${s.catatanSiswa.length} catatan`, margin, y + 6.5, { width: contentWidth - cellPad, align: 'right' });
        y += 22 + 4;

        if (s.catatanSiswa.length === 0) {
          doc.fontSize(8.5).fillColor('#94a3b8').text('Belum ada catatan.', margin + cellPad, y);
          y = doc.y + 8;
          return;
        }

        drawTableHeader();

        s.catatanSiswa.forEach((c, ci) => {
          const catatanHeight = doc.font('Satoshi').fontSize(8).heightOfString(c.catatan, { width: colWidths[2] - cellPad * 2 });
          const judulHeight = doc.fontSize(8).heightOfString(c.judul, { width: colWidths[1] - cellPad * 2 });
          const rowH = Math.max(20, catatanHeight + 8, judulHeight + 8);

          if (ensureSpace(rowH, true)) {
            // header row already redrawn by ensureSpace
          }

          if (ci % 2 === 1) doc.rect(margin, y, contentWidth, rowH).fill('#F8FAFC');
          let cx = margin;
          doc.fontSize(8).fillColor('#334155').text(formatTgl(c.tanggal), cx + cellPad, y + 5, { width: colWidths[0] - cellPad * 2 });
          cx += colWidths[0];
          doc.font('Satoshi-Bold').fontSize(8).fillColor('#1C2B33').text(c.judul, cx + cellPad, y + 5, { width: colWidths[1] - cellPad * 2 });
          doc.font('Satoshi');
          cx += colWidths[1];
          doc.fontSize(8).fillColor('#475569').text(c.catatan, cx + cellPad, y + 5, { width: colWidths[2] - cellPad * 2 });
          cx += colWidths[2];
          doc.font('Satoshi-Bold').fontSize(8).fillColor(c.poin ? POIN_RED : '#cbd5e1')
            .text(c.poin != null ? String(c.poin) : '-', cx, y + 5, { width: colWidths[3], align: 'center' });
          doc.font('Satoshi');
          cx += colWidths[3];
          doc.fontSize(8).fillColor('#334155').text(c.dicatatOleh.nama, cx + cellPad, y + 5, { width: colWidths[4] - cellPad * 2 });

          y += rowH;
        });

        doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor(BRAND_BLUE_BORDER).lineWidth(1).stroke();
        y += 10;
      });
    });

    doc.end();
    return done;
  }
}
