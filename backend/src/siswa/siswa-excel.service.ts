import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

type SiswaExportRow = {
  nama: string | null;
  nis: string;
  jenisKelamin: string | null;
  tempatLahir: string | null;
  tanggalLahir: Date | null;
  noHp: string | null;
  namaOrtu: string | null;
  dukuh: string | null;
  rt: string | null;
  rw: string | null;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  user: { mustChangePassword: boolean } | null;
};

type KelasGroup = {
  kelas: { nama: string };
  siswa: SiswaExportRow[];
};

function formatTanggalLahir(tempatLahir: string | null, tanggalLahir: Date | null): string {
  const tgl = tanggalLahir
    ? tanggalLahir.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })
    : null;
  if (tempatLahir && tgl) return `${tempatLahir}, ${tgl}`;
  return tempatLahir || tgl || '-';
}

function formatAlamat(s: SiswaExportRow): string {
  const parts: string[] = [];
  if (s.dukuh) parts.push(`Dukuh ${s.dukuh}`);
  if (s.rt || s.rw) parts.push(`RT ${s.rt || '-'}/RW ${s.rw || '-'}`);
  if (s.desa) parts.push(`Desa ${s.desa}`);
  if (s.kecamatan) parts.push(`Kecamatan ${s.kecamatan}`);
  if (s.kabupaten) parts.push(`Kabupaten ${s.kabupaten}`);
  return parts.length > 0 ? parts.join(', ') : '-';
}

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
export class SiswaExcelService {
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
        { header: 'Jenis Kelamin', key: 'jk', width: 14 },
        { header: 'Tempat & Tgl Lahir', key: 'ttl', width: 26 },
        { header: 'No. HP', key: 'nohp', width: 16 },
        { header: 'Nama Wali Murid', key: 'wali', width: 26 },
        { header: 'Alamat Lengkap', key: 'alamat', width: 55 },
        { header: 'Status Akun', key: 'status', width: 16 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6334F4' } };
      headerRow.alignment = { vertical: 'middle' };
      headerRow.height = 20;

      group.siswa.forEach((s, i) => {
        const row = ws.addRow({
          no: i + 1,
          nama: s.nama || '-',
          nis: s.nis,
          jk: s.jenisKelamin || '-',
          ttl: formatTanggalLahir(s.tempatLahir, s.tanggalLahir),
          nohp: s.noHp || '-',
          wali: s.namaOrtu || '-',
          alamat: formatAlamat(s),
          status: s.user?.mustChangePassword === false ? 'Sudah ganti password' : 'Belum ganti password',
        });
        // wrapText: true - alamat lengkap kadang lebih panjang dari lebar
        // kolomnya; tanpa wrap, Excel akan menampilkannya seolah terpotong
        // di batas kolom (datanya sendiri sebenarnya utuh di dalam sel).
        row.alignment = { vertical: 'middle', wrapText: true };
        const statusCell = row.getCell('status');
        statusCell.font = {
          color: { argb: s.user?.mustChangePassword === false ? 'FF00B368' : 'FFD97706' },
          bold: true,
        };
      });
    }

    if (groups.length === 0) {
      wb.addWorksheet('Data Siswa');
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
