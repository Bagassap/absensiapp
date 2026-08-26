import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// Muhammad Syukron, S.Kom & Bagas Saputra, S.Kom — role ADMIN tapi juga
// mengajar (ada di mapel.xlsx), belum punya profil Guru sama sekali.
const TARGET_USER_IDS = ['cmrrs7exo000jkrnsw5v2cd2a', 'cmrrs7ev0000gkrns1dhitl07'];

async function main() {
  for (const userId of TARGET_USER_IDS) {
    const existing = await prisma.guru.findUnique({ where: { userId } });
    if (existing) {
      console.log(`sudah ada profil Guru untuk ${userId}`);
      continue;
    }
    const g = await prisma.guru.create({ data: { userId } });
    console.log(`dibuat profil Guru ${g.id} untuk user ${userId}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
