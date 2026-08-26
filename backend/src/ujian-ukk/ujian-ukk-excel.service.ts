import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

type SubmisiExportRow = {
  status: 'TERKIRIM' | 'DITERIMA' | 'REVISI';
  fileUrl: string;
  submittedAt: Date;
  soal: { judul: string };
};

type SiswaExportRow = {
  nama: string | null;
  nis: string;
  submisiProjectUkk: SubmisiExportRow[];
};

type KelasGroup = {
  kelas: { nama: string };
  siswa: SiswaExportRow[];
};

const STATUS_LABEL: Record<SubmisiExportRow['status'], string> = {
  DITERIMA: 'Diterima',
  REVISI: 'Perlu Revisi',
  TERKIRIM: 'Menunggu Review',
};

const STATUS_COLOR: Record<SubmisiExportRow['status'], string> = {
  DITERIMA: 'FF00B368',
  REVISI: 'FFD97706',
  TERKIRIM: 'FF4F8EF7',
};

// Excel sheet names can't exceed 31 chars or contain []:*?/\
function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Kelas';
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 28)} (${n})`;
    n++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

@Injectable()
export class UjianUkkExcelService {
  async build(groups: KelasGroup[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'LMS PPLG';
    wb.created = new Date();

    const usedNames = new Set<string>();
    for (const group of groups) {
      const ws = wb.addWorksheet(safeSheetName(group.kelas.nama, usedNames), {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      ws.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Nama', key: 'nama', width: 26 },
        { header: 'NIS', key: 'nis', width: 14 },
        { header: 'Soal', key: 'soal', width: 26 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Link Google Drive', key: 'link', width: 45 },
        { header: 'Waktu Kumpul', key: 'waktu', width: 20 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0033FF' } };
      headerRow.alignment = { vertical: 'middle' };
      headerRow.height = 20;

      let no = 1;
      for (const s of group.siswa) {
        if (s.submisiProjectUkk.length === 0) {
          const row = ws.addRow({
            no: no++,
            nama: s.nama || '-',
            nis: s.nis,
            soal: '-',
            status: 'Belum Mengumpulkan',
            link: '-',
            waktu: '-',
          });
          row.alignment = { vertical: 'middle' };
          row.getCell('status').font = { color: { argb: 'FF94A3B8' }, bold: true };
          continue;
        }

        s.submisiProjectUkk.forEach((sub, i) => {
          const row = ws.addRow({
            no: i === 0 ? no : '',
            nama: i === 0 ? s.nama || '-' : '',
            nis: i === 0 ? s.nis : '',
            soal: sub.soal.judul,
            status: STATUS_LABEL[sub.status],
            link: sub.fileUrl,
            waktu: `${sub.submittedAt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })} WIB`,
          });
          row.alignment = { vertical: 'middle' };
          row.getCell('status').font = { color: { argb: STATUS_COLOR[sub.status] }, bold: true };
          if (sub.fileUrl.startsWith('http')) {
            row.getCell('link').value = { text: sub.fileUrl, hyperlink: sub.fileUrl };
            row.getCell('link').font = { color: { argb: 'FF0033FF' }, underline: true };
          }
        });
        no++;
      }
    }

    if (groups.length === 0) {
      wb.addWorksheet('Rekap Submisi');
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
