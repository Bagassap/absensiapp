import 'dotenv/config';
import ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';
import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

const SALT_ROUNDS = 10;

function mapRole(raw: string): Role {
  return raw.trim().toLowerCase().includes('admin') ? Role.ADMIN : Role.GURU;
}

function cellText(cell: ExcelJS.CellValue): string {
  if (cell == null) return '';
  if (typeof cell === 'object' && 'text' in (cell as any)) return String((cell as any).text);
  return String(cell);
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: tsx import-guru-xlsx.ts <path-to-xlsx>');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.worksheets[0];

  let created = 0;
  let skipped = 0;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const npy = cellText(row.getCell(1).value).trim();
    const nama = cellText(row.getCell(3).value).trim();
    const roleRaw = cellText(row.getCell(4).value);
    if (!npy || !nama) continue;
    const loginId = npy;
    const namaTrim = nama;
    const role = mapRole(roleRaw);

    const existing = await prisma.user.findFirst({ where: { loginId } });
    if (existing) {
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(loginId, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        nama: namaTrim,
        loginId,
        password: hashed,
        role,
        isActive: true,
        mustChangePassword: true,
        guru: { create: {} },
      },
    });
    created++;
  }

  console.log(`Import selesai. Dibuat: ${created}, dilewati (sudah ada): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
