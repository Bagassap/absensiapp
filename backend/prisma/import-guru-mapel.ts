import 'dotenv/config';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// Sumber: frontend/public/mapel.xlsx (kolom No | Nama Guru | Mata Pelajaran).
// Baris tanpa Nama Guru mewarisi guru dari baris terakhir yang punya nama —
// itu sebabnya kolom Nama Guru kosong di baris ke-2+ untuk guru yang sama.
const XLSX_PATH = path.join(__dirname, '../../frontend/public/mapel.xlsx');

// Normalisasi ringan untuk mencocokkan nama guru di xlsx dengan nama user di
// database walau beda tanda baca/spasi (mis. "Bagas Saputra S.Kom" di xlsx
// vs "Bagas Saputra, S.Kom" di database) — tetap exact match, cuma abaikan
// koma & spasi berlebih supaya tidak salah gandeng ke orang lain.
function normalizeName(s: string): string {
  return s.replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_PATH);
  const sheet = wb.worksheets[0];

  const byGuru = new Map<string, Set<string>>();
  let currentNama: string | null = null;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const nama = row.getCell(2).text?.trim();
    const mapel = row.getCell(3).text?.trim();
    if (nama) currentNama = nama;
    if (!currentNama || !mapel) return;
    if (!byGuru.has(currentNama)) byGuru.set(currentNama, new Set());
    byGuru.get(currentNama)!.add(mapel);
  });

  console.log(`Ditemukan ${byGuru.size} guru di mapel.xlsx.\n`);

  const allUsers = await prisma.user.findMany({ include: { guru: true } });

  let totalInserted = 0;
  for (const [nama, mapelSet] of byGuru) {
    let user = await prisma.user.findFirst({ where: { nama }, include: { guru: true } });
    if (!user) {
      const target = normalizeName(nama);
      const matches = allUsers.filter((u) => normalizeName(u.nama) === target);
      if (matches.length === 1) user = matches[0];
      else if (matches.length > 1) {
        console.warn(`! Skip "${nama}": nama ambigu, cocok dengan ${matches.length} user setelah normalisasi.`);
        continue;
      }
    }
    if (!user) {
      console.warn(`! Skip "${nama}": tidak ada user dengan nama ini di database (sudah dicoba tanpa tanda baca juga).`);
      continue;
    }
    if (!user.guru) {
      console.warn(`! Skip "${nama}": user ini tidak punya profil Guru (role: ${user.role}).`);
      continue;
    }
    const guruId = user.guru.id;
    for (const mapel of mapelSet) {
      const result = await prisma.guruMapel.upsert({
        where: { guruId_nama: { guruId, nama: mapel } },
        create: { guruId, nama: mapel },
        update: {},
      });
      totalInserted++;
      void result;
    }
    console.log(`✓ ${nama}: ${mapelSet.size} mapel (${[...mapelSet].join(', ')})`);
  }

  console.log(`\nSelesai. ${totalInserted} baris guru_mapel diproses (upsert, aman dijalankan ulang).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
