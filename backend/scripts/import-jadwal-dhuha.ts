import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { JADWAL_DHUHA } from './data/jadwal-dhuha';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

function coreName(raw: string): string {
  return raw
    .split(',')[0]
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const anchor = process.argv[2];
  if (anchor && !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) throw new Error('Usage: tsx scripts/import-jadwal-dhuha.ts [YYYY-MM-DD tanggal Senin Minggu ke-1]');

  const gurus = await prisma.guru.findMany({ include: { user: { select: { nama: true } } } });
  const byName = new Map<string, string>();
  for (const g of gurus) {
    const key = coreName(g.user.nama);
    if (key) byName.set(key, g.id);
  }

  const rows: { minggu: number; hari: string; guruId: string; kelas: string; mapel: string }[] = [];
  const unmatched = new Set<string>();
  for (const [mingguStr, perHari] of Object.entries(JADWAL_DHUHA)) {
    for (const [hari, entries] of Object.entries(perHari)) {
      for (const [guru, kelas, mapel] of entries) {
        const guruId = byName.get(coreName(guru));
        if (!guruId) {
          unmatched.add(guru);
          continue;
        }
        rows.push({ minggu: Number(mingguStr), hari, guruId, kelas, mapel });
      }
    }
  }

  await prisma.$transaction([
    prisma.jadwalDhuha.deleteMany({}),
    prisma.jadwalDhuha.createMany({ data: rows }),
  ]);

  if (anchor) {
    await prisma.pengaturan.upsert({
      where: { key: 'dhuha_anchor' },
      create: { key: 'dhuha_anchor', value: anchor },
      update: { value: anchor },
    });
  }

  console.log(`Jadwal dhuha tersimpan: ${rows.length} baris`);
  if (anchor) console.log(`Minggu ke-1 dimulai: ${anchor}`);
  if (unmatched.size > 0) {
    console.log(`Nama guru tidak ditemukan di database (${unmatched.size}):`);
    for (const n of [...unmatched].sort()) console.log(`  - ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
