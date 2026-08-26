import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

type CatatanExportRow = {
  judul: string;
  catatan: string;
  poin: number | null;
  tanggal: Date;
  dicatatOleh: { nama: string };
};

type SiswaExportRow = {
  nama: string | null;
  nis: string;
  catatanSiswa: CatatanExportRow[];
};

type KelasGroup = {
  kelas: { nama: string };
  siswa: SiswaExportRow[];
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
export class CatatanSiswaExcelService {
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
        { header: 'Judul', key: 'judul', width: 26 },
        { header: 'Catatan', key: 'catatan', width: 45 },
        { header: 'Poin', key: 'poin', width: 10 },
        { header: 'Tanggal', key: 'tanggal', width: 16 },
        { header: 'Dicatat Oleh', key: 'dicatatOleh', width: 22 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6334F4' } };
      headerRow.alignment = { vertical: 'middle' };
      headerRow.height = 20;

      let no = 1;
      for (const s of group.siswa) {
        if (s.catatanSiswa.length === 0) {
          const row = ws.addRow({
            no: no++,
            nama: s.nama || '-',
            nis: s.nis,
            judul: '-',
            catatan: 'Belum ada catatan',
            poin: '-',
            tanggal: '-',
            dicatatOleh: '-',
          });
          row.alignment = { vertical: 'middle', wrapText: true };
          row.getCell('catatan').font = { color: { argb: 'FF94A3B8' } };
          continue;
        }

        s.catatanSiswa.forEach((c, i) => {
          const row = ws.addRow({
            no: i === 0 ? no : '',
            nama: i === 0 ? s.nama || '-' : '',
            nis: i === 0 ? s.nis : '',
            judul: c.judul,
            catatan: c.catatan,
            poin: c.poin ?? '-',
            tanggal: c.tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }),
            dicatatOleh: c.dicatatOleh.nama,
          });
          row.alignment = { vertical: 'middle', wrapText: true };
          if (c.poin) row.getCell('poin').font = { color: { argb: 'FFFF3644' }, bold: true };
        });
        no++;
      }
    }

    if (groups.length === 0) {
      wb.addWorksheet('Catatan Siswa');
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
