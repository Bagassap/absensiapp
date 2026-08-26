import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';

const SALT_ROUNDS = 10;

// Sama seperti JURUSAN_OPTIONS di frontend/components/data-siswa/shared.ts —
// dijaga tetap sinkron manual (bukan di-share lintas paket) karena keduanya
// kecil & jarang berubah.
const JURUSAN_VALID = [
  'Pengembangan Perangkat Lunak dan Gim',
  'Pengembangan Gim',
  'Rekayasa Perangkat Lunak',
];

const HEADER_ROW = ['No', 'Nama', 'NIS', 'Kelas', 'Jurusan', 'Angkatan', 'Jenis Kelamin'];

export type ImportSiswaRowResult = { baris: number; nama: string; nis?: string; alasan?: string };

@Injectable()
export class ImportSiswaService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Siswa Baru');
    sheet.columns = [
      { width: 5 }, { width: 28 }, { width: 16 }, { width: 18 }, { width: 34 }, { width: 12 }, { width: 14 },
    ];
    const header = sheet.addRow(HEADER_ROW);
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0033FF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.addRow([1, 'Contoh Nama Siswa', '260401999', 'X PPLG 1', JURUSAN_VALID[0], new Date().getFullYear(), 'Laki-laki']);
    sheet.addRow([]);
    const note = sheet.addRow([
      'Catatan: kolom Kelas harus sama persis dengan nama kelas yang sudah dibuat lewat Kelola Kelas. Kolom Jurusan harus salah satu dari: ' +
        JURUSAN_VALID.join(' / ') +
        '. Kolom Jenis Kelamin opsional (Laki-laki/Perempuan). Hapus baris contoh ini sebelum diisi data asli.',
    ]);
    note.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
    sheet.mergeCells(`A${note.number}:G${note.number}`);
    note.getCell(1).alignment = { wrapText: true };

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async importFromBuffer(buffer: Buffer): Promise<{ berhasil: ImportSiswaRowResult[]; gagal: ImportSiswaRowResult[] }> {
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buffer as any);
    } catch {
      throw new BadRequestException('File tidak bisa dibaca — pastikan formatnya .xlsx dan tidak rusak');
    }
    const sheet = wb.worksheets[0];
    if (!sheet) throw new BadRequestException('File Excel tidak punya sheet yang bisa dibaca');

    const kelasList = await this.prisma.kelas.findMany({ select: { id: true, nama: true } });
    const kelasByNama = new Map(kelasList.map((k) => [k.nama.trim().toLowerCase(), k]));

    const berhasil: ImportSiswaRowResult[] = [];
    const gagal: ImportSiswaRowResult[] = [];
    const nisInFile = new Set<string>();

    const rows: { rowNumber: number; nama: string; nis: string; kelasNama: string; jurusan: string; angkatan: string; jenisKelamin: string }[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // header
      const nama = row.getCell(2).text?.trim();
      const nis = row.getCell(3).text?.trim();
      if (!nama && !nis) return; // baris kosong (mis. baris contoh yang dihapus, atau pemisah)
      rows.push({
        rowNumber,
        nama,
        nis,
        kelasNama: row.getCell(4).text?.trim(),
        jurusan: row.getCell(5).text?.trim(),
        angkatan: row.getCell(6).text?.trim(),
        jenisKelamin: row.getCell(7).text?.trim(),
      });
    });

    for (const r of rows) {
      const fail = (alasan: string) => gagal.push({ baris: r.rowNumber, nama: r.nama || '(tanpa nama)', nis: r.nis, alasan });

      if (!r.nama) { fail('Nama kosong'); continue; }
      if (!r.nis) { fail('NIS kosong'); continue; }
      if (!r.kelasNama) { fail('Kelas kosong'); continue; }
      if (!r.jurusan) { fail('Jurusan kosong'); continue; }
      if (!JURUSAN_VALID.includes(r.jurusan)) { fail(`Jurusan "${r.jurusan}" tidak dikenali — harus salah satu dari: ${JURUSAN_VALID.join(', ')}`); continue; }
      const angkatan = parseInt(r.angkatan, 10);
      if (!r.angkatan || Number.isNaN(angkatan)) { fail('Angkatan harus berupa angka (mis. 2026)'); continue; }

      const kelas = kelasByNama.get(r.kelasNama.toLowerCase());
      if (!kelas) { fail(`Kelas "${r.kelasNama}" tidak ditemukan — buat dulu lewat Kelola Kelas`); continue; }

      if (nisInFile.has(r.nis)) { fail(`NIS "${r.nis}" duplikat di dalam file ini`); continue; }

      const existing = await this.prisma.siswa.findUnique({ where: { nis: r.nis } });
      if (existing) { fail(`NIS "${r.nis}" sudah dipakai siswa lain`); continue; }

      nisInFile.add(r.nis);

      try {
        const hashed = await bcrypt.hash(r.nis, SALT_ROUNDS);
        await this.prisma.user.create({
          data: {
            nama: r.nama,
            password: hashed,
            role: Role.SISWA,
            mustChangePassword: true,
            siswa: {
              create: {
                nis: r.nis,
                nama: r.nama,
                kelasId: kelas.id,
                jurusan: r.jurusan,
                angkatan,
                jenisKelamin: r.jenisKelamin || undefined,
              },
            },
          },
        });
        berhasil.push({ baris: r.rowNumber, nama: r.nama, nis: r.nis });
      } catch {
        fail('Gagal menyimpan ke database (kemungkinan NIS bentrok saat proses berjalan)');
      }
    }

    return { berhasil, gagal };
  }
}
