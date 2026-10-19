import 'dotenv/config';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const UPLOADS_ROOT = join(process.cwd(), 'uploads');

function fmtMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
function fmtGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

async function dirStats(dir: string): Promise<{ count: number; bytes: number; mtimes: Date[] }> {
  let count = 0;
  let bytes = 0;
  const mtimes: Date[] = [];
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return { count: 0, bytes: 0, mtimes: [] };
  }
  for (const name of entries) {
    const st = await fs.stat(join(dir, name)).catch(() => null);
    if (!st || !st.isFile()) continue;
    count++;
    bytes += st.size;
    mtimes.push(st.mtime);
  }
  return { count, bytes, mtimes };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('='.repeat(60));
  console.log('LAPORAN STORAGE — ' + new Date().toISOString());
  console.log('='.repeat(60));

  const fsStat = await fs.statfs(UPLOADS_ROOT).catch(() => null);
  let diskTotal = 0;
  let diskFree = 0;
  if (fsStat) {
    diskTotal = fsStat.blocks * fsStat.bsize;
    diskFree = fsStat.bfree * fsStat.bsize;
    console.log(`\nDisk filesystem (tempat folder uploads/ berada):`);
    console.log(`  Total : ${fmtGB(diskTotal)}`);
    console.log(`  Terpakai: ${fmtGB(diskTotal - diskFree)} (${(((diskTotal - diskFree) / diskTotal) * 100).toFixed(2)}%)`);
    console.log(`  Bebas : ${fmtGB(diskFree)}`);
  }

  const subfolders = ['absensi-harian'];
  console.log(`\nFolder uploads/ — breakdown per jenis:`);
  let totalBytes = 0;
  let totalCount = 0;
  const allMtimes: Date[] = [];
  for (const folder of subfolders) {
    const { count, bytes, mtimes } = await dirStats(join(UPLOADS_ROOT, folder));
    if (count === 0 && bytes === 0) {
      console.log(`  ${folder.padEnd(16)} : (folder tidak ada / kosong)`);
      continue;
    }
    console.log(`  ${folder.padEnd(16)} : ${count} file, ${fmtMB(bytes)}`);
    totalBytes += bytes;
    totalCount += count;
    allMtimes.push(...mtimes);
  }
  console.log(`  ${'TOTAL'.padEnd(16)} : ${totalCount} file, ${fmtMB(totalBytes)}`);

  const ttdRows = await prisma.absensiKegiatan.findMany({ select: { ttd: true } });
  let ttdBytes = 0;
  let ttdCount = 0;
  for (const r of ttdRows) {
    if (r.ttd) { ttdBytes += r.ttd.length; ttdCount++; }
  }
  const dbSizeRow = await prisma.$queryRawUnsafe<{ size: string }[]>(
    'SELECT pg_size_pretty(pg_database_size(current_database())) as size',
  );
  console.log(`\nTanda tangan (TTD) — disimpan sebagai base64 di database, BUKAN file di uploads/:`);
  console.log(`  ${ttdCount} tanda tangan, ~${fmtMB(ttdBytes)} di dalam tabel absensi_kegiatan`);
  console.log(`  Ukuran total database saat ini: ${dbSizeRow[0]?.size ?? 'unknown'}`);

  const absensiRows = await prisma.absensiKegiatan.findMany({ select: { foto: true } });
  const referenced = new Set<string>();
  for (const r of absensiRows) {
    if (r.foto) referenced.add(basename(r.foto));
  }
  const harianDir = join(UPLOADS_ROOT, 'absensi-harian');
  const harianFiles = await fs.readdir(harianDir).catch(() => [] as string[]);
  let orphanCount = 0;
  let orphanBytes = 0;
  for (const f of harianFiles) {
    if (referenced.has(f)) continue;
    const st = await fs.stat(join(harianDir, f)).catch(() => null);
    if (!st) continue;
    orphanCount++;
    orphanBytes += st.size;
  }
  console.log(`\nFile "sampah" (tidak direferensikan oleh record absensi manapun):`);
  console.log(`  ${orphanCount} file di uploads/absensi-harian, total ${fmtMB(orphanBytes)}`);
  if (orphanCount > 0) {
    console.log(`  (biasanya sisa upload yang gagal/dibatalkan sebelum submit selesai — aman dihapus manual, tidak dihapus otomatis oleh script ini)`);
  }

  if (allMtimes.length > 3 && diskFree > 0) {
    allMtimes.sort((a, b) => a.getTime() - b.getTime());
    const first = allMtimes[0];
    const last = allMtimes[allMtimes.length - 1];
    const spanDays = Math.max(1, (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    const avgPerDay = totalBytes / spanDays;
    const daysUntilFull = avgPerDay > 0 ? diskFree / avgPerDay : Infinity;
    console.log(`\nProyeksi pertumbuhan (berdasarkan riwayat ${spanDays.toFixed(1)} hari upload):`);
    console.log(`  Rata-rata: ${fmtMB(avgPerDay)}/hari`);
    console.log(`  Estimasi disk penuh dalam: ${Number.isFinite(daysUntilFull) ? Math.round(daysUntilFull) + ' hari (~' + (daysUntilFull / 30).toFixed(1) + ' bulan)' : 'tidak terhingga (tidak ada pertumbuhan terdeteksi)'}`);
  } else {
    console.log(`\nProyeksi pertumbuhan: data historis belum cukup untuk estimasi yang andal.`);
  }

  console.log('\n' + '='.repeat(60));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
