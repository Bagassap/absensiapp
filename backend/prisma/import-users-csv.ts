import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const SALT_ROUNDS = 10;

type Row = {
  nis: string;
  password: string;
  nama: string;
  kelas: string;
  role: 'SISWA' | 'GURU' | 'ADMIN';
  waliKelas: string | null;
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

const VALID_ROLES: Row['role'][] = ['SISWA', 'GURU', 'ADMIN'];

// Mapping eksplisit nama admin (di-strip gelar, lowercase) → loginId unik + mustChangePassword.
// Semua admin di CSV berbagi NIS "111111" (kolom NIS = kode akun bersama, bukan identitas unik),
// jadi loginId tidak bisa diturunkan dari NIS — mapping ini di-keyed by nama sebagai gantinya.
// Tambahkan entri baru di sini kalau ada admin baru yang perlu loginId unik.
const ADMIN_LOGIN_OVERRIDES: Record<string, { loginId: string; mustChangePassword: boolean }> = {
  'bagas saputra': { loginId: '02082021080', mustChangePassword: false }, // superadmin
  'wahyu hidayat': { loginId: '19082013040', mustChangePassword: true },
  'muhammad syukron': { loginId: '13072015051', mustChangePassword: true },
};

function parseCSV(content: string): Row[] {
  const lines = content.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() !== '');
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1; 
    const [nis, password, nama, kelas, role, waliKelas] = parseCSVLine(lines[i]);
    if (!nis || !nama || !role) {
      console.error(`  ! Skip baris ${lineNo}: kolom NIS/Nama/Role kosong`);
      continue;
    }
    if (!VALID_ROLES.includes(role as Row['role'])) {
      console.error(`  ! Skip baris ${lineNo} (${nama}): role "${role}" tidak valid (harus SISWA/GURU/ADMIN)`);
      continue;
    }
    if (!password || !password.trim()) {
      console.error(`  ! Skip baris ${lineNo} (${nama}): kolom Password kosong`);
      continue;
    }
    rows.push({
      nis,
      password,
      nama,
      kelas: kelas || '',
      role: role as Row['role'],
      waliKelas: waliKelas ? waliKelas.trim() : null,
    });
  }
  return rows;
}

function stripGelar(nama: string): string {
  return nama.split(',')[0].trim();
}

function kelasToJurusan(kelas: string): string {
  if (kelas.includes('PG')) return 'Pengembangan Gim';
  if (kelas.includes('RPL')) return 'Rekayasa Perangkat Lunak';
  return 'Pengembangan Perangkat Lunak dan Gim';
}

function kelasToAngkatan(kelas: string): number {
  const currentYear = new Date().getFullYear();
  if (kelas.startsWith('X ')) return currentYear;
  if (kelas.startsWith('XI ')) return currentYear - 1;
  return currentYear - 2;
}

async function confirmWipe() {
  const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');
  if (confirmed) return;

  const [userCount, siswaCount, guruCount, kelasCount] = await Promise.all([
    prisma.user.count(),
    prisma.siswa.count(),
    prisma.guru.count(),
    prisma.kelas.count(),
  ]);

  if (userCount === 0 && siswaCount === 0 && guruCount === 0 && kelasCount === 0) {
    return; 
  }

  console.error('!! DATABASE TIDAK KOSONG — script ini akan MENGHAPUS SEMUANYA:');
  console.error(`!!   ${userCount} user, ${siswaCount} siswa, ${guruCount} guru, ${kelasCount} kelas`);
  console.error('!!   (plus seluruh pengumuman, absensi, data UKK, dan data magang terkait)');
  console.error('!! Jalankan ulang dengan flag --yes kalau ini memang yang kamu maksud:');
  console.error('!!   npm run seed:users -- --yes');
  process.exit(1);
}

const WIPE_ORDER = [
  'komentarPengumuman',
  'pengumuman',
  'diskusiUKK',
  'submisiProjectUKK',
  'berkasJawabanUKK',
  'soalTahapanUKK',
  'soalUKK',
  'nilaiUKK',
  'pesertaUKK',
  'tahapanUKK',
  'absensiUjianUKK',
  'jadwalUjianUKK',
  'absensiHarian',
  'absensiMagang',
  'izinMagang',
  'penempatanMagang',
  'tempatMagang',
  'siswa',
  'kelas',
  'guru',
  'user',
] as const satisfies readonly (keyof PrismaClient)[];

function assertWipeDelegatesExist() {
  const missing = WIPE_ORDER.filter(
    (name) => typeof (prisma[name] as { deleteMany?: unknown } | undefined)?.deleteMany !== 'function',
  );
  if (missing.length > 0) {
    console.error('!! Prisma Client tidak punya delegate untuk model berikut (client kemungkinan stale):');
    console.error(`!!   ${missing.join(', ')}`);
    console.error('!! Jalankan `rm -rf generated/prisma && npx prisma generate` lalu coba lagi.');
    process.exit(1);
  }
}

async function wipeAll() {
  assertWipeDelegatesExist();
  console.log('── Menghapus seluruh data lama (User/Siswa/Guru/Kelas + relasi)...');
  await prisma.komentarPengumuman.deleteMany();
  await prisma.pengumuman.deleteMany();
  await prisma.diskusiUKK.deleteMany();
  await prisma.submisiProjectUKK.deleteMany();
  await prisma.berkasJawabanUKK.deleteMany();
  await prisma.soalTahapanUKK.deleteMany();
  await prisma.soalUKK.deleteMany();
  await prisma.nilaiUKK.deleteMany();
  await prisma.pesertaUKK.deleteMany();
  await prisma.tahapanUKK.deleteMany();
  await prisma.absensiUjianUKK.deleteMany();
  await prisma.jadwalUjianUKK.deleteMany();
  await prisma.absensiHarian.deleteMany();
  await prisma.absensiMagang.deleteMany();
  await prisma.izinMagang.deleteMany();
  await prisma.penempatanMagang.deleteMany();
  await prisma.tempatMagang.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.guru.deleteMany();
  await prisma.user.deleteMany();
  console.log('   Selesai menghapus data lama.\n');
}

async function main() {
  const csvPath = path.join(__dirname, '../csv/data user.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);

  const siswaRows = rows.filter((r) => r.role === 'SISWA');
  const guruRows = rows.filter((r) => r.role === 'GURU');
  const adminRows = rows.filter((r) => r.role === 'ADMIN');

  console.log(`Parsed dari CSV: ${siswaRows.length} siswa, ${guruRows.length} guru, ${adminRows.length} admin\n`);

  await confirmWipe();
  await wipeAll();

  console.log('── Import Guru...');
  const guruByNama = new Map<string, { userId: string; guruId: string }>();
  let guruCount = 0;
  let guruSkipped = 0;

  for (const row of guruRows) {
    try {
      const hashed = await bcrypt.hash(row.password, SALT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          nama: row.nama,
          loginId: row.nis,
          password: hashed,
          role: Role.GURU,
          mustChangePassword: true,
          guru: { create: {} },
        },
        include: { guru: true },
      });
      guruByNama.set(stripGelar(row.nama).toLowerCase(), { userId: user.id, guruId: user.guru!.id });
      guruCount++;
      console.log(`  + Guru: ${row.nama} → login: ${row.nis}`);
    } catch (err) {
      console.error(`  ! Skip guru ${row.nis} (${row.nama}): ${String(err)}`);
      guruSkipped++;
    }
  }

  console.log('\n── Import Admin...');
  let adminCount = 0;
  let adminSkipped = 0;
  for (const row of adminRows) {
    try {
      const hashed = await bcrypt.hash(row.password, SALT_ROUNDS);

      const key = stripGelar(row.nama).toLowerCase();
      const isAlsoWali = siswaRows.some(
        (s) => s.waliKelas && stripGelar(s.waliKelas).toLowerCase() === key,
      ) && !guruByNama.has(key);

      const override = ADMIN_LOGIN_OVERRIDES[key];
      if (!override) {
        console.error(`  ! Peringatan: admin "${row.nama}" tidak ada di ADMIN_LOGIN_OVERRIDES — fallback ke NIS "${row.nis}" sebagai loginId dan mustChangePassword: true. Tambahkan entri di ADMIN_LOGIN_OVERRIDES.`);
      }
      const loginId = override?.loginId ?? row.nis;
      const mustChangePassword = override?.mustChangePassword ?? true;

      const user = await prisma.user.create({
        data: {
          nama: row.nama,
          loginId,
          password: hashed,
          role: Role.ADMIN,
          mustChangePassword,
          isActive: true,
          ...(isAlsoWali ? { guru: { create: {} } } : {}),
        },
        include: { guru: true },
      });
      if (isAlsoWali && user.guru) {
        guruByNama.set(key, { userId: user.id, guruId: user.guru.id });
      }
      adminCount++;
      console.log(`  + Admin: ${row.nama} → login: ${loginId}${isAlsoWali ? ' (juga wali kelas)' : ''}`);
    } catch (err) {
      console.error(`  ! Skip admin ${row.nis} (${row.nama}): ${String(err)}`);
      adminSkipped++;
    }
  }

  console.log('\n── Import Kelas...');
  const kelasIdByNama = new Map<string, string>();
  const kelasNames = [...new Set(siswaRows.map((r) => r.kelas))];

  for (const nama of kelasNames) {
    const sample = siswaRows.find((r) => r.kelas === nama);
    const waliKey = sample?.waliKelas ? stripGelar(sample.waliKelas).toLowerCase() : null;
    const waliKelasGuruId = waliKey ? guruByNama.get(waliKey)?.guruId : undefined;

    const kelas = await prisma.kelas.create({
      data: { nama, waliKelasGuruId },
    });
    kelasIdByNama.set(nama, kelas.id);
    console.log(`  + Kelas: ${nama}${sample?.waliKelas ? ` (wali: ${sample.waliKelas})` : ''}`);
  }

  console.log('\n── Import Siswa...');
  let siswaCount = 0;
  let siswaSkipped = 0;
  const seenNis = new Set<string>();

  for (const row of siswaRows) {
    if (seenNis.has(row.nis)) {
      console.error(`  ! Skip duplikat NIS ${row.nis} (${row.nama})`);
      siswaSkipped++;
      continue;
    }
    seenNis.add(row.nis);

    const kelasId = kelasIdByNama.get(row.kelas);
    if (!kelasId) {
      console.error(`  ! Skip ${row.nis} (${row.nama}): kelas "${row.kelas}" tidak ditemukan`);
      siswaSkipped++;
      continue;
    }

    const hashed = await bcrypt.hash(row.nis, SALT_ROUNDS);
    try {
      await prisma.user.create({
        data: {
          nama: row.nama,
          password: hashed,
          role: Role.SISWA,
          mustChangePassword: true,
          siswa: {
            create: {
              nis: row.nis,
              nama: row.nama,
              kelasId,
              jurusan: kelasToJurusan(row.kelas),
              angkatan: kelasToAngkatan(row.kelas),
            },
          },
        },
      });
      siswaCount++;
    } catch (err) {
      console.error(`  ! Skip ${row.nis} (${row.nama}): ${String(err)}`);
      siswaSkipped++;
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log('Ringkasan import:');
  console.log(`  Kelas  : ${kelasIdByNama.size}`);
  console.log(`  Guru   : ${guruCount} berhasil, ${guruSkipped} dilewati`);
  console.log(`  Admin  : ${adminCount} berhasil, ${adminSkipped} dilewati`);
  console.log(`  Siswa  : ${siswaCount} berhasil, ${siswaSkipped} dilewati`);
  console.log('  Login siswa: NIS + password default = NIS (wajib ganti saat login pertama)');
  console.log('  Login guru/admin: kode (kolom NIS di CSV) + password sesuai kolom Password di CSV');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
